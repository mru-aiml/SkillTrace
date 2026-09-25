import type { Metadata } from "next";
import { LoginExperience } from "@/components/auth/LoginExperience";
import type { UserRole } from "@/lib/types";

export const metadata: Metadata = {
  title: "Role Access",
  description: "Enter the SkillTrace trainee, employer or government demonstration workspace.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole: UserRole = role === "employer" || role === "admin" ? role : "trainee";
  return <LoginExperience initialRole={initialRole} />;
}
