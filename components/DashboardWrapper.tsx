'use client';

import React from 'react';
import type { Payslip } from '@/types/payslip';
import { Dashboard } from './Dashboard';

export default function DashboardWrapper({ initialPayslips }: { initialPayslips: Payslip[] }) {
    return <Dashboard initialPayslips={initialPayslips} />;
}
