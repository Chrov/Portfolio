import type { Metadata } from "next";
import RevenueApp from "@/features/revenue/RevenueApp";

export const metadata: Metadata = {
  title: "Revenue Intelligence",
  description: "Commercial intelligence on the Olist public e-commerce dataset: KPIs, trends, categories, RFM, forecasting and scenarios.",
};

export default function Page() {
  return <RevenueApp />;
}
