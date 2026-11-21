import type { Metadata } from "next";
import App from "@/features/cases/CopperApp";

export const metadata: Metadata = {
  title: "Copper Value Observatory",
  description: "Chilean copper 1976–2024 (COCHILCO): physical output vs export value, price and volume decomposition, USD/CLP display and price scenarios.",
};

export default function Page() {
  return <App />;
}
