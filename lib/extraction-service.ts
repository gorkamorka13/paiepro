/* eslint-disable @typescript-eslint/no-require-imports */
// const pdf = require('pdf-parse'); // Moved inside function
import { aiExtractedDataSchema, type AIExtractedData } from './validations';
import { analyzeDocument } from './ai-service';
import { ExtractionLogger } from './extraction-logger';

/**
 * Tente d'extraire les données d'un bulletin de paie sans utiliser l'IA.
 * Utilise pdf-parse pour extraire le texte brut et des Regex pour trouver les valeurs.
 */
export async function extractDataTraditional(
    fileUrl: string,
    fileMetadata: { fileName: string; fileSize: number; mimeType: string }
): Promise<AIExtractedData | null> {
    const startTime = Date.now();

    try {
        let pdf = require('pdf-parse');
        // Handle potential ESM default export
        if (pdf.default) pdf = pdf.default;

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Échec du téléchargement');

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const data = await pdf(buffer);
        const text = data.text;

        // Patterns Regex pour les bulletins français standard (plus robustes)
        const patterns = {
            employeeName: /(?:NOM|SALARIÉ|DESTINATAIRE)\s*[:\s]*([A-ZÀ-Ÿ\s]+)/i,
            employerName: /(?:EMPLOYEUR|RAISON\s+SOCIALE)\s*[:\s]*([A-ZÀ-Ÿ0-9\s.-]+)/i,
            netToPay: /(?:NET\s+À\s+PAYER|NET\s+A\s+PAYER|NET\s+PAYÉ|À\s+PAYER|NET\s+À\s+VERSER|NET\s+A\s+VERSER)\s*[:\s]*([\d\s,.]+(?:€|EUR)?)/i,
            netBeforeTax: /(?:NET\s+PAYER\s+AVANT\s+IMPÔT|NET\s+AVANT\s+PAS|NET\s+IMPÔTS?|NET\s+AVANT\s+IMP|NET\s+IMPÔT\s+SUR\s+LE\s+REVENU)\s*[:\s]*([\d\s,.]+)/i,
            netTaxable: /(?:NET\s+IMPOSABLE|CUMUL\s+IMPOSABLE|NET\s+FISC|NET\s+FISCAL)\s*[:\s]*([\d\s,.]+)/i,
            grossSalary: /(?:SALAIRE\s+BRUT|TOTAL\s+BRUT|BRUT\s+DU\s+MOIS|TOTAL\s+DES\s+BRUTS)\s*[:\s]*([\d\s,.]+)/i,
            taxAmount: /(?:IMPÔT\s+SUR\s+LE\s+REVENU|RETENUE\s+À\s+LA\s+SOURCE|P\.A\.S|MONTANT\s+PAS|PAS\s+PRÉLEVÉ)\s*[:\s]*([\d\s,.]+)/i,
            hoursWorked: /(?:HEURES?\s+TRAVAILLÉES?|TOTAL\s+HEURES?|HEURES?\s+DU\s+MOIS|BASE\s+35H|NB\s+HEURES)\s*[:\s]*([\d\s,.]+)/i,
            hourlyNetTaxable: /(?:TAUX\s+HORAIRE\s+NET\s+IMP|NET\s+HORAIRE|TAUX\s+HORAIRE)\s*[:\s]*([\d\s,.]+)/i,
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
            result.urssafNumber = urssafMatch[1].trim();
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
                }) as AIExtractedData;

                // Logger le succès
                await ExtractionLogger.log({
                    ...fileMetadata,
                    fileUrl,
                    extractionMethod: 'traditional',
                    success: true,
                    extractedData: validated,
                    processingTimeMs,
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
                    validationErrors: (err as any).errors,
                    processingTimeMs,
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
            errorMessage: 'Données insuffisantes extraites par méthode traditionnelle',
            extractedData: result,
            processingTimeMs,
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
        });

        return null;
    }
}

/**
 * Service hybride : Tente le traditionnel, sinon passe à l'IA
 */
export async function analyzeDocumentHybrid(
    fileUrl: string,
    fileMetadata: { fileName: string; fileSize: number; mimeType: string }
): Promise<AIExtractedData & { aiModel: string; inputTokens?: number; outputTokens?: number }> {
    const traditionalResult = await extractDataTraditional(fileUrl, fileMetadata);

    if (traditionalResult) {
        return traditionalResult as AIExtractedData & { aiModel: string };
    }

    return await analyzeDocument(fileUrl, fileMetadata);
}
