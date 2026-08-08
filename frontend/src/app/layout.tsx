import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FairLine — Intelligent Expense Triage",
  description: "Automated expense discrepancy triaging and compliance engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
        {/* Modern Header Navigation */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/submit" className="flex items-center gap-2 group text-decoration-none">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                  <span className="font-extrabold text-white text-sm">FL</span>
                </div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  FairLine
                </span>
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/submit"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
                >
                  Submit Claim
                </Link>
                <Link
                  href="/approver"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
                >
                  Approver Queue
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Connection
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/50 py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} FairLine. Powered by Google Gemini 3.5 Flash. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
