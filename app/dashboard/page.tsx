import Link from 'next/link';
import { Dashboard } from '@/components/Dashboard';
import { ArrowLeft } from 'lucide-react';

export default function DashboardPage() {
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
                        Retour à l'upload
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Visualisez et gérez vos bulletins de paie
                    </p>
                </div>

                {/* Dashboard Component */}
                <Dashboard />
            </div>
        </div>
    );
}
