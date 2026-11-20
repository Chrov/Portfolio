"use client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { L, usePrefs } from "@/lib/prefs";
import { Button } from "./ui/button";

export function Loading({ what }: { what: string }) {
  const { t } = usePrefs();
  return (
    <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-ink-2">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <p className="text-sm">{t(L("Cargando", "Loading"))} {what}…</p>
      <div className="mt-4 grid w-full max-w-4xl grid-cols-2 gap-3 px-4 md:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />)}
      </div>
    </div>
  );
}

export function LoadError({ error, dataset }: { error: string; dataset: string }) {
  const { t } = usePrefs();
  return (
    <div role="alert" className="mx-auto mt-24 max-w-lg rounded-xl border border-line bg-surface p-6 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-bad" aria-hidden />
      <h2 className="mt-2 font-semibold">{t(L("No se pudieron cargar los datos", "The data could not be loaded"))}</h2>
      <p className="mt-1 break-words font-mono text-xs text-ink-3">{error}</p>
      <p className="mt-3 text-sm text-ink-2">
        {t(L("No se muestran cifras de reemplazo. Reintenta o revisa que el pipeline haya generado el archivo.",
          "No placeholder figures are shown. Retry, or check that the pipeline generated the file."))}
      </p>
      <Button className="mt-4" onClick={() => window.dispatchEvent(new Event(`retry-${dataset}`))}>{t(L("Reintentar", "Retry"))}</Button>
    </div>
  );
}
