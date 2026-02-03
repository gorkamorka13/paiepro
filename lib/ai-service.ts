import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiExtractedDataSchema, type AIExtractedData } from './validations';
import { ExtractionLogger } from './extraction-logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de bulletins de paie français (modèle 2024 inclus).
Analyse le document fourni et extrais UNIQUEMENT les informations suivantes au format JSON strict :

{
  "employeeName": "NOM Prénom (ex: M. BICHE Arnaud)",
  "employeeAddress": "Adresse complète",
  "employerName": "Raison sociale employeur",
  "siretNumber": "SIRET (14 chiffres)",
  "urssafNumber": "N° URSSAF ou Compte Employeur",
  "periodMonth": 1-12,
  "periodYear": YYYY,
  "netToPay": 1234.56,
  "netBeforeTax": 1300.00,
  "netTaxable": 1350.00,
  "grossSalary": 1800.00,
  "taxAmount": 50.00,
  "hoursWorked": 151.67,
  "hourlyNetTaxable": 15.00
}

CONSIGNES CRITIQUES :
- PÉRIODE : Identifie la période de paie dans l'en-tête (ex: "Mois de Mars 2024" ou "du 01/03 au 31/03"). IGNORE les dates de signature ou d'impression en bas de page.
- NET À PAYER : C'est le montant final viré sur le compte.
- NET FISCAL : Cherche "Net Social Fiscal" ou "Net Imposable".
- SIRET : Cherche un numéro de 14 chiffres, souvent près de l'adresse de l'employeur.
- RÈGLE : Réponds UNIQUEMENT avec le JSON pur. Pas de markdown, pas de texte. Si une donnée est absente, mets null.`;

export async function analyzeDocument(
    fileUrl: string,
    fileMetadata: { fileName: string; fileSize: number; mimeType: string }
): Promise<AIExtractedData & { aiModel: string; inputTokens?: number; outputTokens?: number }> {
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

    const startTime = Date.now();
    let rawResponse: string | undefined;
    let extractedData: unknown;

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
        rawResponse = text; // Capturer la réponse brute

        // 4. Nettoyer et parser le JSON
        // Même avec responseMimeType, on nettoie par sécurité
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : text;

        let parsedData: unknown;
        try {
            parsedData = JSON.parse(cleanedText);
            extractedData = parsedData;
        } catch (parseError) {
            const processingTimeMs = Date.now() - startTime;

            // Logger l'erreur de parsing
            await ExtractionLogger.log({
                ...fileMetadata,
                fileUrl,
                extractionMethod: 'ai',
                aiModel: modelId,
                success: false,
                error: parseError as Error,
                errorType: 'parsing_error',
                rawResponse,
                processingTimeMs,
                inputTokens: result.response.usageMetadata?.promptTokenCount,
                outputTokens: result.response.usageMetadata?.candidatesTokenCount,
            });

            console.error(`❌ Échec du parsing JSON. Texte après nettoyage:`, cleanedText);
            throw new Error('L\'IA a retourné un format JSON invalide');
        }

        // 5. Valider avec Zod
        let validated: AIExtractedData;
        try {
            validated = aiExtractedDataSchema.parse(parsedData);
        } catch (validationError) {
            const processingTimeMs = Date.now() - startTime;

            // Logger l'erreur de validation
            await ExtractionLogger.log({
                ...fileMetadata,
                fileUrl,
                extractionMethod: 'ai',
                aiModel: modelId,
                success: false,
                error: validationError as Error,
                errorType: 'validation_error',
                rawResponse,
                extractedData,
                validationErrors: (validationError as any).errors,
                processingTimeMs,
                inputTokens: result.response.usageMetadata?.promptTokenCount,
                outputTokens: result.response.usageMetadata?.candidatesTokenCount,
            });

            throw validationError;
        }

        const processingTimeMs = Date.now() - startTime;

        // Logger le succès
        await ExtractionLogger.log({
            ...fileMetadata,
            fileUrl,
            extractionMethod: 'ai',
            aiModel: modelId,
            success: true,
            rawResponse,
            extractedData: validated,
            processingTimeMs,
            inputTokens: result.response.usageMetadata?.promptTokenCount,
            outputTokens: result.response.usageMetadata?.candidatesTokenCount,
        });

        return {
            ...validated,
            aiModel: modelId,
            inputTokens: result.response.usageMetadata?.promptTokenCount,
            outputTokens: result.response.usageMetadata?.candidatesTokenCount,
        };

    } catch (error) {
        const processingTimeMs = Date.now() - startTime;
        const err = error as Error;

        // Logger l'erreur si pas déjà loggée (éviter les doublons)
        if (!err.message.includes('validation') && !err.message.includes('JSON invalide')) {
            await ExtractionLogger.log({
                ...fileMetadata,
                fileUrl,
                extractionMethod: 'ai',
                aiModel: modelId,
                success: false,
                error: err,
                errorType: ExtractionLogger.categorizeError(err),
                rawResponse,
                extractedData,
                processingTimeMs,
            });
        }

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
    fileMetadata: { fileName: string; fileSize: number; mimeType: string },
    maxRetries = 3
): Promise<AIExtractedData> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await analyzeDocument(fileUrl, fileMetadata);
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
