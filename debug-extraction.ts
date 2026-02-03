
import { prisma } from './lib/prisma';

async function main() {
  console.log('Fetching recent extraction logs...');
  const logs = await prisma.extractionLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      fileName: true,
      rawResponse: true,
      createdAt: true,
      extractedData: true
    }
  });

  console.log(`Found ${logs.length} logs.`);

  for (const log of logs) {
    console.log('---------------------------------------------------');
    console.log(`File: ${log.fileName} (Created: ${log.createdAt})`);
    console.log('Extracted Data:', JSON.stringify(log.extractedData, null, 2));
    console.log('Raw Text Preview (first 500 chars):');
    console.log(log.rawResponse?.substring(0, 500));
    console.log('\n--- RAW TEXT SEARCH FOR NET IMPOSABLE ---');
    if (log.rawResponse) {
      const lines = log.rawResponse.split('\n');
      // Print lines that might contain "Net" or "Imposable"
      lines.forEach((line, index) => {
        if (/net|imposable|social|payer|avant impôt/i.test(line)) {
          console.log(`Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
    console.log('---------------------------------------------------');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
