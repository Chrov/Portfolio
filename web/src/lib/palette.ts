// Validated dataviz reference palette (light / dark steps of the same hues).
import type { Theme } from "./prefs";

export const CATEGORICAL = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"],
};
export const SEQ_BLUE = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
export const SEQ_BLUE_DARK = ["#1f2a37", "#184f95", "#1c5cab", "#256abf", "#3987e5", "#6da7ec", "#b7d3f6"];

export function chartTheme(theme: Theme) {
  const dark = theme === "dark";
  return {
    dark,
    series: CATEGORICAL[theme],
    surface: dark ? "#1a1a19" : "#fcfcfb",
    text: dark ? "#f0efec" : "#0b0b0b",
    text2: dark ? "#c3c2b7" : "#52514e",
    text3: dark ? "#9a988f" : "#6f6d67",
    grid: dark ? "#2e2e2b" : "#ebe9e4",
    axis: dark ? "#45443f" : "#cfccc3",
    neutral: dark ? "#5c5b55" : "#bdbab1",
    neutralSoft: dark ? "#383835" : "#e2e0da",
    seq: dark ? SEQ_BLUE_DARK : SEQ_BLUE,
    divNeg: dark ? "#3987e5" : "#2a78d6",
    divPos: dark ? "#e66767" : "#d03b3b",
    good: "#0ca30c",
    critical: "#d03b3b",
    band: dark ? "rgba(57,135,229,0.18)" : "rgba(42,120,214,0.14)",
  };
}
export type ChartTheme = ReturnType<typeof chartTheme>;
