import { PrismaClient } from '@prisma/client';
import { list } from '@vercel/blob';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Payslips ---');
    const payslips = await prisma.payslip.findMany({
        select: {
            id: true,
            employeeName: true,
            employerName: true,
            periodMonth: true,
            periodYear: true,
            fileUrl: true,
        }
    });
    console.log(JSON.stringify(payslips, null, 2));

    console.log('\n--- Vercel Blobs ---');
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('BLOB_READ_WRITE_TOKEN is missing');
        return;
    }

    const { blobs } = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN
    });
    const result = {
        payslips,
        blobs: blobs.map(b => ({ url: b.url, pathname: b.pathname, size: b.size }))
    };

    fs.writeFileSync(path.join(__dirname, '../payslips_data.json'), JSON.stringify(result, null, 2));
    console.log('Done writing to payslips_data.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
