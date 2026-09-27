import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/AccessControl";
import { OutcomeUpdateWizard } from "@/components/trainee/OutcomeUpdateWizard";

export const metadata: Metadata = {
  title: "Update Employment Status",
  description: "Share a quick, consent-based employment outcome update.",
};

export default function TraineeUpdatePage() {
  return (
    <>
      <RoleGuard role="trainee" />
      <OutcomeUpdateWizard />
    </>
  );
}
