import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ZodError } from 'zod';
import { aiExtractedDataSchema, type AIExtractedData } from './validations';
import { ExtractionLogger } from './extraction-logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de bulletins de paie français (modèle 2024 inclus).
Analyse le document fourni et extrais UNIQUEMENT les informations suivantes au format JSON strict :

{
  "employeeName": "NOM Prénom (ex: BICHE Arnaud - SANS Monsieur/Madame)",
  "employeeAddress": "Adresse complète",
  "employerName": "Raison sociale employeur (SANS Monsieur/Madame/M./Mme)",
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
- EMPLOYEUR/SALARIÉ : Extrait uniquement le Prénom et le NOM (ex: "Jean DUPONT").
  ATTENTION : NE PAS inclure les mentions comme "élève", "enfant", "gardé", "employeur de", "nature de".
  Si le nom contient "élève [Nom]", garde uniquement le nom de l'adulte (l'employeur).
- PÉRIODE : Identifie la période de paie dans l'en-tête (ex: "Mois de Mars 2024" ou "du 01/03 au 31/03"). IGNORE les dates de signature ou d'impression en bas de page.
- NET À PAYER : Montant final viré au salarié (souvent libellé "Net à payer", "Net payé" ou "Montant versé").
  ATTENTION : NE PAS CONFONDRE avec le "Net Social" ou "Montant Net Social" (qui est souvent inférieur et sert aux prestations sociales).
  REMARQUE : Le Net à Payer est généralement le montant le plus "bas" des nets, SAUF s'il y a des acomptes ou des saisies sur salaire.
- NET SOCIAL : Montant utilisé pour le RSA/Prime d'activité (souvent libellé "Montant net social"). NE PAS l'utiliser pour le Net à Payer.
- NET FISCAL/IMPOSABLE : Base de calcul de l'impôt (souvent libellé "Net imposable" ou "Net fiscal").
- NET AVANT IMPÔT : Le montant avant le prélèvement à la source (souvent libellé "Net à payer avant impôt sur le revenu").
- CESU : Si présent, il commence TOUJOURS par 'Z' suivi uniquement de chiffres (ex: Z1234567). IGNORE toute autre lettre après les chiffres.
- RÈGLE : Réponds UNIQUEMENT avec le JSON pur. Pas de markdown, pas de texte. Si une donnée est absente, mets null.`;

export async function analyzeDocument(
    fileUrl: string,
    fileMetadata: { fileName: string; fileSize: number; mimeType: string },
    context?: { payslipId?: string }
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
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        employeeName: { type: SchemaType.STRING },
                        employeeAddress: { type: SchemaType.STRING },
                        employerName: { type: SchemaType.STRING },
                        siretNumber: { type: SchemaType.STRING },
                        urssafNumber: { type: SchemaType.STRING },
                        periodMonth: { type: SchemaType.NUMBER },
                        periodYear: { type: SchemaType.NUMBER },
                        netToPay: { type: SchemaType.NUMBER },
                        netBeforeTax: { type: SchemaType.NUMBER },
                        netTaxable: { type: SchemaType.NUMBER },
                        grossSalary: { type: SchemaType.NUMBER },
                        taxAmount: { type: SchemaType.NUMBER },
                        hoursWorked: { type: SchemaType.NUMBER },
                        hourlyNetTaxable: { type: SchemaType.NUMBER }
                    },
                    required: [
                        'employeeName', 'employerName', 'periodMonth', 'periodYear',
                        'netToPay', 'netBeforeTax', 'netTaxable', 'grossSalary',
                        'taxAmount', 'hoursWorked'
                    ]
                }
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
                payslipId: context?.payslipId,
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
                validationErrors: (validationError as ZodError).errors,
                processingTimeMs,
                inputTokens: result.response.usageMetadata?.promptTokenCount,
                outputTokens: result.response.usageMetadata?.candidatesTokenCount,
                payslipId: context?.payslipId,
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
            payslipId: context?.payslipId,
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
                payslipId: context?.payslipId,
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
    maxRetries = 3,
    context?: { payslipId?: string }
): Promise<AIExtractedData> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await analyzeDocument(fileUrl, fileMetadata, context);
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
