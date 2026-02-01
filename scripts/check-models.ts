import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY non trouvée dans .env.local');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Tentative de lister les modèles (si supporté par la clé)
    try {
        console.log('🔍 Vérification des modèles disponibles...');
        // Note: listModels n'est pas toujours disponible sur les clés Free Tier
        // On va plutôt tester les modèles un par un avec un petit prompt

        const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

        for (const modelId of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                await model.generateContent('Hi');
                console.log(`✅ ${modelId} : DISPONIBLE`);
            } catch (err: any) {
                console.log(`❌ ${modelId} : ERREUR (${err.message})`);
            }
        }
    } catch (err: any) {
        console.error('❌ Erreur lors de la vérification:', err.message);
    }
}

checkModels();
