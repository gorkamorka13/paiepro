import { extractText } from 'unpdf';
import { ZodError } from 'zod';
import { aiExtractedDataSchema, type AIExtractedData } from './validations';
import { analyzeDocument } from './ai-service';
import { ExtractionLogger } from './extraction-logger';
import { cleanCesuNumber } from './format-utils';

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
        let text = typeof resultText === 'string' ? resultText : (resultText as { text: string | string[] }).text;

        // Si c'est un tableau (plusieurs pages), on joint
        if (Array.isArray(text)) {
            text = text.join('\n');
        }

        if (!text || typeof text !== 'string') {
            throw new Error('Aucun texte n\'a pu être extrait du PDF (format incompatible)');
        }

        // Patterns Regex pour les bulletins français standard (plus robustes)
        const patterns = {
            // Salarié : On cherche spécifiquement Michel Esparsa ou un bloc M./MME/MONSIEUR après l'employeur
            employeeName: /(?:Esparsa Michel|MONSIEUR\s+MICHEL\s+ESPARSA|MADAME\s+([A-ZÀ-Ÿ\s\-]{3,})|MONSIEUR\s+([A-ZÀ-Ÿ\s\-]{3,})|M\.\s+([A-ZÀ-Ÿa-zÀ-ÿ\s\-]{3,}))\s*(?=[\d\s]+[A-Z]|Heures|Salaire|Document|Nº Cesu)/i,
            // Employeur : Stéphanie Villemagne ou bloc après Nº Cesu employeur ou bloc après "Employeur"
            employerName: /(?:Aiouaz Sami|STEPHANIE\s+VILLEMAGNE|MADAME\s+STEPHANIE\s+VILLEMAGNE|^Employeur\s*[:\s]*(?:\r?\n)?\s*(?:M\.|MME|MADAME|MONSIEUR)?\s*([A-ZÀ-Ÿa-zÀ-ÿ\s\-]{3,})|Nº Cesu employeur\s*:\s*[A-Z0-9]+\s+([A-ZÀ-Ÿ\s\-]{3,}))/im,
            siretNumber: /(?:SIRET|Nº Cesu salarié)[\s\w]*\s*(\d{14})/i,
            urssafNumber: /(?:URSSAF|Nº Cesu employeur)\s*:?\s*([A-Z0-9\s]{5,20})(?=\s|$)/i,
            netToPay: /(?:^|\s)(?:NET A PAYER|Net à payer(?: directement| par l'employeur)?|Net payé en euros|Net à verser|Montant (?:du )?virement|Total (?:net )?payé|Net à percevoir)(?!\s+avant impôt| de l'impôt)\s*[:\s\*]*([\d\s,.]+)/i,
            netBeforeTax: /(?:NET AVANT IMPÔT|Net à payer avant impôt)\s*[:\s\*]*([\d\s,.]+)/i,
            netTaxable: /(?:NET IMPOSABLE|Net fiscal|Salaire net imposable)\s*[:\s\*]*([\d\s,.]+)/i,
            grossSalary: /(?:SALAIRE BRUT TOTAL|Salaire Brut|Total Brut|Salaire Brut Total|MALADIE|VIEILLESSE)\s*[:\s\*]*([\d\s,.]+)(?:\s*x|\s|$)/i,
            taxAmount: /(?:MONTANT DE L'IMPÔT|Total retenues|CSG[\s\w]*=\s*|Retenu à la source|Impôt sur le revenu prélevé à la source)\s*[:\s\*]*([\d\s,.]+)/i,
            hoursWorked: /(?:Nombre d'heures(?: travaillées)?|Nb heures|Total heures|Heures)\s*[:\s\*]*([\d\s,.]+)/i,
            hourlyNetTaxable: /(?:TAUX\s+HORAIRE\s+NET\s+IMP|NET\s+HORAIRE|TAUX\s+HORAIRE|Taux\s+h\.net\s+imp\.|Salaire horaire net)\s*[:\s\*]*([\d\s,.]+)/i,
            cesuNumber: /(?:Nº Cesu (?:salarié|employeur)|Nº Cesu)\s*:?\s*(Z[\d\s]+)(?=\s|$)/i,
            // Période : ultra-flexible pour supporter les sauts de lignes entre le titre et la date
            period: /(?:Paie du|Période du|BULLETIN DE SALAIRE)[\s\:\*\r\n]*(\d{2})[/-](\d{2})[/-](\d{4})/i
        };

        const result: Partial<AIExtractedData> = {};

        // Extraire les montants numériques
        const parseAmount = (match: string | undefined): number => {
            if (!match) return 0;
            // Supprimer les symboles monétaires et espaces, mais garder chiffres, virgules et points
            let cleaned = match.replace(/[€$£\s]/g, '').trim();

            // Si on a à la fois , et . (ex: 1.234,56), on vire le séparateur de milliers (.)
            if (cleaned.includes(',') && cleaned.includes('.')) {
                // Heuristique : le dernier est le séparateur décimal
                const lastComma = cleaned.lastIndexOf(',');
                const lastDot = cleaned.lastIndexOf('.');
                if (lastDot < lastComma) {
                    cleaned = cleaned.replace(/\./g, '');
                } else {
                    cleaned = cleaned.replace(/,/g, '');
                }
            }

            // On remplace la virgule par un point
            cleaned = cleaned.replace(',', '.');

            // Si on a plusieurs points (ex: 1 234.56 extrait comme 1.234.56), on ne garde que le dernier
            const parts = cleaned.split('.');
            if (parts.length > 2) {
                cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
            }

            const value = parseFloat(cleaned);
            return isNaN(value) ? 0 : value;
        };

        // Extraction par Regex
        // SIRET (14 chiffres)
        const siretMatch = text.match(patterns.siretNumber);
        if (siretMatch) {
            result.siretNumber = (siretMatch[1] || siretMatch[0]).replace(/\s/g, '');
        }

        // URSSAF
        const urssafMatch = text.match(patterns.urssafNumber);
        if (urssafMatch) {
            result.urssafNumber = (urssafMatch[1] || urssafMatch[0]).trim().split('\n')[0];
        }

        // Noms
        const employeeMatch = text.match(patterns.employeeName);
        if (employeeMatch) {
            result.employeeName = (employeeMatch[1] || employeeMatch[0]).trim();
        }

        const employerMatch = text.match(patterns.employerName);
        if (employerMatch) {
            result.employerName = (employerMatch[1] || employerMatch[2] || employerMatch[0]).trim();
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

        // Fallback pour Net à Payer : Chercher le dernier montant significatif si non trouvé
        if (!result.netToPay || result.netToPay === 0) {
            // Chercher les lignes contenant des montants à la fin du document
            const lines = text.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                if (/NET|PAYER|VERSE|VIREMENT|TOTAL/i.test(line)) {
                    const amountMatch = line.match(/([\d\s]+[,.][\d]{2})/);
                    if (amountMatch) {
                        result.netToPay = parseAmount(amountMatch[0]);
                        break;
                    }
                }
            }
        }

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

        result.cesuNumber = cleanCesuNumber(text.match(patterns.cesuNumber)?.[1]);

        // Logique d'override CESU : Si on a un numéro CESU commençant par Z
        // et que SIRET est absent ou URSSAF est absent/très court, on priorise le CESU.
        if (result.cesuNumber?.startsWith('Z')) {
            const hasNoSiret = !result.siretNumber;
            const hasMinimalUrssaf = !result.urssafNumber || result.urssafNumber.length <= 2;

            if (hasNoSiret || hasMinimalUrssaf) {
                result.siretNumber = null;
                result.urssafNumber = null;
                result.isCesu = true;
            }
        }

        // Détection de la période (MM/YYYY ou MMM YYYY ou DD/MM/YYYY)
        const periodMatch = text.match(patterns.period) ||
            text.match(/(?:DU|PÉRIODE|MOIS)\s*[:\s]*(\d{2})[\/\.-](\d{4})/i);

        if (periodMatch) {
            if (periodMatch[2] && periodMatch[3]) { // DD/MM/YYYY variant (groups 1=DD, 2=MM, 3=YYYY)
                result.periodMonth = parseInt(periodMatch[2]);
                result.periodYear = parseInt(periodMatch[3]);
            } else if (periodMatch[1] && periodMatch[2]) { // MM/YYYY variant
                result.periodMonth = parseInt(periodMatch[1]);
                result.periodYear = parseInt(periodMatch[2]);
            }
        }

        // Détecter si c'est un document CESU
        const isCesu = text.includes('Nº Cesu') || text.includes('CESU');
        result.isCesu = isCesu;

        const processingTimeMs = Date.now() - startTime;

        // Définir les champs obligatoires pour considérer l'extraction comme "réussie"
        const requiredFields: (keyof AIExtractedData)[] = [
            'employeeName',
            'employerName',
            'periodMonth',
            'periodYear',
            'netToPay',
            'grossSalary'
        ];

        const missingFields = requiredFields.filter(field => !result[field]);

        // Si on a tous les champs critiques, on tente la validation Zod
        if (missingFields.length === 0) {
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
                    rawResponse: text, // Ajouter le texte brut pour le debug
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

        // Sinon, c'est un échec pour données incomplètes
        const errorMessage = `Données incomplètes extraites par méthode traditionnelle. Champs manquants : ${missingFields.join(', ')}`;
        console.warn(`❌ ${errorMessage}`);

        await ExtractionLogger.log({
            ...fileMetadata,
            fileUrl,
            extractionMethod: 'traditional',
            success: false,
            errorType: 'validation_error',
            errorMessage,
            extractedData: result,
            rawResponse: text, // Ajouter le texte brut pour le debug
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
