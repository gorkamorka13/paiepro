'use client';

import { Users } from 'lucide-react';

interface ClientChartProps {
    clientData: Array<{ name: string; value: number }>;
}

export function ClientChart({ clientData }: ClientChartProps) {
    if (clientData.length === 0) return null;

    const maxValue = Math.max(...clientData.map(d => d.value));
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Répartition par Employeur (Cumul Net)</h2>
            </div>

            <div className="space-y-4">
                {clientData.map((item, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between items-baseline text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
                                {item.name}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                {item.value.toFixed(2)} €
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-3"
                                style={{
                                    width: `${(item.value / maxValue) * 100}%`,
                                    backgroundColor: colors[index % colors.length],
                                    minWidth: item.value > 0 ? '40px' : '0',
                                }}
                            >
                                <span className="text-white text-xs font-bold">
                                    {((item.value / maxValue) * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
