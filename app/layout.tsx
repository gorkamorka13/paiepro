// Replaced Google Fonts with system font stack due to network timeouts during build
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";

export const metadata: Metadata = {
    title: "Payslip Analyzer AI",
    description: "Analysez vos bulletins de paie avec l'intelligence artificielle",
    icons: {
        icon: "/paiepro.png",
        apple: "/paiepro.png",
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <body
                className="antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                style={{
                    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    '--font-geist-sans': "Inter, -apple-system, sans-serif",
                    '--font-geist-mono': "'JetBrains Mono', monospace"
                } as React.CSSProperties}
            >
                <Providers>
                    <AuthProvider>
                        <AuthGuard>
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
                        </AuthGuard>
                    </AuthProvider>
                    <Toaster position="top-right" richColors />
                </Providers>
            </body>
        </html>
    );
}


