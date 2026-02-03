require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { list, del } = require('@vercel/blob');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupOrphanedBlobs() {
    const reportPath = path.join(__dirname, '../cleanup_report.txt');
    let report = '🧹 Starting cleanup of orphaned blobs...\n';

    try {
        // 1. Fetch all blobs from Vercel
        report += 'Fetching blob list from Vercel...\n';
        let hasMore = true;
        let cursor = undefined;
        const allBlobs = [];

        while (hasMore) {
            const response = await list({ cursor, limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN });
            allBlobs.push(...response.blobs);
            hasMore = response.hasMore;
            cursor = response.cursor;
        }
        report += `✅ Found ${allBlobs.length} blobs in Vercel Storage.\n`;

        // 2. Fetch all file URLs from the Database
        report += 'Fetching valid file URLs from Database...\n';
        const payslips = await prisma.payslip.findMany({ select: { fileUrl: true } });
        const validUrls = new Set(payslips.map(p => p.fileUrl).filter(Boolean));
        report += `✅ Found ${validUrls.size} valid file records in Database.\n`;

        // 3. Identify Orphans
        const orphans = allBlobs.filter(blob => !validUrls.has(blob.url));
        report += `⚠️ Found ${orphans.length} orphaned blobs (not in DB).\n`;

        if (orphans.length === 0) {
            report += '🎉 No orphans found. Storage is clean!\n';
        } else {
            report += `🔥 Deleting ${orphans.length} orphaned blobs...\n`;
            const urlsToDelete = orphans.map(b => b.url);

            // Delete in batches
            const BATCH_SIZE = 100;
            for (let i = 0; i < urlsToDelete.length; i += BATCH_SIZE) {
                const batch = urlsToDelete.slice(i, i + BATCH_SIZE);
                await del(batch, { token: process.env.BLOB_READ_WRITE_TOKEN });
                report += `   Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}\n`;
            }
            report += '✅ Cleanup complete!\n';
        }
    } catch (error) {
        report += `❌ Error: ${error.message}\nStack: ${error.stack}\n`;
    } finally {
        fs.writeFileSync(reportPath, report);
        await prisma.$disconnect();
    }
}

cleanupOrphanedBlobs().catch(err => {
    fs.appendFileSync(path.join(__dirname, '../cleanup_report.txt'), `CRITICAL ERROR: ${err.message}\n`);
});
