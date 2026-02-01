'use client';

import Link from 'next/link';
import { UploadZone } from '@/components/UploadZone';
import { FileText, BarChart3, Zap } from 'lucide-react';

export default function Home() {

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-4">
                        <img src="/paiepro.png" alt="PaiePro Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
                            Payslip Analyzer AI
                        </h1>
                    </div>
                    <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
                        Analysez vos bulletins de paie automatiquement grâce à l&apos;intelligence artificielle.
                        Upload, analyse, et visualisation en quelques secondes.
                    </p>
                </div>

                {/* Upload Zone */}
                <UploadZone />

                {/* Navigation */}
                <div className="mt-12 text-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Voir le Dashboard
                    </Link>
                </div>

                {/* Features */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Upload Simple</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Glissez-déposez vos bulletins PDF, JPEG ou PNG. Jusqu&apos;à 10MB par fichier.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-transparent hover:border-green-100 dark:hover:border-green-900/30">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Analyse Hybride</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Combinaison d&apos;algorithmes classiques et d&apos;IA de pointe pour une précision maximale.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Visualisation</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Graphiques d&apos;évolution, statistiques, et export PDF de vos données.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

