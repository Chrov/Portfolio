import type { Metadata } from "next";
import App from "@/features/cases/BankApp";

export const metadata: Metadata = {
  title: "Campaign Drift Audit",
  description: "Chronological audit of a bank marketing propensity model (UCI Bank Marketing): base-rate drift, deciles, calibration and call-capacity simulation.",
};

export default function Page() {
  return <App />;
}
