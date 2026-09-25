import type { Metadata } from "next";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";

export const metadata: Metadata = {
  title: "Employer Verification Dashboard",
  description: "Review and verify employment outcomes reported by trained learners.",
};

export default function EmployerDashboardPage() {
  return <EmployerDashboard />;
}
