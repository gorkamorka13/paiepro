'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Database, Zap, HardDrive } from 'lucide-react';
import { getUsageStatsAction } from '@/app/actions/payslip';

export function UsageIndicator({ isCollapsed }: { isCollapsed: boolean }) {
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

    if (isCollapsed) {
        return (
            <div className="flex flex-col items-center gap-4 py-4 border-t border-gray-100 dark:border-gray-800">
                <div className="relative group">
                    <HardDrive className={`w-5 h-5 ${parseFloat(stats.storageMB || '0') > 200 ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
                        Stockage: {stats.storagePercent.toFixed(1)}%
                    </div>
                </div>
                <div className="relative group">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
                        Tokens: {stats.tokenDisplay}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800/50 space-y-4">
            {/* Stockage */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3" />
                        Stockage
                    </span>
                    <span className={parseFloat(stats.storageMB || '0') > 200 ? 'text-amber-600' : ''}>
                        {stats.storageMB} / {stats.limitMB} Mo
                    </span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 rounded-full ${
                            stats.storagePercent > 90 ? 'bg-red-500' :
                            stats.storagePercent > 70 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${stats.storagePercent}%` }}
                    />
                </div>
            </div>

            {/* Tokens */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-blue-500" />
                        Tokens IA
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {stats.tokenDisplay}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>{stats.fileCount} fichiers analysés</span>
                    <span className="italic">Gemini 2.5 Flash</span>
                </div>
            </div>
        </div>
    );
}
