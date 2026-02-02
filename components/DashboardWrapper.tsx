'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const Dashboard = dynamic(() => import('./Dashboard').then((mod) => mod.Dashboard), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
    ),
});

export default function DashboardWrapper() {
    return <Dashboard />;
}
