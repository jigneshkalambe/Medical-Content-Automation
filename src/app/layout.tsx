import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500"],
    display: "swap",
    preload: true,
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "Video Generation Automation",
    description: "AI Video Generation and Text to Speech suite",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${inter.className} h-full antialiased dark`}>
            <body className="min-h-full flex flex-col">
                {children}
                <Toaster position="bottom-right" richColors theme="dark" closeButton />
            </body>
        </html>
    );
}
