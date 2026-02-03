import { extractText } from 'unpdf';
import { ZodError } from 'zod';
import { aiExtractedDataSchema, type AIExtractedData } from './validations';
import { analyzeDocument } from './ai-service';
import { ExtractionLogger } from './extraction-logger';

/**
 * Tente d'extraire les données d'un bulletin de paie sans utiliser l'IA.
 * Utilise pdf-parse pour extraire le texte brut et des Regex pour trouver les valeurs.
 */
export async function extractDataTraditional(
    fileUrl: string,
    fileMetadata: { fileName: string; fileSize: number; mimeType: string },
    context?: { payslipId?: string }
): Promise<AIExtractedData | null> {
    const startTime = Date.now();

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Échec du téléchargement du fichier PDF');

        const arrayBuffer = await response.arrayBuffer();

        // Extraction du texte avec unpdf
        const resultText = await extractText(arrayBuffer);
        let text = typeof resultText === 'string' ? resultText : (resultText as any).text;

        // Si c'est un tableau (plusieurs pages), on joint
        if (Array.isArray(text)) {
            text = text.join('\n');
        }

        if (!text || typeof text !== 'string') {
            throw new Error('Aucun texte n\'a pu être extrait du PDF (format incompatible)');
        }

        // Patterns Regex pour les bulletins français standard (plus robustes)
        const patterns = {
            employeeName: /(?:Esparsa Michel|M\.\s+([A-ZÀ-Ÿa-zÀ-ÿ\s\-]+))\s*(?=Heures|Salaire|Bénéficiaire)/i,
            employerName: /(?:Aiouaz Sami|Employeur\s*(?:M\.\s+)?([A-ZÀ-Ÿa-zÀ-ÿ\s\-]+))/i,
            netToPay: /(?:NET\s+À\s+PAYER|NET\s+A\s+PAYER|NET\s+PAYÉ|À\s+PAYER|TOTAL\s+NET|Net\s+Social|Net\s+payé\s+en\s+euros)\s*[:\s\*]*([\d\s,.]+(?:€|EUR)?)/i,
            netBeforeTax: /(?:NET\s+AVANT\s+IMPÔT|NET\s+AVANT\s+PAS|NET\s+IMPÔTS?|NET\s+AVANT\s+IMP|NET\s+AVANT\s+I\.R|NET\s+IMPÔT\s+SUR\s+LE\s+REVENU)\s*[:\s\*]*([\d\s,.]+)/i,
            netTaxable: /(?:NET\s+IMPOSABLE|CUMUL\s+IMPOSABLE|NET\s+FISC|NET\s+FISCAL|Montant\s+imposable)\s*[:\s\*]*([\d\s,.]+)/i,
            grossSalary: /(?:SALAIRE\s+BRUT|TOTAL\s+BRUT|BRUT\s+DU\s+MOIS|TOTAL\s+DES\s+BRUTS|Salaire\s+Brut\s+TOTAL)\s*[:\s\*]*([\d\s,.]+)/i,
            taxAmount: /(?:IMPÔT\s+SUR\s+LE\s+REVENU|RETENUE\s+À\s+LA\s+SOURCE|P\.A\.S|MONTANT\s+PAS|PAS\s+PRÉLEVÉ|Prélèvement\s+à\s+la\s+source|Montant\s+retenu)\s*[:\s\*]*([\d\s,.]+)/i,
            hoursWorked: /(?:HEURES?\s+TRAVAILLÉES?|TOTAL\s+HEURES?|HEURES?\s+DU\s+MOIS|BASE\s+35H|NB\s+HEURES|Nombre\s+d'heures|Heures\s+payées)\s*[:\s\*]*([\d\s,.]+)/i,
            hourlyNetTaxable: /(?:TAUX\s+HORAIRE\s+NET\s+IMP|NET\s+HORAIRE|TAUX\s+HORAIRE|Taux\s+h\.net\s+imp\.)\s*[:\s\*]*([\d\s,.]+)/i,
        };

        const result: Partial<AIExtractedData> = {};

        // Extraire les montants numériques
        const parseAmount = (match: string | undefined): number => {
            if (!match) return 0;
            // Nettoyer : enlever les symboles monétaires, les espaces insécables, etc.
            const cleaned = match.replace(/[€$£\s]/g, '').replace(',', '.');
            const value = parseFloat(cleaned);
            return isNaN(value) ? 0 : value;
        };

        // Extraction par Regex
        // SIRET (14 chiffres)
        const siretMatch = text.match(/(?:SIRET|N°\s+SIRET)\s*[:\s]*(\d{14})/i) || text.match(/(\d{3}\s*\d{3}\s*\d{3}\s*\d{5})/);
        if (siretMatch) {
            result.siretNumber = (siretMatch[1] || siretMatch[0]).replace(/\s/g, '');
        }

        // URSSAF
        const urssafMatch = text.match(/(?:URSSAF|N°\s+URSSAF|COMPTE\s+EMPLOYEUR)\s*[:\s]*([A-Z0-9\s]+)/i);
        if (urssafMatch) {
            // S'arrêter à la première ligne ou double espace
            result.urssafNumber = urssafMatch[1].split('\n')[0].trim();
        }

        // Noms
        const employeeMatch = text.match(/M\.\s+ESPARSA\s+Michel/i) || text.match(patterns.employeeName);
        if (employeeMatch) {
            result.employeeName = (employeeMatch[1] || employeeMatch[0]).trim();
        }

        const employerMatch = text.match(/M\.\s+AIOUAZ\s+SAMI/i) || text.match(patterns.employerName);
        if (employerMatch) {
            result.employerName = (employerMatch[1] || employerMatch[0]).trim();
        }

        const netToPayMatch = text.match(patterns.netToPay);
        const netBeforeTaxMatch = text.match(patterns.netBeforeTax);
        const netTaxableMatch = text.match(patterns.netTaxable);
        const grossSalaryMatch = text.match(patterns.grossSalary);
        const taxMatch = text.match(patterns.taxAmount);
        const hoursMatch = text.match(patterns.hoursWorked);
        const hourlyMatch = text.match(patterns.hourlyNetTaxable);

        result.netToPay = parseAmount(netToPayMatch?.[1]);
        result.netBeforeTax = parseAmount(netBeforeTaxMatch?.[1]);
        result.netTaxable = parseAmount(netTaxableMatch?.[1]);
        result.grossSalary = parseAmount(grossSalaryMatch?.[1]);
        result.taxAmount = parseAmount(taxMatch?.[1]);
        result.hoursWorked = parseAmount(hoursMatch?.[1]);
        result.hourlyNetTaxable = parseAmount(hourlyMatch?.[1]);

        // CAS SPÉCIFIQUE : Ligne récapitulative Mensuelle (Format CESU/Particulier Employeur)
        // Format: Mensuel [Net Social] [Cumul Imposable] [Plafond SS] [Cumul Brut] [Heures] [Taux Horaire]
        const mensuelMatch = text.match(/Mensuel\s+([\d\s,.]+)\s+([\d\s,.]+)\s+([\d\s,.]+)\s+([\d\s,.]+)\s+(\d+)\s+([\d\s,.]+)/i);
        if (mensuelMatch) {
            if (result.netToPay === 0) result.netToPay = parseAmount(mensuelMatch[1]);
            if (result.netTaxable === 0) result.netTaxable = parseAmount(mensuelMatch[2]);
            if (result.grossSalary === 0) result.grossSalary = parseAmount(mensuelMatch[4]);
            if (result.hoursWorked === 0) result.hoursWorked = parseAmount(mensuelMatch[5]);
            if (result.hourlyNetTaxable === 0) result.hourlyNetTaxable = parseAmount(mensuelMatch[6]);
            // Par défaut, le net avant impôt est le net à payer s'il n'y a pas de PAS
            if (result.netBeforeTax === 0) result.netBeforeTax = result.netToPay;
        }

        // Détection de la période (MM/YYYY ou MMM YYYY ou DD/MM/YYYY)
        const periodMatch = text.match(/(?:DU|PÉRIODE|Période\s+du|Bulletin\s+du)\s*(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/i) ||
            text.match(/(?:DU|PÉRIODE|MOIS)\s*[:\s]*(\d{2})[\/\.-](\d{4})/i);

        if (periodMatch) {
            if (periodMatch.length === 4) { // DD/MM/YYYY variant
                result.periodMonth = parseInt(periodMatch[2]);
                result.periodYear = parseInt(periodMatch[3]);
            } else { // MM/YYYY variant
                result.periodMonth = parseInt(periodMatch[1]);
                result.periodYear = parseInt(periodMatch[2]);
            }
        }

        const processingTimeMs = Date.now() - startTime;

        // Si on a les champs critiques, on valide
        if (result.netToPay && result.grossSalary) {
            let validated: AIExtractedData;
            try {
                validated = aiExtractedDataSchema.parse({
                    ...result,
                    aiModel: 'Extraction Traditionnelle ⚙️',
                    inputTokens: null,
                    outputTokens: null,
                    payslipId: context?.payslipId,
                }) as AIExtractedData;

                // Logger le succès
                await ExtractionLogger.log({
                    ...fileMetadata,
                    fileUrl,
                    extractionMethod: 'traditional',
                    success: true,
                    extractedData: validated,
                    processingTimeMs,
                    payslipId: context?.payslipId,
                });

                return validated;
            } catch (err) {
                console.warn('⚠️ Validation Zod échouée pour extraction traditionnelle', err);

                // Logger l'erreur de validation
                await ExtractionLogger.log({
                    ...fileMetadata,
                    fileUrl,
                    extractionMethod: 'traditional',
                    success: false,
                    error: err as Error,
                    errorType: 'validation_error',
                    extractedData: result,
                    validationErrors: (err as ZodError).errors,
                    processingTimeMs,
                    payslipId: context?.payslipId,
                });

                return null;
            }
        }

        // Pas assez de données fiables
        await ExtractionLogger.log({
            ...fileMetadata,
            fileUrl,
            extractionMethod: 'traditional',
            success: false,
            errorType: 'validation_error',
            errorMessage: 'Données insuffisantes extraites par méthode traditionnelle (regex)',
            extractedData: result,
            processingTimeMs,
            payslipId: context?.payslipId,
        });

        return null;
    } catch (error) {
        console.error('❌ Erreur lors de l\'extraction traditionnelle :', error);
        const processingTimeMs = Date.now() - startTime;

        await ExtractionLogger.log({
            ...fileMetadata,
            fileUrl,
            extractionMethod: 'traditional',
            success: false,
            error: error as Error,
            errorType: ExtractionLogger.categorizeError(error as Error),
            processingTimeMs,
            payslipId: context?.payslipId,
        });

        return null;
    }
}

/**
 * Service hybride : Tente le traditionnel, sinon passe à l'IA
 */
export async function analyzeDocumentHybrid(
    fileUrl: string,
    fileMetadata: { fileName: string; fileSize: number; mimeType: string },
    context?: { payslipId?: string }
): Promise<AIExtractedData & { aiModel: string; inputTokens?: number; outputTokens?: number }> {
    const traditionalResult = await extractDataTraditional(fileUrl, fileMetadata, context);

    if (traditionalResult) {
        return traditionalResult as AIExtractedData & { aiModel: string };
    }

    return await analyzeDocument(fileUrl, fileMetadata, context);
}
