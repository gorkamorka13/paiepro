
const text = `
BULLETIN DE SALAIRE
01/09/2024 au 30/09/2024
Employeur
Mme TRUILLET Frédérique
...
COTISATIONS SOCIALES SALARIALES PATRONALES
Contribution au dialogue social 66,05 0,016% 0,01
CSG + CRDS / Imposable - non déductible de l’IRPP 64,90 2,900% 1,88
CSG Non Imposable et déductible 64,90 6,800% 4,41
MONTANT NET SOCIAL * 51,60
SALAIRE NET IMPOSABLE ** (CSG / CRDS inclus) 53,48
NET A PAYER avant impôt sur le revenu 92,50
NET A PAYER après impôt sur le revenu 92,50
`;

const patterns = {
  netBeforeTax: /(?:NET AVANT IMP(?:Ô|O)T|Net [àa] payer avant imp(?:ô|o)t)(?:[^\d\n]*)([\d\s,.]+)/i,
  netTaxable: /(?:NET IMPOSABLE|Net fiscal|Salaire net imposable)(?:[^\d\n]*)([\d\s,.]+)/i,
};

function parseAmount(match: string | undefined): number {
  if (!match) return 0;
  let cleaned = match.replace(/[€$£\s]/g, '').trim();
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastDot < lastComma) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  cleaned = cleaned.replace(',', '.');
  // Si on a plusieurs points (ex: 1 234.56 extrait comme 1.234.56), on ne garde que le dernier
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

console.log('Testing Net Taxable Regex...');
const netTaxableMatch = text.match(patterns.netTaxable);
console.log('Match:', netTaxableMatch ? netTaxableMatch[0] : 'null');
console.log('Group 1:', netTaxableMatch ? netTaxableMatch[1] : 'null');
console.log('Parsed Value:', parseAmount(netTaxableMatch?.[1]));

console.log('\nTesting Net Before Tax Regex...');
const netBeforeTaxMatch = text.match(patterns.netBeforeTax);
console.log('Match:', netBeforeTaxMatch ? netBeforeTaxMatch[0] : 'null');
console.log('Group 1:', netBeforeTaxMatch ? netBeforeTaxMatch[1] : 'null');
console.log('Parsed Value:', parseAmount(netBeforeTaxMatch?.[1]));

if (parseAmount(netTaxableMatch?.[1]) === 53.48 && parseAmount(netBeforeTaxMatch?.[1]) === 92.50) {
  console.log('\n✅ VERIFICATION SUCCESSFUL');
} else {
  console.log('\n❌ VERIFICATION FAILED');
}
