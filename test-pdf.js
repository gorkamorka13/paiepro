const { loadPDF, getPDFText } = require('unpdf');
const fs = require('fs');

async function test(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const pdf = await loadPDF(data);
    const text = await getPDFText(pdf);
    console.log('--- TEXT START ---');
    console.log(Array.isArray(text) ? text.join('\n') : text);
    console.log('--- TEXT END ---');
  } catch (err) {
    console.error(err);
  }
}

const arg = process.argv[2];
if (arg) test(arg);
else console.log('Usage: node test-pdf.js <path-to-pdf>');
