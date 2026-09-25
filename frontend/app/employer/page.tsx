import type { Metadata } from "next";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";

export const metadata: Metadata = {
  title: "Employer Verification Desk",
  description: "Confirm trainee employment outcomes and return structured skill feedback.",
};

export default function EmployerPage() {
  return <EmployerDashboard />;
}
