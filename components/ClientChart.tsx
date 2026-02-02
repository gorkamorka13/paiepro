'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface ClientChartProps {
    clientData: Array<{ name: string; value: number }>;
}

export function ClientChart({ clientData }: ClientChartProps) {
    if (clientData.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Répartition par Employeur (Cumul Net)</h2>
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
    );
}
