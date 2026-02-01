const { execSync } = require('child_process');
const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('debug-prisma.log', msg + '\n');
}

async function debug() {
    fs.writeFileSync('debug-prisma.log', '--- DEBUG START ---\n');
    try {
        log('Checking local prisma version...');
        const version = execSync('npx prisma -v', { encoding: 'utf-8' });
        log('Version output:\n' + version);

        log('Attempting db push...');
        const push = execSync('npx prisma db push --accept-data-loss', {
            encoding: 'utf-8',
            env: { ...process.env, DATABASE_URL: 'postgresql://neondb_owner:npg_oZeMQsC9Ga6q@ep-red-hat-agrru8jt-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require' }
        });
        log('Push output:\n' + push);

        log('Generating client...');
        const gen = execSync('npx prisma generate', { encoding: 'utf-8' });
        log('Generate output:\n' + gen);

    } catch (error) {
        log('!!! ERROR !!!');
        log('Stdout: ' + error.stdout);
        log('Stderr: ' + error.stderr);
        log('Message: ' + error.message);
    }
}

debug();
