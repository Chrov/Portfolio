"use client";
import { useEffect, useState } from "react";

export type Load<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };

const cache = new Map<string, Promise<unknown>>();

export function dataUrl(name: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/${name}.json?v=${process.env.NEXT_PUBLIC_DATA_VERSION ?? "dev"}`;
}

/** Fetch a pipeline JSON once per page view, surfacing errors instead of failing silently. */
export function useDataset<T>(name: string, validate: (d: unknown) => d is T): Load<T> {
  const [state, setState] = useState<Load<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const url = dataUrl(name);
    if (!cache.has(url) || attempt > 0) {
      cache.set(url, fetch(url).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} — ${url}`);
        return r.json();
      }));
    }
    cache.get(url)!
      .then((d) => {
        if (!alive) return;
        if (!validate(d)) throw new Error(`${name}.json has an unexpected structure`);
        setState({ status: "ready", data: d });
      })
      .catch((e: Error) => { cache.delete(url); if (alive) setState({ status: "error", error: e.message }); });
    return () => { alive = false; };
  }, [name, validate, attempt]);
  // expose retry through a custom event to keep the hook signature simple
  useEffect(() => {
    const h = () => { setState({ status: "loading" }); setAttempt((a) => a + 1); };
    window.addEventListener(`retry-${name}`, h);
    return () => window.removeEventListener(`retry-${name}`, h);
  }, [name]);
  return state;
}
