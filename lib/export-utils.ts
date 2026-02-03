import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payslip } from '@/types/payslip';
import { formatName } from './format-utils';

// Extend jsPDF with autotable types
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: Record<string, unknown>) => jsPDF;
    }
}

export const exportToExcel = (payslips: Payslip[]) => {
    // 1. Préparer les données
    const data: Record<string, string | number | null>[] = payslips.map(p => {
        // Afficher le numéro CESU s'il est présent, sinon "NON"
        const cesuDisplay = p.cesuNumber || 'NON';

        return {
            'Mois': p.periodMonth || 0,
            'Année': p.periodYear || 0,
            'CESU': cesuDisplay,
            'Employeur': formatName(p.employerName),
            'SIRET': p.siretNumber || '',
            'URSSAF': p.urssafNumber || '',
            'Brut': p.grossSalary,
            'Net Avant Impôts': p.netBeforeTax,
            'Net Imposable': p.netTaxable,
            'Net à Payer': p.netToPay,
            'Impôts': p.taxAmount,
            'Heures': p.hoursWorked,
            'Taux Horaire Net Imp.': p.hourlyNetTaxable
        };
    });

    // 2. Calculer les totaux
    const totals = payslips.reduce((acc, p) => ({
        gross: acc.gross + p.grossSalary,
        netBefore: acc.netBefore + p.netBeforeTax,
        netTaxable: acc.netTaxable + p.netTaxable,
        netToPay: acc.netToPay + p.netToPay,
        tax: acc.tax + (p.taxAmount || 0),
        hours: acc.hours + p.hoursWorked
    }), { gross: 0, netBefore: 0, netTaxable: 0, netToPay: 0, tax: 0, hours: 0 });

    // 3. Ajouter la ligne de Total à la fin
    const totalRow = {
        'Mois': 0,
        'Année': 'TOTAL',
        'CESU': '',
        'Employeur': '',
        'SIRET': '',
        'URSSAF': '',
        'Brut': Number(totals.gross.toFixed(2)),
        'Net Avant Impôts': Number(totals.netBefore.toFixed(2)),
        'Net Imposable': Number(totals.netTaxable.toFixed(2)),
        'Net à Payer': Number(totals.netToPay.toFixed(2)),
        'Impôts': Number(totals.tax.toFixed(2)),
        'Heures': Number(totals.hours.toFixed(2)),
        'Taux Horaire Net Imp.': 0
    };

    data.push(totalRow as unknown as Record<string, string | number | null>);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulletins de Paie');
    XLSX.writeFile(workbook, `Rapport_Paie_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToPDF = (payslips: Payslip[]) => {
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(18);
    doc.text('Rapport Complet des Bulletins de Paie', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}`, 14, 30);

    const tableData = payslips.map(p => [
        `${p.periodMonth}/${p.periodYear}`,
        formatName(p.employerName) || '-',
        p.grossSalary.toFixed(2),
        p.netBeforeTax.toFixed(2),
        p.netToPay.toFixed(2),
        p.hoursWorked.toFixed(2)
    ]);

    const totals = payslips.reduce((acc, p) => ({
        gross: acc.gross + Math.trunc(p.grossSalary),
        netBefore: acc.netBefore + p.netBeforeTax,
        netToPay: acc.netToPay + p.netToPay,
        hours: acc.hours + p.hoursWorked
    }), { gross: 0, netBefore: 0, netToPay: 0, hours: 0 });

    doc.autoTable({
        startY: 40,
        head: [['Période', 'Employeur', 'Brut (€)', 'Net Av. Imp. (€)', 'Net à Payer (€)', 'Heures']],
        body: tableData,
        foot: [[
            'TOTAL',
            '-',
            totals.gross.toFixed(2),
            totals.netBefore.toFixed(2),
            totals.netToPay.toFixed(2),
            totals.hours.toFixed(2)
        ]],
        showFoot: 'lastPage',
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9 }
    });

    doc.save(`Rapport_Paie_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
