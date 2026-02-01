import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/Providers";

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
                        <Sidebar />
                        <main className="flex-1 ml-20 md:ml-64 transition-all duration-300">
                            {children}
                        </main>
                    </div>
                    <Toaster position="top-right" richColors />
                </Providers>
            </body>
        </html>
    );
}


