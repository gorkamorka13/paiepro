'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getExtractionLogsAction,
    getErrorStatsAction,
    getLogDetailsAction,
    deleteAllLogsAction
} from '@/app/actions/extraction-logs';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Filter,
    Database,
    Brain,
    Clock,
    FileText,
    AlertTriangle,
    X,
    FileSearch,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Log {
    id: string;
    createdAt: Date;
    fileName: string;
    fileSize: number;
    mimeType: string;
    extractionMethod: 'traditional' | 'ai' | 'hybrid';
    aiModel: string | null;
    success: boolean;
    errorType: string | null;
    errorMessage: string | null;
    processingTimeMs: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
}

export default function ExtractionLogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<{ total: number; byMethod: Array<{ extractionMethod: string; _count: number }> } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<Log & {
        rawResponse?: string;
        extractedData?: unknown;
        validationErrors?: unknown[];
        payslipId?: string;
        fileUrl?: string; // Add this if missing in Log
    } | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Filtres
    const [success, setSuccess] = useState<boolean | undefined>(undefined);
    const [method, setMethod] = useState<string>('');
    const [skip, setSkip] = useState(0);
    const take = 20;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [logsData, statsData] = await Promise.all([
                getExtractionLogsAction({
                    skip,
                    take,
                    success,
                    extractionMethod: method || undefined
                }),
                getErrorStatsAction()
            ]);

            setLogs((logsData.logs as unknown) as Log[]);
            setTotal(logsData.total);
            setStats(statsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [skip, success, method]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const viewDetails = async (id: string) => {
        try {
            const details = await getLogDetailsAction(id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSelectedLog(details as any);
            setIsDetailOpen(true);
        } catch (error) {
            console.error(error);
        }
    };

    const getMethodIcon = (m: string) => {
        switch (m) {
            case 'ai': return <Brain className="w-4 h-4" />;
            case 'traditional': return <Database className="w-4 h-4" />;
            default: return <RefreshCw className="w-4 h-4" />;
        }
    };

    const getErrorTypeColor = (type: string | null) => {
        switch (type) {
            case 'api_error': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'validation_error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'parsing_error': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'network_error': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const handleDeleteAll = async () => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer TOUS les logs d\'extraction ? Cette action est irréversible.')) {
            try {
                setLoading(true);
                await deleteAllLogsAction();
                await loadData();
            } catch (error) {
                console.error(error);
                alert('Erreur lors de la suppression des logs');
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <FileSearch className="w-8 h-8 text-blue-600" />
                        Logs d&apos;extraction IA
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Suivez et diagnostiquez les performances de reconnaissance des bulletins
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDeleteAll}
                        className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm flex items-center gap-2 font-medium"
                        title="Supprimer tous les logs"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Tout supprimer</span>
                    </button>
                    <button
                        onClick={() => loadData()}
                        className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                        title="Actualiser"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Échecs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                            <Brain className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Par IA</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.byMethod.find((m: { extractionMethod: string }) => m.extractionMethod === 'ai')?._count || 0}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
                            <Database className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Par Regex</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.byMethod.find((m: { extractionMethod: string }) => m.extractionMethod === 'traditional')?._count || 0}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters & Content */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={success === undefined ? '' : String(success)}
                            onChange={(e) => setSuccess(e.target.value === '' ? undefined : e.target.value === 'true')}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tous les résultats</option>
                            <option value="true">Succès</option>
                            <option value="false">Échecs</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Toutes les méthodes</option>
                            <option value="ai">Intelligence Artificielle</option>
                            <option value="traditional">Extraction Classique</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Document</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Méthode</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Durée</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Date</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group cursor-pointer"
                                    onClick={() => viewDetails(log.id)}
                                >
                                    <td className="px-6 py-4">
                                        {log.success ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Succès
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Échec
                                                </div>
                                                {log.errorType && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${getErrorTypeColor(log.errorType)}`}>
                                                        {log.errorType}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div className="max-w-[200px]">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={log.fileName}>
                                                    {log.fileName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                    {(log.fileSize / 1024).toFixed(0)} KB • {log.mimeType.split('/')[1]}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            {getMethodIcon(log.extractionMethod)}
                                            <span className="capitalize">{log.extractionMethod === 'traditional' ? 'Regex' : 'Gemini'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {log.processingTimeMs ? `${log.processingTimeMs}ms` : '--'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                                        {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: fr })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </td>
                                </tr>
                            ))}

                            {logs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileSearch className="w-12 h-12 text-gray-200" />
                                            <p className="text-gray-500 dark:text-gray-400">Aucun log trouvé pour ces critères</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Affichage de {logs.length} sur {total} logs
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSkip(Math.max(0, skip - take))}
                            disabled={skip === 0}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-50"
                        >
                            Précédent
                        </button>
                        <button
                            onClick={() => setSkip(skip + take)}
                            disabled={skip + take >= total}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-50"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {isDetailOpen && selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Détails du Log d&apos;Extraction
                                <span className={`text-xs px-2.5 py-1 rounded-full ${selectedLog.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {selectedLog.success ? 'Succès' : 'Échec'}
                                </span>
                            </h2>
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Infos Header */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Méthode</p>
                                    <p className="text-gray-900 dark:text-white capitalize flex items-center gap-2">
                                        {getMethodIcon(selectedLog.extractionMethod)}
                                        {selectedLog.extractionMethod} {selectedLog.aiModel && `(${selectedLog.aiModel})`}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Temps de traitement</p>
                                    <p className="text-gray-900 dark:text-white">{selectedLog.processingTimeMs}ms</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Usage Tokens</p>
                                    <p className="text-gray-900 dark:text-white">
                                        In: {selectedLog.inputTokens || 0} • Out: {selectedLog.outputTokens || 0}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">ID Payslip</p>
                                    <p className="text-gray-900 dark:text-white font-mono text-xs">{selectedLog.payslipId || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Erreur Section */}
                            {!selectedLog.success && (
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-6 rounded-3xl space-y-3">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold uppercase text-xs">
                                        <AlertCircle className="w-4 h-4" />
                                        Message d&apos;Erreur ({selectedLog.errorType})
                                    </div>
                                    <p className="text-red-600 dark:text-red-300 text-sm font-mono break-all bg-white/50 dark:bg-black/20 p-4 rounded-xl">
                                        {selectedLog.errorMessage || 'Erreur inconnue'}
                                    </p>
                                    {selectedLog.validationErrors && (
                                        <div className="mt-4">
                                            <p className="text-xs font-bold text-red-800 dark:text-red-400 mb-2">Détails Validation Zod :</p>
                                            <pre className="text-xs text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20 p-4 rounded-xl overflow-x-auto">
                                                {JSON.stringify(selectedLog.validationErrors, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Data Review */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Données Extraites (JSON)</p>
                                    <pre className="bg-gray-100 dark:bg-black/40 text-gray-800 dark:text-gray-300 p-6 rounded-3xl text-sm overflow-x-auto max-h-[400px] font-mono border border-gray-200 dark:border-gray-800">
                                        {JSON.stringify(selectedLog.extractedData || {}, null, 2)}
                                    </pre>
                                </div>

                                {selectedLog.rawResponse && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Réponse Brute de l&apos;IA</p>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 p-6 rounded-3xl text-xs overflow-x-auto max-h-[300px] font-mono border border-gray-200 dark:border-gray-800">
                                            {selectedLog.rawResponse}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
                            <a
                                href={selectedLog.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-6 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Voir le document
                            </a>
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className="px-8 py-2.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:opacity-90 transition-all shadow-lg"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
