const { execSync } = require('child_process');

async function repair() {
    console.log('--- Database Repair Script ---');
    try {
        console.log('Step 1: Running db push with explicit env...');
        const output = execSync('npx prisma db push --accept-data-loss', {
            env: { ...process.env, DATABASE_URL: 'postgresql://neondb_owner:npg_oZeMQsC9Ga6q@ep-red-hat-agrru8jt-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require' },
            encoding: 'utf-8'
        });
        console.log('✅ Output:', output);

        console.log('Step 2: Regenerating client...');
        const genOutput = execSync('npx prisma generate', { encoding: 'utf-8' });
        console.log('✅ Output:', genOutput);

        console.log('SUCCESS: Database should be synced.');
    } catch (error) {
        console.error('❌ Error during repair:', error.stdout || error.message);
    }
}

repair();
