
import { list, del } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function cleanupOrphanedBlobs() {
  console.log('🧹 Starting cleanup of orphaned blobs...');

  try {
    // 1. Fetch all blobs from Vercel
    console.log('Fetching blob list from Vercel...');
    let hasMore = true;
    let cursor: string | undefined;
    const allBlobs: any[] = [];

    while (hasMore) {
      const response = await list({ cursor, limit: 1000 });
      allBlobs.push(...response.blobs);
      hasMore = response.hasMore;
      cursor = response.cursor;
    }
    console.log(`✅ Found ${allBlobs.length} blobs in Vercel Storage.`);

    // 2. Fetch all file URLs from the Database
    console.log('Fetching valid file URLs from Database...');
    const payslips = await prisma.payslip.findMany({
      select: { fileUrl: true }
    });
    const validUrls = new Set(payslips.map(p => p.fileUrl).filter(Boolean));
    console.log(`✅ Found ${validUrls.size} valid file records in Database.`);

    // 3. Identify Orphans
    const orphans = allBlobs.filter(blob => !validUrls.has(blob.url));
    console.log(`⚠️ Found ${orphans.length} orphaned blobs (not in DB).`);

    if (orphans.length === 0) {
      console.log('🎉 No orphans found. Storage is clean!');
      return;
    }

    // 4. Delete Orphans
    console.log(`🔥 Deleting ${orphans.length} orphaned blobs...`);
    const urlsToDelete = orphans.map(b => b.url);

    // Delete in batches of 100 to avoid limits if any
    const BATCH_SIZE = 100;
    for (let i = 0; i < urlsToDelete.length; i += BATCH_SIZE) {
      const batch = urlsToDelete.slice(i, i + BATCH_SIZE);
      await del(batch);
      console.log(`   Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(urlsToDelete.length / BATCH_SIZE)}`);
    }

    console.log('✅ Cleanup complete! All orphaned blobs have been deleted.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanedBlobs();
