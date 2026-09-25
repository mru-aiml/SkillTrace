import type { Metadata } from "next";
import { OutcomeUpdateWizard } from "@/components/trainee/OutcomeUpdateWizard";

export const metadata: Metadata = {
  title: "Update Employment Status",
  description: "Share a quick, consent-based employment outcome update.",
};

export default function TraineeUpdatePage() {
  return <OutcomeUpdateWizard />;
}
