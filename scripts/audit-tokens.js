const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const logPath = path.join(__dirname, '../token_audit.txt');

async function main() {
    fs.writeFileSync(logPath, 'Starting token audit...\n');

    try {
        const payslipTokens = await prisma.payslip.aggregate({
            _sum: { inputTokens: true, outputTokens: true }
        });
        fs.appendFileSync(logPath, `Payslip tokens fetched.\n`);

        const logTokens = await prisma.extractionLog.aggregate({
            _sum: { inputTokens: true, outputTokens: true }
        });
        fs.appendFileSync(logPath, `Log tokens fetched.\n`);

        const pTotal = (payslipTokens._sum.inputTokens || 0) + (payslipTokens._sum.outputTokens || 0);
        const lTotal = (logTokens._sum.inputTokens || 0) + (logTokens._sum.outputTokens || 0);

        fs.appendFileSync(logPath, `Payslip: ${pTotal}\nLog: ${lTotal}\n`);
        console.log('Done.');
    } catch (err) {
        fs.appendFileSync(logPath, `Error: ${err.message}\nStack: ${err.stack}\n`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
