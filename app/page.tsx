import Link from 'next/link';
import { UploadZone } from '@/components/UploadZone';
import { FileText, BarChart3 } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <FileText className="w-12 h-12 text-blue-600" />
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                            Payslip Analyzer AI
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Analysez vos bulletins de paie automatiquement grâce à l'intelligence artificielle.
                        Upload, analyse, et visualisation en quelques secondes.
                    </p>
                </div>

                {/* Upload Zone */}
                <UploadZone />

                {/* Navigation */}
                <div className="mt-12 text-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Voir le Dashboard
                    </Link>
                </div>

                {/* Features */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Upload Simple</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Glissez-déposez vos bulletins PDF, JPEG ou PNG. Jusqu'à 10MB par fichier.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Analyse IA</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Extraction automatique des données : salaire, cotisations, heures, période.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Visualisation</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Graphiques d'évolution, statistiques, et export PDF de vos données.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
