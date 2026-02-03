
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lastLog = await prisma.extractionLog.findFirst({
    where: {
      extractionMethod: 'traditional',
      success: false
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastLog) {
    console.log('Aucun log trouvé.');
    return;
  }

  console.log('--- RAW RESPONSE START ---');
  console.log(lastLog.rawResponse);
  console.log('--- RAW RESPONSE END ---');
  console.log('ID:', lastLog.id);
  console.log('File:', lastLog.fileName);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
