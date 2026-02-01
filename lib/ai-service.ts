import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiExtractedDataSchema, type AIExtractedData } from './validations';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de bulletins de paie français.
Analyse le document fourni et extrais UNIQUEMENT les informations suivantes au format JSON strict :

{
  "employeeName": "Nom complet de l'employé",
  "employerName": "Nom de l'entreprise employeur",
  "periodMonth": 1-12 (numéro du mois),
  "periodYear": 2024 (année en YYYY),
  "netToPay": 2345.67 (net à payer en euros),
  "grossSalary": 3200.00 (salaire brut en euros),
  "taxAmount": 450.33 (total des cotisations et impôts),
  "hoursWorked": 151.67 (heures travaillées)
}

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec du JSON valide, aucun texte explicatif
- Pas de markdown, pas de \`\`\`json
- Utilise null pour les valeurs manquantes
- Les montants doivent être des nombres décimaux, pas des strings
- Si une donnée est absente ou illisible, mets null`;

export async function analyzeDocument(fileUrl: string): Promise<AIExtractedData> {
    try {
        // 1. Télécharger le fichier
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Échec du téléchargement du fichier: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'application/pdf';

        // 2. Préparer le contenu pour Gemini
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.1, // Faible pour cohérence
                maxOutputTokens: 1024,
            },
        });

        // 3. Générer l'extraction
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
        const cleanedText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        let parsedData: unknown;
        try {
            parsedData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('JSON invalide reçu de l\'IA:', cleanedText);
            throw new Error('L\'IA a retourné un format JSON invalide');
        }

        // 5. Valider avec Zod
        const validated = aiExtractedDataSchema.parse(parsedData);

        return validated;

    } catch (error) {
        if (error instanceof Error) {
            console.error('Erreur lors de l\'analyse IA:', error.message);
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
