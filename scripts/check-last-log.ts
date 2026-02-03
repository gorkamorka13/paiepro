
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const log = await prisma.extractionLog.findFirst({
    where: { fileName: { contains: 'NAVARRO', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' }
  });

  if (log && log.rawResponse) {
    fs.writeFileSync('navarro_raw.txt', log.rawResponse.substring(0, 3000));
    console.log('DONE: navarro_raw.txt created');
  } else {
    console.log('No log found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
