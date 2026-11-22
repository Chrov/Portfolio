import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { PrefsProvider } from "@/lib/prefs";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const metadata: Metadata = {
  title: { default: "Casos interactivos — Camilo Vergara Salas", template: "%s — Camilo Vergara Salas" },
  description: "Eight interactive analytics case studies: dashboards, models, simulators and documented methodology.",
  // Same icon as the portfolio so every tab opened from it keeps one identity.
  icons: {
    icon: [{ url: `${BASE}/favicon.svg`, type: "image/svg+xml" }, { url: `${BASE}/favicon-32.png`, sizes: "32x32", type: "image/png" }],
    apple: `${BASE}/apple-touch-icon.png`,
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Applies the saved theme before first paint (same localStorage key as the portfolio) and keeps
// skipped cross-document view transitions from surfacing as unhandled promise rejections.
const themeScript = `var h=function(e){var v=e.viewTransition;if(v){[v.ready,v.finished,v.updateCallbackDone].forEach(function(p){p&&p.catch(function(){})})}};addEventListener("pagereveal",h);addEventListener("pageswap",h);try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t;var l=localStorage.getItem("lang");if(l==="en"||l==="es")document.documentElement.lang=l}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
        <PrefsProvider>{children}</PrefsProvider>
      </body>
    </html>
  );
}
