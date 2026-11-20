import type { Metadata } from "next";
import TalentApp from "@/features/talentrisk/TalentApp";

export const metadata: Metadata = {
  title: "TalentRisk AI",
  description: "Responsible people analytics on IBM's fictional HR attrition dataset: associations, calibrated models, SHAP, fairness audit and scenario tools.",
};

export default function Page() {
  return <TalentApp />;
}
