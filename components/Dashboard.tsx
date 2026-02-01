'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPayslipsAction, deletePayslipAction } from '@/app/actions/payslip';
import { Trash2, ExternalLink, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Payslip } from '@prisma/client';

export function Dashboard() {
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPayslips();
    }, []);

    const loadPayslips = async () => {
        setIsLoading(true);
        const result = await getPayslipsAction();
        if (result.success) {
            setPayslips(result.data);
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce bulletin ?')) return;

        const result = await deletePayslipAction(id);
        if (result.success) {
            toast.success('Bulletin supprimé');
            loadPayslips();
        } else {
            toast.error(result.error);
        }
    };

    // Préparer les données pour le graphique
    const chartData = payslips
        .filter(p => p.periodYear && p.periodMonth)
        .map(p => ({
            date: `${p.periodMonth}/${p.periodYear}`,
            netToPay: p.netToPay,
            grossSalary: p.grossSalary,
        }))
        .reverse(); // Chronologique

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">Total Bulletins</p>
                    <p className="text-3xl font-bold">{payslips.length}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">Net Moyen</p>
                    <p className="text-3xl font-bold">
                        {payslips.length > 0
                            ? (payslips.reduce((sum, p) => sum + p.netToPay, 0) / payslips.length).toFixed(2)
                            : '0.00'
                        } €
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">Dernier Net à Payer</p>
                    <p className="text-3xl font-bold">
                        {payslips[0]?.netToPay.toFixed(2) || '0.00'} €
                    </p>
                </div>
            </div>

            {/* Graphique d'évolution */}
            {chartData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-semibold">Évolution des Salaires</h2>
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                formatter={(value: number) => `${value.toFixed(2)} €`}
                                labelStyle={{ color: '#000' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="netToPay"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Net à payer"
                            />
                            <Line
                                type="monotone"
                                dataKey="grossSalary"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Salaire brut"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tableau des bulletins */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Période
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employé
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Net à Payer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Salaire Brut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Heures
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {payslips.map((payslip) => (
                                <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {payslip.periodMonth && payslip.periodYear
                                            ? `${String(payslip.periodMonth).padStart(2, '0')}/${payslip.periodYear}`
                                            : 'N/A'
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {payslip.employeeName || 'Non renseigné'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold">
                                        {payslip.netToPay.toFixed(2)} €
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {payslip.grossSalary.toFixed(2)} €
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {payslip.hoursWorked.toFixed(2)}h
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <a
                                                href={payslip.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(payslip.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {payslips.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Aucun bulletin de paie pour le moment
                    </div>
                )}
            </div>
        </div>
    );
}
