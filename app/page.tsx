'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UploadZone } from '@/components/UploadZone';
import { FileText, BarChart3, Bot, Zap, Settings2 } from 'lucide-react';

export default function Home() {
    const [useAI, setUseAI] = useState(true);

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
                        Analysez vos bulletins de paie automatiquement grâce à l&apos;intelligence artificielle.
                        Upload, analyse, et visualisation en quelques secondes.
                    </p>
                </div>

                {/* Mode Selector */}
                <div className="max-w-md mx-auto mb-8">
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 flex">
                        <button
                            onClick={() => setUseAI(true)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${useAI
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Bot className={`w-5 h-5 ${useAI ? 'animate-pulse' : ''}`} />
                            <div className="text-left">
                                <div className="font-bold text-sm">Mode IA 🤖</div>
                                <div className="text-[10px] opacity-80 leading-tight">Gemini 2.5 Flash</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setUseAI(false)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${!useAI
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Settings2 className="w-5 h-5" />
                            <div className="text-left">
                                <div className="font-bold text-sm">Classique ⚙️</div>
                                <div className="text-[10px] opacity-80 leading-tight">Regex & PDF-Parse</div>
                            </div>
                        </button>
                    </div>
                    <p className="text-center text-xs mt-3 text-gray-500 dark:text-gray-400 italic">
                        {useAI
                            ? "L'IA analyse intelligemment la structure du document pour une extraction précise."
                            : "L'extraction classique utilise des règles fixes. Plus rapide mais moins flexible."
                        }
                    </p>
                </div>

                {/* Upload Zone */}
                <UploadZone useAI={useAI} />

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

