"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileBadge,
  GraduationCap,
  IndianRupee,
  MapPin,
  PencilLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OutcomeWizard } from "@/components/trainee/OutcomeWizard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataSourceIndicator } from "@/components/ui/DataSourceIndicator";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { demoTraineeProfile } from "@/lib/demo-data";
import type { DataSourceState, TraineeProfile } from "@/lib/types";
import { formatDate, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const journeySteps = [
  { label: "Enrolled", date: "Jun 2025", icon: GraduationCap },
  { label: "Training Completed", date: "Aug 2025", icon: BookIcon },
  { label: "Certified", date: "23 Aug 2025", icon: Award },
  { label: "Placed", date: "Aug 2025", icon: BriefcaseBusiness },
  { label: "Currently Employed", date: "Update required", icon: UserRoundCheck },
];

function BookIcon(props: React.ComponentProps<typeof GraduationCap>) {
  return <FileBadge {...props} />;
}

function JourneyStepper() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-navy-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-primary-600">Your journey</p>
          <h2 className="mt-1 text-base font-extrabold tracking-tight text-navy-900">From training to work</h2>
        </div>
        <Badge tone="blue" dot>5 milestones</Badge>
      </div>
      <div className="overflow-x-auto px-5 py-6 sm:px-6">
        <div className="relative flex min-w-[720px] items-start justify-between">
          <div className="absolute left-10 right-10 top-5 h-0.5 bg-navy-100" aria-hidden="true" />
          <div className="absolute left-10 top-5 h-0.5 w-[calc(75%-1.25rem)] bg-primary-600" aria-hidden="true" />
          {journeySteps.map((step, index) => {
            const current = index === journeySteps.length - 1;
            return (
              <div key={step.label} className="relative z-10 flex w-32 flex-col items-center text-center">
                <div
                  className={cn(
                    "grid size-10 place-items-center rounded-full border-4 border-white shadow-sm",
                    current ? "bg-warning-500 text-white ring-4 ring-warning-100" : "bg-primary-600 text-white",
                  )}
                >
                  {current ? <Clock3 className="size-4" /> : <Check className="size-4" />}
                </div>
                <p className={cn("mt-3 text-[11px] font-extrabold leading-4", current ? "text-warning-700" : "text-navy-800")}>{step.label}</p>
                <p className={cn("mt-1 text-[9px]", current ? "font-bold text-warning-600" : "text-navy-400")}>{step.date}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function SkillScore({ score }: { score: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative size-32 shrink-0" role="img" aria-label={`${score} percent skill relevance`}>
      <svg viewBox="0 0 112 112" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="9" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#0B7A75"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-extrabold tracking-[-0.05em] text-navy-900">{score}<span className="text-base">%</span></p>
          <p className="mt-0.5 text-[8px] font-extrabold uppercase tracking-wider text-primary-600">Skill match</p>
        </div>
      </div>
    </div>
  );
}

export function TraineeDashboard() {
  const router = useRouter();
  const { token, isDemoSession } = useAuth();
  const [profile, setProfile] = useState<TraineeProfile>(demoTraineeProfile);
  const [updateSubmitted, setUpdateSubmitted] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [dataSource, setDataSource] = useState<DataSourceState>({
    source: "demo",
    lastUpdated: demoTraineeProfile.updated_at,
    message: "Showing a complete local demonstration profile.",
  });

  useEffect(() => {
    try {
      setUpdateSubmitted(window.localStorage.getItem("skilltrace.trainee-update.v1") === "submitted");
    } catch {
      setUpdateSubmitted(false);
    }
  }, []);

  useEffect(() => {
    if (!token || isDemoSession || token.startsWith("demo-")) return;
    let active = true;
    api
      .getTraineeProfile(token)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setDataSource({ source: "live", lastUpdated: data.updated_at });
      })
      .catch(() => {
        if (active) {
          setDataSource({
            source: "demo",
            lastUpdated: demoTraineeProfile.updated_at,
            message: "The verification service is offline; the local demonstration profile remains available.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [token, isDemoSession]);

  const completeUpdate = (
    form: { status: string; organization?: string; role?: string; location?: string; start_date?: string; monthly_wage?: number },
    result: { update_id: string; submitted_at: string },
  ) => {
    setUpdateSubmitted(true);
    window.localStorage.setItem("skilltrace.trainee-update.v1", "submitted");
    setProfile((current) => {
      const next: TraineeProfile = {
        ...current,
        updated_at: result.submitted_at,
        activity: [
          {
            id: result.update_id,
            title: "Outcome update submitted",
            detail: "Your latest work status is waiting for authorised verification.",
            timestamp: result.submitted_at,
            type: "update",
          },
          ...current.activity,
        ],
      };
      if (form.status === "employed" || form.status === "apprenticeship") {
        next.employment = {
          type: form.status as "employed" | "apprenticeship",
          role: form.role ?? current.employment.role,
          employer: form.organization ?? current.employment.employer,
          location: form.location ?? current.employment.location,
          start_date: form.start_date ?? current.employment.start_date,
        };
        if (form.monthly_wage) next.current_wage = form.monthly_wage;
      } else {
        next.employment = { ...current.employment, type: form.status as TraineeProfile["employment"]["type"] };
      }
      return next;
    });
  };

  const wageGrowth = profile.starting_wage
    ? Math.round(((profile.current_wage - profile.starting_wage) / profile.starting_wage) * 100)
    : 0;

  return (
    <>
      <AppShell
        role="trainee"
        title="My Outcome Passport"
        subtitle="Skills, employment and progress—verified over time"
        headerActions={
          <div className="hidden items-center gap-3 md:flex">
            <DataSourceIndicator state={dataSource} />
            <Button onClick={() => router.push("/trainee/update")}><PencilLine className="size-4" /> Update status</Button>
          </div>
        }
      >
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary-600 text-sm font-extrabold text-white shadow-sm">
            {getInitials(profile.name)}
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary-600">Namaste, Rahul</p>
            <h1 className="mt-0.5 text-xl font-extrabold tracking-[-0.035em] text-navy-900 sm:text-2xl">{profile.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-navy-500">
              <span className="font-mono">{profile.internal_identifier}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {profile.district}, Maharashtra</span>
            </div>
          </div>
        </div>
        <Badge tone="green" className="w-fit" dot>Identity verified</Badge>
      </section>

      <section className={cn("mt-5 overflow-hidden rounded-2xl border p-4 shadow-card sm:p-5", updateSubmitted ? "border-success-200 bg-emerald-50" : "border-warning-200 bg-warning-50")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl", updateSubmitted ? "bg-success-600 text-white" : "bg-warning-500 text-navy-900")}>
            {updateSubmitted ? <CheckCircle2 className="size-5" /> : <Clock3 className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-navy-900">
                {updateSubmitted ? "Employment status updated" : "Status update required"}
              </h2>
              {!updateSubmitted && <Badge tone="amber">Due today</Badge>}
            </div>
            <p className="mt-1 text-xs leading-5 text-navy-600">
              {updateSubmitted
                ? "Thank you. Your latest work status has been added to the verification journey."
                : "Is your current role or employment status still up to date? It takes less than 30 seconds."}
            </p>
          </div>
          {!updateSubmitted && (
            <Button onClick={() => router.push("/trainee/update")}>
              Update employment status <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </section>

      <div className="mt-5">
        <JourneyStepper />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.65fr)]">
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="relative overflow-hidden bg-navy-900 px-5 py-5 text-white sm:px-6">
              <div className="dark-grid absolute inset-0 opacity-35" />
              <div className="absolute -right-16 -top-24 size-64 rounded-full border border-primary-400/10" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-600 text-white">
                    <FileBadge className="size-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/40">Digital Outcome Passport</p>
                    <p className="mt-1 font-mono text-[10px] text-primary-300">{profile.passport_id}</p>
                  </div>
                </div>
                <Badge className="bg-success-500/15 text-success-500 ring-success-500/20" dot>Outcome confidence: High</Badge>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-navy-400">Certified course</p>
                  <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-navy-900">{profile.course}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="blue"><GraduationCap className="size-3" /> {profile.training_hours} training hours</Badge>
                    <Badge tone="neutral">NSQF Level 3</Badge>
                    <Badge tone="green"><BadgeCheck className="size-3" /> Certificate verified</Badge>
                  </div>
                </div>
                <div className="rounded-xl bg-soft-slate px-4 py-3 sm:text-right">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-navy-400">Certification date</p>
                  <p className="mt-1 text-sm font-extrabold text-navy-900">{formatDate(profile.certificate.issued_at)}</p>
                </div>
              </div>

              <div className="my-6 h-px bg-navy-100" />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-navy-100 bg-soft-slate p-4 sm:col-span-2 lg:col-span-1">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">Current placement</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-lg bg-success-50 text-success-600"><BriefcaseBusiness className="size-4" /></div>
                    <div>
                      <p className="text-sm font-extrabold text-navy-900">{profile.employment.role}</p>
                      <p className="mt-0.5 text-[10px] text-navy-500">{profile.employment.employer}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-navy-200/70 pt-3 text-[10px] text-navy-500">
                    <span className="inline-flex items-center gap-1"><Building2 className="size-3" /> {profile.employment.location}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> Since {formatDate(profile.employment.start_date, { month: "short", year: "numeric" })}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-navy-100 p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">Wage progression</p>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-2xl font-extrabold tracking-tight text-navy-900">₹{profile.current_wage.toLocaleString("en-IN")}</p>
                    <span className="mb-1 inline-flex items-center gap-0.5 text-[10px] font-extrabold text-success-600"><TrendingUp className="size-3" /> {wageGrowth}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-navy-400">
                    <span>Start ₹{profile.starting_wage.toLocaleString("en-IN")}</span><span>Current</span>
                  </div>
                  <div className="mt-3 flex h-1.5 gap-1 overflow-hidden rounded-full bg-navy-100">
                    <div className="w-[73%] rounded-full bg-primary-500" />
                  </div>
                </div>

                <div className="rounded-xl border border-navy-100 p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">Outcome confidence</p>
                  <div className="mt-3 flex items-center gap-3">
                    <ShieldCheck className="size-7 text-success-600" />
                    <div>
                      <p className="text-sm font-extrabold text-navy-900">{profile.confidence.label}</p>
                      <p className="mt-0.5 text-[10px] text-navy-400">{profile.confidence.score}% confidence · {profile.risk.level} risk</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-navy-100"><div className="h-full rounded-full bg-success-500" style={{ width: `${profile.confidence.score}%` }} /></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <SkillScore score={profile.skill_relevance.score} />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">Skill relevance</p>
                <h3 className="mt-1 text-lg font-extrabold tracking-tight text-navy-900">Your training matches this role</h3>
                <p className="mt-2 text-xs leading-6 text-navy-500">Matched from your verified training evidence and skills reported for the current job.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.skill_relevance.matched_skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-[10px] font-bold text-primary-700">
                      <Check className="size-3" /> {skill}
                    </span>
                  ))}
                  <span className="rounded-lg border border-dashed border-navy-200 px-2.5 py-1.5 text-[10px] font-semibold text-navy-400">+ Preventive Maintenance</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-primary-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary-600 text-white"><CalendarCheck2 className="size-5" /></div>
                <Badge tone="green">Strong</Badge>
              </div>
              <h3 className="mt-5 text-base font-extrabold tracking-tight text-navy-900">Retention milestones</h3>
              <p className="mt-1 text-xs leading-5 text-navy-500">Employment confirmed with your employer.</p>
            </div>
            <div className="space-y-3 p-5">
              {[
                ["3M", "Completed", "Nov 2025"],
                ["6M", "Completed", "Feb 2026"],
                ["12M", "Completed", "Aug 2026"],
              ].map(([period, label, date]) => (
                <div key={period} className="flex items-center gap-3 rounded-xl border border-navy-100 p-3">
                  <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-success-600"><Check className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-navy-900">{period} retention</p>
                    <p className="mt-0.5 text-[9px] text-navy-400">{label} · {date}</p>
                  </div>
                  <Badge tone="green">✓</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-warning-50 text-warning-700"><Sparkles className="size-5" /></div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-warning-700">30-second update</p>
                <h3 className="mt-0.5 text-sm font-extrabold text-navy-900">Keep your passport current</h3>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-navy-500">New job, raise, apprenticeship or business? Share only what you choose.</p>
            <Button onClick={() => router.push("/trainee/update")} className="mt-5 w-full">
              Update employment status <ArrowRight className="size-4" />
            </Button>
          </Card>

          <Card id="privacy" className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-success-600"><ShieldCheck className="size-4" /></div>
              <div>
                <h3 className="text-xs font-extrabold text-navy-900">You control your data</h3>
                <p className="mt-1.5 text-[10px] leading-5 text-navy-500">Employment details are shared only for consented verification. You can review or withdraw consent at any time.</p>
                <button type="button" className="mt-3 text-[10px] font-extrabold text-primary-600 hover:underline">Review privacy settings</button>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <section className="mt-5" aria-labelledby="recent-activity-title">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">Evidence timeline</p>
              <h2 id="recent-activity-title" className="mt-1 text-base font-extrabold text-navy-900">Recent passport activity</h2>
            </div>
            <Badge tone="neutral">Consent trail</Badge>
          </div>
          <div className="grid divide-y divide-navy-100 md:grid-cols-3 md:divide-x md:divide-y-0">
            {profile.activity.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-5">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
                  {activity.type === "verified" ? <UserRoundCheck className="size-4" /> : activity.type === "credential" ? <Award className="size-4" /> : <IndianRupee className="size-4" />}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-navy-900">{activity.title}</p>
                  <p className="mt-1 text-[10px] leading-5 text-navy-500">{activity.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        </section>
      </AppShell>
      <OutcomeWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={completeUpdate}
      />
    </>
  );
}
