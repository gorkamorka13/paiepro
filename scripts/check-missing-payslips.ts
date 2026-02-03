
import { PrismaClient } from '@prisma/client';
import { list } from '@vercel/blob';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for 2024 payslips...');

  // 1. Check all 2024 payslips
  const payslips2024 = await prisma.payslip.findMany({
    where: {
      periodYear: 2024
    },
    orderBy: {
      periodMonth: 'asc'
    }
  });

  console.log(`\n📅 Found ${payslips2024.length} payslips for 2024:`);
  const countsByMonth: Record<number, number> = {};
  payslips2024.forEach(p => {
    const month = p.periodMonth || 0;
    countsByMonth[month] = (countsByMonth[month] || 0) + 1;
  });

  for (let i = 1; i <= 12; i++) {
    console.log(`   Month ${i}: ${countsByMonth[i] || 0} payslips`);
  }

  // 2. Check for payslips with missing dates
  const invalidDates = await prisma.payslip.findMany({
    where: {
      OR: [
        { periodYear: null },
        { periodMonth: null }
      ]
    }
  });

  if (invalidDates.length > 0) {
    console.log(`\n⚠️ Found ${invalidDates.length} payslips with NULL dates:`);
    invalidDates.forEach(p => console.log(`   - ID: ${p.id}, File: ${p.fileName}, Created: ${p.createdAt}`));
  } else {
    console.log('\n✅ No payslips with NULL dates found.');
  }

  // 3. Search for filenames containing oct, nov, dec
  const keywords = ['oct', 'nov', 'dec', '10_2024', '11_2024', '12_2024'];
  console.log(`\n🔎 Searching for filenames with keywords: ${keywords.join(', ')}...`);

  const possibleMissing = await prisma.payslip.findMany({
    where: {
      OR: keywords.map(k => ({
        fileName: {
          contains: k,
          mode: 'insensitive'
        }
      }))
    }
  });

  possibleMissing.forEach(p => {
    console.log(`   - File: ${p.fileName} => Detected as: ${p.periodMonth}/${p.periodYear}`);
  });

  // 4. Check for orphaned blobs (Vercel Blob)
  try {
    console.log('\n☁️ Fetching blobs from Vercel Storage...');

    // Note: This relies on BLOB_READ_WRITE_TOKEN being in .env
    const { blobs } = await list({ limit: 1000 });
    console.log(`   Found ${blobs.length} total blobs.`);

    const relevantBlobs = blobs.filter(b =>
      b.pathname.toLowerCase().includes('oct') ||
      b.pathname.toLowerCase().includes('nov') ||
      b.pathname.toLowerCase().includes('dec')
    );

    console.log(`\n� Found ${relevantBlobs.length} blobs matching Oct/Nov/Dec:`);
    relevantBlobs.forEach(b => console.log(`   - ${b.pathname} (${b.url})`));

    // Check DB presence
    const dbFiles = new Set((await prisma.payslip.findMany({ select: { fileUrl: true } })).map(p => p.fileUrl));
    const orphans = blobs.filter(b => !dbFiles.has(b.url));
    if (orphans.length > 0) {
      console.log(`\n🚨 Found ${orphans.length} ORPHANS (not in DB):`);
      orphans.forEach(b => console.log(`   - ${b.pathname}`));
    }

  } catch (err) {
    console.error('❌ Could not list blobs (check BLOB_READ_WRITE_TOKEN):', err);
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
