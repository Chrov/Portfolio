import type { Metadata } from "next";
import AirlineApp from "@/features/cases/AirlineApp";

export const metadata: Metadata = {
  title: "Route Reliability Monitor",
  description: "US airline reliability, June 2023 (BTS): disruption rates by day, carrier, route and airport with Wilson intervals and a priority simulator.",
};

export default function Page() {
  return <AirlineApp />;
}
