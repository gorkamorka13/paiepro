'use client';

import dynamic from 'next/dynamic';
import type { Payslip } from '@/types/payslip';

const DashboardWrapper = dynamic(() => import('./DashboardWrapper'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
    ),
});

export default function DashboardClient({ initialPayslips }: { initialPayslips: Payslip[] }) {
    return <DashboardWrapper initialPayslips={initialPayslips} />;
}
