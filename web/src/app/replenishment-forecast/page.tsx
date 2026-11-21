import type { Metadata } from "next";
import App from "@/features/cases/GroceryApp";

export const metadata: Metadata = {
  title: "Replenishment Forecast Lab",
  description: "Synthetic Favorita-style retail demand: dbt star schema, walk-forward backtest of LightGBM vs baselines and shadow-pilot rules.",
};

export default function Page() {
  return <App />;
}
