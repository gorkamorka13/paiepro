const { del, list } = require('@vercel/blob');
require('dotenv').config();

const URLS_TO_KEEP = [
    "https://4hhi6cqygz8wscwc.public.blob.vercel-storage.com/AIOUAZ%20Sami_decembre2025-Rgby2Uu1tMPzdjMvwU3B8qLDKc3LAy.pdf",
    "https://4hhi6cqygz8wscwc.public.blob.vercel-storage.com/BICHE%20Arnaud_Decembre2025-mUaGBG815ZMz59J0wEIRXPWUo1vlXL.pdf",
    "https://4hhi6cqygz8wscwc.public.blob.vercel-storage.com/Bulletin%20salaire_NAVARRO_12_2025-qhWIG6wMJqmwY14zJ0qd8v8I4MGae0.pdf",
    "https://4hhi6cqygz8wscwc.public.blob.vercel-storage.com/COULOUMIES%20Damien_Decembre2025-ZpCnrI1vAwOXwK1XVX1sztcWtd5bKL.pdf"
];

async function main() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('❌ BLOB_READ_WRITE_TOKEN is missing');
        return;
    }

    console.log('🔍 Listing all blobs...');
    const { blobs } = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN
    });

    const blobsToDelete = blobs.filter(b => !URLS_TO_KEEP.includes(b.url));

    console.log(`📊 Found ${blobs.length} total blobs.`);
    console.log(`✅ Keeping ${URLS_TO_KEEP.length} blobs.`);
    console.log(`🗑️ Identifying ${blobsToDelete.length} blobs for deletion.`);

    if (blobsToDelete.length === 0) {
        console.log('✨ No blobs to delete.');
        return;
    }

    for (const blob of blobsToDelete) {
        console.log(`Deleting: ${blob.pathname} (${blob.url})`);
        await del(blob.url, {
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
    }

    console.log('🎉 Cleanup complete!');
}

main().catch(console.error);
