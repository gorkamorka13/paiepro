import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Verification Script ---');
    try {
        const payslips = await prisma.payslip.findMany({ take: 1 });
        console.log('✅ Connection successful!');
        console.log('Columns found in a record:', Object.keys(payslips[0] || {}).join(', '));

        // Try to access the new columns explicitly
        const test = await prisma.payslip.findFirst({
            select: {
                id: true,
                employeeAddress: true,
                siretNumber: true,
                urssafNumber: true,
            }
        });
        console.log('✅ New columns are accessible in the database!');
    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
