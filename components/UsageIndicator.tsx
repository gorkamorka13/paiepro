'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Zap, HardDrive } from 'lucide-react';
import { getUsageStatsAction } from '@/app/actions/payslip';

export function UsageIndicator() {
    const { data: statsResult, error } = useSWR('usage-stats', async () => {
        const res = await getUsageStatsAction();
        return res.data;
    }, {
        refreshInterval: 30000 // Refresh every 30s
    });

    const stats = useMemo(() => {
        if (!statsResult) return { storagePercent: 0, storageDisplay: '0 Mo', tokenDisplay: '0' };

        const storageMB = statsResult.totalStorageBytes / (1024 * 1024);
        const limitMB = statsResult.limitBytes / (1024 * 1024);
        const storagePercent = Math.min((storageMB / limitMB) * 100, 100);

        return {
            storageMB: storageMB.toFixed(1),
            storagePercent,
            storageDisplay: `${storageMB.toFixed(1)} Mo`,
            limitMB: limitMB.toFixed(0),
            tokenDisplay: statsResult.totalTokens.toLocaleString(),
            fileCount: statsResult.fileCount
        };
    }, [statsResult]);

    if (error) return null;

    return (
        <div className="p-4 bg-white/50 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-100/50 dark:border-gray-700/50 space-y-4 shadow-sm hover:shadow-md transition-all">
            {/* Stockage */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3 text-blue-500" />
                        Stockage
                    </span>
                    <span className={parseFloat(stats.storageMB || '0') > 200 ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'}>
                        {stats.storageMB} / {stats.limitMB} Mo
                    </span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden shadow-inner p-[1px]">
                    <div
                        className={`h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)] ${
                            stats.storagePercent > 90 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
                            stats.storagePercent > 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                            'bg-gradient-to-r from-blue-500 to-indigo-600'
                        }`}
                        style={{ width: `${stats.storagePercent}%` }}
                    />
                </div>
            </div>

            {/* Tokens */}
            <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                        Intelligence IA
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-black">
                        {stats.tokenDisplay}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-900/50 px-2 py-0.5 rounded-full">{stats.fileCount} analyses</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-tight">Gemini 2.5 Flash</span>
                </div>
            </div>
        </div>
    );
}
