import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiExtractedDataSchema, type AIExtractedData } from './validations';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de bulletins de paie français.
Analyse le document fourni et extrais UNIQUEMENT les informations suivantes au format JSON strict :

{
  "employeeName": "Nom complet de l'employé (ex: M. BICHE Arnaud)",
  "employeeAddress": "Adresse postale complète de l'employé",
  "employerName": "Nom de l'entreprise employeur",
  "siretNumber": "Numéro SIRET de l'employeur (14 chiffres)",
  "urssafNumber": "Numéro URSSAF / Compte employeur",
  "periodMonth": 1-12 (numéro du mois),
  "periodYear": 2024 (année en YYYY),
  "netToPay": 2345.67 (Net à payer après impôts),
  "netBeforeTax": 2500.00 (Net à payer avant impôts),
  "netTaxable": 2600.00 (Net imposable),
  "grossSalary": 3200.00 (Salaire brut),
  "taxAmount": 154.33 (Montant de l'impôt sur le revenu / retenue à la source),
  "hoursWorked": 151.67 (Heures travaillées),
  "hourlyNetTaxable": 17.15 (Salaire horaire net imposable)
}

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec du JSON valide, aucun texte explicatif
- Pas de markdown, pas de \`\`\`json
- Utilise null pour les valeurs manquantes
- Les montants doivent être des nombres décimaux, pas des strings
- Si une donnée est absente ou illisible, mets null`;

export async function analyzeDocument(fileUrl: string): Promise<AIExtractedData & { aiModel: string; inputTokens?: number; outputTokens?: number }> {
    const modelId = 'gemini-2.5-flash';

    // ... (téléchargement et config)

    // Télécharger le fichier
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Échec du téléchargement du fichier: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'application/pdf';

    try {
        const model = genAI.getGenerativeModel({
            model: modelId,
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        });

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            {
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            },
        ]);

        const text = result.response.text();

        // 4. Nettoyer et parser le JSON
        // Même avec responseMimeType, on nettoie par sécurité
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : text;

        let parsedData: unknown;
        try {
            parsedData = JSON.parse(cleanedText);
        } catch {
            console.error(`❌ Échec du parsing JSON. Texte après nettoyage:`, cleanedText);
            throw new Error('L\'IA a retourné un format JSON invalide');
        }

        // 5. Valider avec Zod
        const validated = aiExtractedDataSchema.parse(parsedData);

        return {
            ...validated,
            aiModel: modelId,
            inputTokens: result.response.usageMetadata?.promptTokenCount,
            outputTokens: result.response.usageMetadata?.candidatesTokenCount,
        };

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erreur lors de l'analyse avec ${modelId}:`, error.message);
            throw new Error(`Échec de l'analyse IA: ${error.message}`);
        }
        throw new Error('Erreur inconnue lors de l\'analyse IA');
    }
}

// Fonction utilitaire pour retry avec backoff exponentiel
export async function analyzeDocumentWithRetry(
    fileUrl: string,
    maxRetries = 3
): Promise<AIExtractedData> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await analyzeDocument(fileUrl);
        } catch (error) {
            lastError = error as Error;
            console.warn(`Tentative ${attempt}/${maxRetries} échouée:`, lastError.message);

            if (attempt < maxRetries) {
                // Backoff exponentiel: 2^attempt secondes
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    throw lastError || new Error('Échec après plusieurs tentatives');
}
