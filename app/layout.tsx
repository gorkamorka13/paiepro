import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import { Suspense } from "react";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Payslip Analyzer AI",
    description: "Analysez vos bulletins de paie avec l'intelligence artificielle",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300`}
            >
                <Providers>
                    <div className="flex min-h-screen">
                        <Suspense fallback={<div className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800" />}>
                            <Sidebar />
                        </Suspense>
                        <div className="flex-1 flex flex-col min-w-0 md:pl-60"> {/* Added md:pl-60 to account for fixed sidebar */}
                            <main className="flex-1 transition-all duration-300 overflow-hidden">
                                <div className="p-4 md:p-8 pt-20 md:pt-8 min-h-screen max-w-full">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                    <Toaster position="top-right" richColors />
                </Providers>
            </body>
        </html>
    );
}


