import { prisma } from '../lib/prisma';

async function main() {
    try {
        const count = await prisma.extractionLog.count();
        console.log(`✅ Table ExtractionLog existe. Nombre d'entrées: ${count}`);
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
