import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DashboardClient from '@/components/DashboardClient';
// import { getPayslipsAction } from '@/app/actions/payslip';

export default async function DashboardPage() {
    // Pre-fetch data on the server
    const result = await getPayslipsAction();
    // MOCK FOR DEBUGGING
    // const result: { success: boolean; data: any[]; error?: string } = { success: true, data: [] };

    // If there's an error fetching data, show error state
    if (!result.success) {
        console.error('❌ Dashboard page: Failed to fetch payslips:', result.error);
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour à l&apos;upload
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Dashboard
                        </h1>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                            Erreur de chargement
                        </h2>
                        <p className="text-red-700 dark:text-red-300 mb-4">
                            {result.error || 'Une erreur est survenue lors du chargement des données.'}
                        </p>
                        <details className="text-sm text-red-600 dark:text-red-400">
                            <summary className="cursor-pointer font-semibold">Détails techniques</summary>
                            <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">
                                {JSON.stringify({ error: result.error, env: process.env.NODE_ENV }, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            </div>
        );
    }

    const initialPayslips = result.data || [];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour à l&apos;upload
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Visualisez et gérez vos bulletins de paie
                    </p>
                </div>

                {/* Dashboard Component */}
                <DashboardClient initialPayslips={initialPayslips} />
            </div>
        </div>
    );
}
