'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, BarChart3, Settings, ChevronLeft, ChevronRight, Sun, Moon, Menu, X, Users, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import packageInfo from '../package.json';
import useSWR from 'swr';
import Image from 'next/image';
import { UsageIndicator } from './UsageIndicator';

export function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const menuItems = [
        { icon: Home, label: 'Accueil', href: '/' },
        { icon: BarChart3, label: 'Dashboard', href: '/dashboard' },
    ];

    const secondaryItems = [
        { icon: Settings, label: 'Paramètres', href: '#' },
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
                className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 flex flex-col
                    ${isCollapsed ? 'w-20' : 'w-60'}
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <Image
                            src="/paiepro.png"
                            alt="PaiePro Logo"
                            width={32}
                            height={32}
                            className="w-full h-full object-contain p-1"
                        />
                    </div>
                    {!isCollapsed && (
                        <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white truncate">
                            PaiePro
                        </span>
                    )}
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
                                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                            </Link>
                        );
                    })}

                    <div className="my-6 border-t border-gray-100 dark:border-gray-800 mx-3" />

                    {secondaryItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                        >
                            <item.icon className="w-6 h-6 flex-shrink-0" />
                            {!isCollapsed && <span className="font-medium">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <UsageIndicator isCollapsed={isCollapsed} />

                    <div className="space-y-2">
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 overflow-hidden border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                        >
                            <LogOut className="w-6 h-6 flex-shrink-0" />
                            {!isCollapsed && <span className="font-medium text-sm">Déconnexion</span>}
                        </button>

                        <button
                            onClick={toggleTheme}
                            className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 overflow-hidden ${isCollapsed ? 'justify-center' : ''
                                }`}
                        >
                            {mounted ? (
                                <>
                                    {theme === 'dark' ? (
                                        <Sun className="w-6 h-6 flex-shrink-0 text-amber-500" />
                                    ) : (
                                        <Moon className="w-6 h-6 flex-shrink-0 text-blue-600" />
                                    )}
                                    {!isCollapsed && (
                                        <span className="font-medium">
                                            {theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <div className="w-6 h-6 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                            )}
                        </button>

                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-100 dark:border-gray-800 overflow-hidden"
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-6 h-6 mx-auto" />
                            ) : (
                                <>
                                    <ChevronLeft className="w-6 h-6 flex-shrink-0" />
                                    <span className="font-medium">Réduire</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-4 px-3 py-2 text-center border-t border-gray-100 dark:border-gray-800">
                        {!isCollapsed ? (
                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                    © {new Date().getFullYear()} Michel ESPARSA
                                </p>
                                <p className="text-[9px] text-gray-300 dark:text-gray-600">
                                    v{packageInfo.version}
                                </p>
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-400 font-bold">ME</div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}

