"use client";
// Language + theme preferences, shared with the portfolio through the same
// localStorage keys ("lang", "theme") on the chrov.github.io origin.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";
export type Theme = "light" | "dark";
export type Bi = { es: string; en: string };
/** Display currency chosen by the viewer: the dataset's own, or a conversion. */
export type CurPref = "native" | "USD" | "CLP";

type Prefs = {
  lang: Lang;
  theme: Theme;
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
  t: (b: Bi | string) => string;
  cur: CurPref;
  setCur: (c: CurPref) => void;
};

const Ctx = createContext<Prefs | null>(null);

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* private mode: preference just isn't remembered */ }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");
  const [theme, setTheme] = useState<Theme>("light");
  const [cur, setCurState] = useState<CurPref>("native");

  useEffect(() => {
    const l = read("lang");
    if (l === "en" || l === "es") setLangState(l);
    const stored = read("theme");
    const th: Theme = stored === "dark" || stored === "light" ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(th);
    const c = read("currency");
    if (c === "USD" || c === "CLP" || c === "native") setCurState(c);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setLang = useCallback((l: Lang) => { setLangState(l); write("lang", l); }, []);
  const toggleTheme = useCallback(() => {
    setTheme((p) => { const n = p === "dark" ? "light" : "dark"; write("theme", n); return n; });
  }, []);
  const setCur = useCallback((c: CurPref) => { setCurState(c); write("currency", c); }, []);
  const t = useCallback((b: Bi | string) => (typeof b === "string" ? b : b[lang]), [lang]);

  return <Ctx.Provider value={{ lang, theme, setLang, toggleTheme, t, cur, setCur }}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePrefs must be used inside PrefsProvider");
  return c;
}

/** Inline bilingual literal: L("hola", "hello"). */
export const L = (es: string, en: string): Bi => ({ es, en });
