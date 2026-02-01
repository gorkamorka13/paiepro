'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getPayslipsAction, deletePayslipAction, updatePayslipAction } from '@/app/actions/payslip';
import { Trash2, ExternalLink, Users, Edit2, X, Save, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Payslip } from '@prisma/client';
import type { UpdatePayslipData } from '@/lib/validations';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function Dashboard() {
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);

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

    // Préparer les données pour la répartition par client
    const clientDataMap = payslips.reduce((acc, p) => {
        const employer = p.employerName || 'Non identifié';
        acc[employer] = (acc[employer] || 0) + p.netToPay;
        return acc;
    }, {} as Record<string, number>);

    const clientData = Object.entries(clientDataMap)
        .map(([name, value]) => ({
            name,
            value
        }))
        .sort((a, b) => b.value - a.value);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tableau de Bord</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gérez et analysez vos bulletins de paie centralisés.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => exportToExcel(payslips)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Exporter Excel</span>
                    </button>
                    <button
                        onClick={() => exportToPDF(payslips)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Exporter PDF</span>
                    </button>
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">Total Bulletins</p>
                    <p className="text-3xl font-bold">{payslips.length}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 font-medium">
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Brut</p>
                    <p className="text-2xl md:text-3xl font-bold">
                        {payslips.reduce((sum, p) => sum + Math.trunc(p.grossSalary), 0).toFixed(2)} €
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">Total Net à Payer</p>
                    <p className="text-2xl md:text-3xl font-bold">
                        {payslips.reduce((sum, p) => sum + p.netToPay, 0).toFixed(2)} €
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">Total Net Avant Impôts</p>
                    <p className="text-2xl md:text-3xl font-bold">
                        {payslips.reduce((sum, p) => sum + p.netBeforeTax, 0).toFixed(2)} €
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-1">Total Heures</p>
                    <p className="text-2xl md:text-3xl font-bold">
                        {payslips.reduce((sum, p) => sum + p.hoursWorked, 0).toFixed(2)} h
                    </p>
                </div>
            </div>

            {/* Répartition par Client */}
            {clientData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-6">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-semibold">Répartition par Client (Cumul Net)</h2>
                    </div>

                    <div className="h-[300px] md:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={clientData} margin={{ top: 20, right: 10, left: -10, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    tick={{ fontSize: 10 }}
                                    height={80}
                                />
                                <YAxis
                                    tickFormatter={(value) => `${value} €`}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip
                                    formatter={(value: number) => `${value.toFixed(2)} €`}
                                    labelStyle={{ color: '#000' }}
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {clientData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}


            {/* Tableau des bulletins */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Période
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employé
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                    Salaire Brut
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Net à Payer
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Heures
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {payslips.map((payslip) => {

                                return (
                                    <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {payslip.periodMonth && payslip.periodYear
                                                        ? `${String(payslip.periodMonth).padStart(2, '0')}/${payslip.periodYear}`
                                                        : 'Période inconnue'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${payslip.processingStatus === 'completed'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        }`}>
                                                        {payslip.processingStatus === 'completed' ? 'Analysé' : 'À compléter'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium">{payslip.employeeName || 'Nom inconnu'}</div>
                                            <div className="text-xs text-gray-500 italic max-w-xs truncate">{payslip.employeeAddress || 'Adresse non renseignée'}</div>
                                            <div className="text-xs text-gray-400 font-bold mt-1">{payslip.employerName || 'Entreprise inconnue'}</div>
                                            {(payslip.siretNumber || payslip.urssafNumber) ? (
                                                <div className="text-[10px] text-gray-400">
                                                    {payslip.siretNumber && `SIRET: ${payslip.siretNumber}`}
                                                    {payslip.siretNumber && payslip.urssafNumber && ' | '}
                                                    {payslip.urssafNumber && `URSSAF: ${payslip.urssafNumber}`}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-amber-500 italic">Infos employeur manquantes</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                {payslip.grossSalary > 0 ? `${payslip.grossSalary.toFixed(2)} € (Brut)` : '—'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {payslip.netTaxable > 0 ? `${payslip.netTaxable.toFixed(2)} € (Impos.)` : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-green-600">
                                                {payslip.netToPay > 0 ? `${payslip.netToPay.toFixed(2)} € (Net)` : '—'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {payslip.netBeforeTax > 0 ? `${payslip.netBeforeTax.toFixed(2)} € (Av. Impôt)` : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm">{payslip.hoursWorked > 0 ? `${payslip.hoursWorked.toFixed(2)} h` : '—'}</div>
                                            <div className="text-xs text-gray-500">
                                                {payslip.hoursWorked > 0 ? `${(payslip.netToPay / payslip.hoursWorked).toFixed(2)} €/h (Net)` : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={payslip.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Voir le document"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => setEditingPayslip(payslip)}
                                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(payslip.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {payslips.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Aucun bulletin de paie pour le moment
                    </div>
                )}
            </div>

            {/* Modal d'édition */}
            {editingPayslip && (
                <EditModal
                    payslip={editingPayslip}
                    onClose={() => setEditingPayslip(null)}
                    onSave={async (id, data) => {
                        const result = await updatePayslipAction(id, data);
                        if (result.success) {
                            toast.success('Bulletin mis à jour');
                            loadPayslips();
                            setEditingPayslip(null);
                        } else {
                            toast.error(result.error);
                        }
                    }}
                />
            )}
        </div>
    );
}

function EditModal({
    payslip,
    onClose,
    onSave
}: {
    payslip: Payslip;
    onClose: () => void;
    onSave: (id: string, data: UpdatePayslipData) => Promise<void>;
}) {
    const [formData, setFormData] = useState<UpdatePayslipData>({
        employeeName: payslip.employeeName,
        employerName: payslip.employerName,
        periodMonth: payslip.periodMonth,
        periodYear: payslip.periodYear,
        netToPay: payslip.netToPay,
        grossSalary: payslip.grossSalary,
        netTaxable: payslip.netTaxable,
        netBeforeTax: payslip.netBeforeTax,
        taxAmount: payslip.taxAmount,
        hoursWorked: payslip.hoursWorked,
        hourlyNetTaxable: payslip.hourlyNetTaxable,
        employeeAddress: payslip.employeeAddress,
        siretNumber: payslip.siretNumber,
        urssafNumber: payslip.urssafNumber,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(payslip.id, formData);
        setIsSaving(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div>
                        <h3 className="text-xl font-bold">Modifier les données</h3>
                        <p className="text-sm text-gray-500">{payslip.fileName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employé</label>
                            <input
                                type="text"
                                name="employeeName"
                                value={formData.employeeName || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employeur</label>
                            <input
                                type="text"
                                name="employerName"
                                value={formData.employerName || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mois</label>
                            <input
                                type="number"
                                name="periodMonth"
                                min="1"
                                max="12"
                                value={formData.periodMonth || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Année</label>
                            <input
                                type="number"
                                name="periodYear"
                                value={formData.periodYear || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adresse Employé</label>
                            <input
                                type="text"
                                name="employeeAddress"
                                value={formData.employeeAddress || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SIRET</label>
                            <input
                                type="text"
                                name="siretNumber"
                                value={formData.siretNumber || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">URSSAF</label>
                            <input
                                type="text"
                                name="urssafNumber"
                                value={formData.urssafNumber || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Montants</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-blue-600">Salaire Brut</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="grossSalary"
                                    value={formData.grossSalary}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border-2 border-blue-100 dark:border-blue-900/30 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-green-600">Net à Payer</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="netToPay"
                                    value={formData.netToPay}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border-2 border-green-100 dark:border-green-900/30 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500">Net Imposable</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="netTaxable"
                                    value={formData.netTaxable || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500">Heures</label>
                            <input
                                type="number"
                                step="0.01"
                                name="hoursWorked"
                                value={formData.hoursWorked || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500">Impôts</label>
                            <input
                                type="number"
                                step="0.01"
                                name="taxAmount"
                                value={formData.taxAmount || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500">Av. Impôt</label>
                            <input
                                type="number"
                                step="0.01"
                                name="netBeforeTax"
                                value={formData.netBeforeTax || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500">Taux Hor.</label>
                            <input
                                type="number"
                                step="0.01"
                                name="hourlyNetTaxable"
                                value={formData.hourlyNetTaxable || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}
