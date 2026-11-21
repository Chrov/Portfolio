// Shared ECharts building blocks so every chart reads as one system.
import type { ChartTheme } from "@/lib/palette";

export const FONT = "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif";

export function base(ct: ChartTheme) {
  return {
    backgroundColor: "transparent",
    textStyle: { fontFamily: FONT, color: ct.text2 },
    grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: ct.surface,
      borderColor: ct.axis,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: ct.text, fontFamily: FONT, fontSize: 12 },
      extraCssText: "box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:8px;",
      axisPointer: { type: "line" as const, lineStyle: { color: ct.axis, width: 1 } },
      confine: true,
    },
  };
}

export function legend(ct: ChartTheme, extra: object = {}) {
  // Single-line scrolling legend: never wraps into the plot area on narrow screens.
  return { type: "scroll", top: 0, left: 0, right: 0, icon: "roundRect", itemWidth: 12, itemHeight: 4, itemGap: 14, textStyle: { color: ct.text2, fontSize: 12 },
    pageIconColor: ct.text2, pageIconInactiveColor: ct.axis, pageTextStyle: { color: ct.text3 }, ...extra };
}

export function valueAxis(ct: ChartTheme, fmt?: (v: number) => string, extra: object = {}) {
  return {
    type: "value" as const,
    axisLabel: { color: ct.text3, fontSize: 11, formatter: fmt },
    splitLine: { lineStyle: { color: ct.grid } },
    axisLine: { show: false }, axisTick: { show: false },
    nameTextStyle: { color: ct.text3, fontSize: 11 },
    ...extra,
  };
}

export function catAxis(ct: ChartTheme, data: string[], extra: object = {}) {
  return {
    type: "category" as const, data,
    axisLabel: { color: ct.text3, fontSize: 11 },
    axisLine: { lineStyle: { color: ct.axis } }, axisTick: { show: false },
    nameTextStyle: { color: ct.text3, fontSize: 11 },
    ...extra,
  };
}

/** Bars with a rounded data end anchored to the baseline. */
export function barStyle(color: string, horizontal = false) {
  return { color, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] };
}

export const tipRow = (color: string, name: string, value: string) =>
  `<div style="display:flex;gap:10px;justify-content:space-between;align-items:center;min-width:170px"><span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:${color};display:inline-block"></span>${escapeHtml(name)}</span><b style="font-variant-numeric:tabular-nums">${escapeHtml(value)}</b></div>`;
export const tipHead = (s: string) => `<div style="font-weight:600;margin-bottom:4px">${escapeHtml(s)}</div>`;
export const tipNote = (s: string) => `<div style="margin-top:4px;opacity:.7;font-size:11px">${escapeHtml(s)}</div>`;

export function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Confidence-interval whiskers. data rows: [categoryIndex, low, high]. */
export function errorBars(name: string, color: string, data: [number, number, number][], horizontal = false) {
  return {
    name, type: "custom" as const, data, z: 5, silent: true,
    encode: horizontal ? { x: [1, 2], y: 0 } : { x: 0, y: [1, 2] },
    renderItem: (_: any, api: any) => {
      const c = api.value(0);
      const lo = horizontal ? api.coord([api.value(1), c]) : api.coord([c, api.value(1)]);
      const hi = horizontal ? api.coord([api.value(2), c]) : api.coord([c, api.value(2)]);
      const st = { stroke: color, lineWidth: 1.5 };
      const cap = (p: number[]) => horizontal
        ? { type: "line", shape: { x1: p[0], y1: p[1] - 4, x2: p[0], y2: p[1] + 4 }, style: st }
        : { type: "line", shape: { x1: p[0] - 4, y1: p[1], x2: p[0] + 4, y2: p[1] }, style: st };
      return { type: "group", children: [{ type: "line", shape: { x1: lo[0], y1: lo[1], x2: hi[0], y2: hi[1] }, style: st }, cap(lo), cap(hi)] };
    },
  };
}

/** Index-based tooltip for axis charts (formatter receives the hovered data index). */
export function axisTip(ct: ReturnType<typeof import("@/lib/palette").chartTheme>, f: (i: number) => string, shadow = false) {
  return {
    ...base(ct).tooltip,
    ...(shadow ? { axisPointer: { type: "shadow" as const, shadowStyle: { color: ct.grid, opacity: 0.5 } } } : {}),
    formatter: (ps: any) => f((Array.isArray(ps) ? ps[0] : ps).dataIndex),
  };
}
