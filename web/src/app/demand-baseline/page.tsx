import type { Metadata } from "next";
import App from "@/features/cases/FeriaApp";

export const metadata: Metadata = {
  title: "Demand Baseline Planner",
  description: "Synthetic daily demand for 128 products: ABC classes, weekday profile, rolling-origin backtest and a stock-buffer simulator.",
};

export default function Page() {
  return <App />;
}
