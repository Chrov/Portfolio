import type { Metadata } from "next";
import App from "@/features/cases/MarketApp";

export const metadata: Metadata = {
  title: "Waste & Margin Control",
  description: "Synthetic market-stall batches in CLP: revenue, gross margin, waste at cost by category, season and supplier, with USD/CLP display and a waste-reduction simulator.",
};

export default function Page() {
  return <App />;
}
