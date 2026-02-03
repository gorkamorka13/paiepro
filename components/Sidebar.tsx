'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, BarChart3, Settings, Sun, Moon, Menu, X, LogOut, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { signOut } from '@/lib/auth-client';
import packageInfo from '../package.json';
import Image from 'next/image';
import { UsageIndicator } from './UsageIndicator';
import { SettingsModal } from './auth/SettingsModal';

export function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const menuItems = [
        { icon: Home, label: 'Accueil', href: '/' },
        { icon: BarChart3, label: 'Dashboard', href: '/dashboard' },
        { icon: AlertCircle, label: 'Logs IA', href: '/admin/extraction-logs' },
    ];

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const selectedCompanyId = searchParams.get('companyId');

    return (
        <>
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="fixed top-4 left-4 z-[60] p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg md:hidden shadow-md text-gray-600 dark:text-gray-400"
            >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 flex flex-col w-60
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-6 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-transparent rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <Image
                                src="/paiepro.png"
                                alt="PaiePro Logo"
                                width={40}
                                height={40}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white truncate">
                            PaiePro
                        </span>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        aria-label="Toggle Theme"
                    >
                        {mounted ? (
                            theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-amber-500 bg-transparent" />
                            ) : (
                                <Moon className="w-5 h-5 text-blue-600 bg-transparent" />
                            )
                        ) : (
                            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                        )}
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href && !selectedCompanyId;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <item.icon className="w-6 h-6 flex-shrink-0" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="my-6 border-t border-gray-100 dark:border-gray-800 mx-3" />

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-left"
                    >
                        <Settings className="w-6 h-6 flex-shrink-0" />
                        <span className="font-medium">Paramètres</span>
                    </button>
                </nav>

                <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <UsageIndicator />

                    <div className="space-y-2">
                        <button
                            onClick={async () => {
                                await signOut({ redirect: false });
                                window.location.href = '/';
                            }}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 overflow-hidden border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                        >
                            <LogOut className="w-6 h-6 flex-shrink-0" />
                            <span className="font-medium text-sm">Déconnexion</span>
                        </button>
                    </div>

                    <div className="mt-4 px-3 py-2 text-center border-t border-gray-100 dark:border-gray-800">
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                © {new Date().getFullYear()} Michel ESPARSA
                            </p>
                            <p className="text-[9px] text-gray-300 dark:text-gray-600">
                                v{packageInfo.version}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
}

