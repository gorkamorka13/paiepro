'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Payslip } from '@prisma/client';

interface ExportButtonProps {
    payslips: Payslip[];
}

export function ExportButton({ payslips }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (payslips.length === 0) {
            toast.error('Aucun bulletin à exporter');
            return;
        }

        setIsExporting(true);

        try {
            const doc = new jsPDF();

            // Titre
            doc.setFontSize(18);
            doc.text('Récapitulatif des Bulletins de Paie', 14, 20);

            doc.setFontSize(10);
            doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

            // Tableau
            autoTable(doc, {
                startY: 35,
                head: [['Période', 'Employé', 'Salaire Brut', 'Net à Payer', 'Cotisations', 'Heures']],
                body: payslips.map(p => [
                    p.periodMonth && p.periodYear
                        ? `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`
                        : 'N/A',
                    p.employeeName || 'N/A',
                    `${p.grossSalary.toFixed(2)} €`,
                    `${p.netToPay.toFixed(2)} €`,
                    `${p.taxAmount.toFixed(2)} €`,
                    `${p.hoursWorked.toFixed(2)}h`,
                ]),
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 9 },
            });

            // Statistiques
            const totalNet = payslips.reduce((sum, p) => sum + p.netToPay, 0);
            const totalGross = payslips.reduce((sum, p) => sum + p.grossSalary, 0);
            const avgNet = totalNet / payslips.length;
            const avgGross = totalGross / payslips.length;

            const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`Total bulletins: ${payslips.length}`, 14, finalY);
            doc.text(`Brut total: ${totalGross.toFixed(2)} €`, 14, finalY + 6);
            doc.text(`Net total: ${totalNet.toFixed(2)} €`, 14, finalY + 12);
            doc.text(`Brut moyen: ${avgGross.toFixed(2)} €`, 100, finalY + 6);
            doc.text(`Net moyen: ${avgNet.toFixed(2)} €`, 100, finalY + 12);

            // Téléchargement
            doc.save(`bulletins-paie-${new Date().toISOString().slice(0, 10)}.pdf`);

            toast.success('PDF exporté avec succès');
        } catch (error) {
            console.error('Erreur export PDF:', error);
            toast.error('Échec de l\'export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting || payslips.length === 0}
            className="
        inline-flex items-center gap-2 px-4 py-2 
        bg-blue-600 text-white rounded-lg
        hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
      "
        >
            <FileDown className="w-4 h-4" />
            {isExporting ? 'Export en cours...' : 'Exporter en PDF'}
        </button>
    );
}
