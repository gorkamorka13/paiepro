/* eslint-disable @typescript-eslint/no-require-imports */
const pdf = require('pdf-parse');
import { aiExtractedDataSchema, type AIExtractedData } from './validations';
import { analyzeDocument } from './ai-service';

/**
 * Tente d'extraire les données d'un bulletin de paie sans utiliser l'IA.
 * Utilise pdf-parse pour extraire le texte brut et des Regex pour trouver les valeurs.
 */
export async function extractDataTraditional(fileUrl: string): Promise<AIExtractedData | null> {
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Échec du téléchargement');

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const data = await pdf(buffer);
        const text = data.text;

        console.log('📄 Texte extrait par pdf-parse (début) :', text.substring(0, 500));

        // Patterns Regex pour les bulletins français standard
        const patterns = {
            employeeName: /([A-Z\s]+)\n/i, // Très approximatif
            employerName: /([A-Z\s0-9]+)\n/i, // Très approximatif
            netToPay: /(?:NET\s+À\s+PAYER|NET\s+A\s+PAYER|NET\s+PAYE|À\s+PAYER)\s*[:\s]*([\d\s,.]+)/i,
            netBeforeTax: /(?:NET\s+PAYER\s+AVANT\s+IMPÔT|NET\s+AVANT\s+PAS|NET\s+IMPÔTS?)\s*[:\s]*([\d\s,.]+)/i,
            netTaxable: /(?:NET\s+IMPOSABLE|CUMUL\s+IMPOSABLE|NET\s+FISC)\s*[:\s]*([\d\s,.]+)/i,
            grossSalary: /(?:SALAIRE\s+BRUT|TOTAL\s+BRUT|BRUT\s+DU\s+MOIS)\s*[:\s]*([\d\s,.]+)/i,
            taxAmount: /(?:IMPÔT\s+SUR\s+LE\s+REVENU|RETENUE\s+À\s+LA\s+SOURCE|P\.A\.S|MONTANT\s+PAS)\s*[:\s]*([\d\s,.]+)/i,
            hoursWorked: /(?:HEURES?\s+TRAVAILLÉES?|TOTAL\s+HEURES?|HEURES?\s+DU\s+MOIS|BASE\s+35H)\s*[:\s]*([\d\s,.]+)/i,
            hourlyNetTaxable: /(?:TAUX\s+HORAIRE\s+NET\s+IMP|NET\s+HORAIRE)\s*[:\s]*([\d\s,.]+)/i,
        };

        const result: Partial<AIExtractedData> = {};

        // Extraire les montants numériques
        const parseAmount = (match: string | undefined): number => {
            if (!match) return 0;
            // Nettoyer : enlever les espaces, remplacer virgule par point
            return parseFloat(match.replace(/\s/g, '').replace(',', '.'));
        };

        // Extraction par Regex
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

        // Détection de la période (MM/YYYY)
        const periodMatch = text.match(/(?:DU|PÉRIODE|MOIS)\s*[:\s]*(\d{2})\/(\d{4})/i);
        if (periodMatch) {
            result.periodMonth = parseInt(periodMatch[1]);
            result.periodYear = parseInt(periodMatch[2]);
        }

        // Si on a les champs critiques, on valide
        if (result.netToPay && result.grossSalary) {
            try {
                return aiExtractedDataSchema.parse({
                    ...result,
                    aiModel: 'Extraction Traditionnelle ⚙️',
                    inputTokens: null,
                    outputTokens: null,
                }) as AIExtractedData;
            } catch (err) {
                console.warn('⚠️ Validation Zod échouée pour extraction traditionnelle', err);
                return null;
            }
        }

        return null; // Pas assez de données fiables
    } catch (error) {
        console.error('❌ Erreur lors de l\'extraction traditionnelle :', error);
        return null;
    }
}

/**
 * Service hybride : Tente le traditionnel, sinon passe à l'IA
 */
export async function analyzeDocumentHybrid(fileUrl: string): Promise<AIExtractedData & { aiModel: string; inputTokens?: number; outputTokens?: number }> {
    console.log('⚙️ Tentative d\'extraction traditionnelle...');
    const traditionalResult = await extractDataTraditional(fileUrl);

    if (traditionalResult) {
        console.log('✅ Extraction traditionnelle réussie');
        return traditionalResult as AIExtractedData & { aiModel: string };
    }

    console.log('🤖 Échec traditionnel. Appel à l\'IA Gemini 2.5 Flash...');
    return await analyzeDocument(fileUrl);
}
