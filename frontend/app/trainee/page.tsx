import type { Metadata } from "next";
import { TraineeDashboard } from "@/components/trainee/TraineeDashboard";

export const metadata: Metadata = {
  title: "Trainee Outcome Passport",
  description: "Track verified skills, employment, wages and learning progress.",
};

export default function TraineePage() {
  return <TraineeDashboard />;
}
