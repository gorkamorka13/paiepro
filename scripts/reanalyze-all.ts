import { PrismaClient } from '@prisma/client';
import { extractDataTraditional } from '../lib/extraction-service';
import { formatName, cleanCesuNumber } from '../lib/format-utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Démarrage de la ré-analyse de tous les bulletins...');

  const payslips = await prisma.payslip.findMany({
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📄 ${payslips.length} bulletins trouvés.`);

  let successCount = 0;
  let errorCount = 0;

  for (const payslip of payslips) {
    process.stdout.write(`Analyzing ${payslip.fileName}... `);

    try {
      const fileMetadata = {
        fileName: payslip.fileName,
        fileSize: payslip.fileSize,
        mimeType: payslip.mimeType,
      };

      const result = await extractDataTraditional(payslip.fileUrl, fileMetadata, { payslipId: payslip.id });

      if (!result) {
        console.log('❌ Échec extraction');
        errorCount++;
        continue;
      }

      // Nettoyage des données
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isCesu, ...dataWithoutIsCesu } = result;

      const cleanedData = {
        ...dataWithoutIsCesu,
        employerName: formatName(result.employerName),
        employeeName: formatName(result.employeeName),
        cesuNumber: cleanCesuNumber(result.cesuNumber),
      };

      await prisma.payslip.update({
        where: { id: payslip.id },
        data: {
          ...cleanedData,
          processingStatus: 'completed',
          errorMessage: null,
        }
      });

      console.log(`✅ OK (NetImposable: ${cleanedData.netTaxable}, AvantImpôt: ${cleanedData.netBeforeTax})`);
      successCount++;

    } catch (error) {
      console.log(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }
  }

  console.log('\n-----------------------------------');
  console.log(`🏁 Terminé. Succès: ${successCount}, Erreurs: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
