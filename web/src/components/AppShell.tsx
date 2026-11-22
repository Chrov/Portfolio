"use client";
import { ArrowLeft, Moon, Presentation, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { FxKey } from "@/lib/money";
import { CurrencyToggle } from "./Money";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";

export type NavItem = { id: string; label: Bi };

export function PrefToggles() {
  const { lang, setLang, theme, toggleTheme, t } = usePrefs();
  return (
    <div className="flex items-center gap-1.5">
      <div className="inline-flex rounded-md border border-line p-0.5" role="group" aria-label={t(L("Idioma", "Language"))}>
        {(["es", "en"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
            className={cn("h-7 rounded-[5px] px-2 text-[12px] font-semibold uppercase cursor-pointer", lang === l ? "bg-ink text-surface" : "text-ink-3 hover:text-ink")}>
            {l}
          </button>
        ))}
      </div>
      <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label={t(theme === "dark" ? L("Usar modo claro", "Use light mode") : L("Usar modo oscuro", "Use dark mode"))}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  );
}

/** Same monogram as the portfolio favicon, so every tab reads as one site. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#b3261e] font-sans text-[11px] font-bold tracking-tight text-[#fbfaf7]", className)}>CV</span>
  );
}

export function AppShell({ app, tagline, nav, onPresent, filterBar, currency, children }: {
  app: string; tagline: Bi; nav: NavItem[]; onPresent: () => void; filterBar?: ReactNode; currency?: FxKey; children: ReactNode;
}) {
  const { t } = usePrefs();
  const [active, setActive] = useState(nav[0]?.id);
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useEffect(() => {
    const els = nav.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: "-140px 0px -55% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [nav]);

  return (
    <div className="min-h-screen">
      <header className="relative z-30 border-b border-line bg-surface/75 backdrop-blur-xl backdrop-saturate-150 md:sticky md:top-0">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4">
          <a href={`${base.replace(/\/apps$/, "")}/#cases`} className="inline-flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink" aria-label={t(L("Volver al portafolio", "Back to the portfolio"))}>
            <ArrowLeft className="h-4 w-4" /> <BrandMark /> <span className="hidden xl:inline">{t(L("Portafolio", "Portfolio"))}</span>
          </a>
          <span className="h-5 w-px bg-line" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">{app}</p>
            <p className="hidden truncate text-[11.5px] text-ink-3 sm:block">{t(tagline)}</p>
          </div>
          <a href={`${base}/`} className="hidden text-[13px] text-ink-3 hover:text-ink lg:inline">{t(L("Todos los casos", "All cases"))}</a>
          {currency && <CurrencyToggle fxKey={currency} />}
          <Button size="sm" variant="default" onClick={onPresent}>
            <Presentation className="h-4 w-4" /> <span className="hidden md:inline">{t(L("Modo presentación", "Presentation mode"))}</span>
          </Button>
          <PrefToggles />
        </div>
        <nav aria-label={t(L("Secciones", "Sections"))} className="border-t border-line lg:hidden">
          <ul className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-3 py-1.5 text-[12.5px]">
            {nav.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className={cn("block whitespace-nowrap rounded px-2 py-1", active === n.id ? "bg-surface-2 font-medium text-ink" : "text-ink-3")}>{t(n.label)}</a>
              </li>
            ))}
          </ul>
        </nav>
        {filterBar}
      </header>
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4">
        <aside className="sticky top-[132px] hidden h-[calc(100vh-148px)] w-52 shrink-0 overflow-y-auto py-6 lg:block">
          <nav aria-label={t(L("Secciones", "Sections"))}>
            <ol className="space-y-0.5 text-[13px]">
              {nav.map((n, i) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined}
                    className={cn("flex gap-2 rounded-md px-2.5 py-1.5 transition-colors", active === n.id ? "border border-line bg-surface font-medium text-ink shadow-card" : "border border-transparent text-ink-3 hover:text-ink")}>
                    <span className="num w-4 font-mono text-[11px] leading-5 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    {t(n.label)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <main id="main" className="min-w-0 flex-1 pb-24 pt-6">{children}</main>
      </div>
    </div>
  );
}

export function Section({ id, n, title, intro, children, className }: { id: string; n: number; title: Bi; intro?: Bi; children: ReactNode; className?: string }) {
  const { t } = usePrefs();
  return (
    <section id={id} className={cn("scroll-mt-4 pt-10 first:pt-0 md:scroll-mt-36", className)} aria-labelledby={`${id}-h`}>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="num font-mono text-[12px] text-ink-3">{String(n).padStart(2, "0")}</span>
        <div>
          <h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight">{t(title)}</h2>
          {intro && <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-ink-2">{t(intro)}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
