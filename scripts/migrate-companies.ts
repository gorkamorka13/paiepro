import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCompanies() {
    console.log('🚀 Début de la migration des entreprises...');

    try {
        // 1. Récupérer tous les bulletins qui n'ont pas encore d'entreprise liée
        const payslips = await prisma.payslip.findMany({
            where: {
                companyId: null,
                employerName: { not: null }
            }
        });

        console.log(`📊 ${payslips.length} bulletins à migrer.`);

        for (const payslip of payslips) {
            const employerName = payslip.employerName!;

            // 2. Trouver ou créer l'entreprise
            let company = await prisma.company.findUnique({
                where: { name: employerName }
            });

            if (!company) {
                console.log(`🏢 Création de l'entreprise : ${employerName}`);
                company = await prisma.company.create({
                    data: {
                        name: employerName,
                        siret: payslip.siretNumber,
                        urssaf: payslip.urssafNumber
                    }
                });
            }

            // 3. Mettre à jour le bulletin
            await prisma.payslip.update({
                where: { id: payslip.id },
                data: {
                    companyId: company.id
                }
            });
        }

        console.log('✅ Migration terminée avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateCompanies();
