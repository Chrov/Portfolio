"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import { cn } from "./ui/cn";

export type Slide = { kicker: Bi; title: Bi; body: ReactNode };

export function PresentationMode({ open, onClose, slides, app }: { open: boolean; onClose: () => void; slides: Slide[]; app: string }) {
  const { t } = usePrefs();
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const go = useCallback((d: number) => setI((x) => Math.min(slides.length - 1, Math.max(0, x + d))), [slides.length]);

  useEffect(() => {
    if (!open) return;
    setI(0);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, go, onClose]);

  if (!open) return null;
  const s = slides[i];
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${app} — ${t(L("Modo presentación", "Presentation mode"))}`}
      className="fixed inset-0 z-50 flex flex-col bg-bg outline-none">
      <div className="flex items-center justify-between border-b border-line px-6 py-3 text-[13px] text-ink-3">
        <span className="font-medium text-ink">{app}</span>
        <span className="num">{i + 1} / {slides.length} · {t(L("← → para navegar, Esc para salir", "← → to navigate, Esc to exit"))}</span>
        <button type="button" onClick={onClose} className="rounded p-1.5 hover:bg-surface-2 cursor-pointer" aria-label={t(L("Salir", "Exit"))}><X className="h-5 w-5" /></button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <div key={i} className="animate-in w-full max-w-6xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">{t(s.kicker)}</p>
          <h2 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-[42px]">{t(s.title)}</h2>
          <div className="mt-8 text-lg leading-relaxed text-ink-2">{s.body}</div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line px-6 py-3">
        <button type="button" onClick={() => go(-1)} disabled={i === 0} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm hover:bg-surface-2 disabled:opacity-40 cursor-pointer">
          <ChevronLeft className="h-4 w-4" /> {t(L("Anterior", "Previous"))}
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`${k + 1}`}
              className={cn("h-2 rounded-full transition-all cursor-pointer", k === i ? "w-6 bg-ink" : "w-2 bg-line-strong")} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} disabled={i === slides.length - 1} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm hover:bg-surface-2 disabled:opacity-40 cursor-pointer">
          {t(L("Siguiente", "Next"))} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BigStat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="num text-4xl font-semibold tracking-tight text-ink md:text-5xl">{value}</p>
      <p className="mt-2 text-base text-ink-2">{label}</p>
      {note && <p className="mt-1 text-sm text-ink-3">{note}</p>}
    </div>
  );
}
