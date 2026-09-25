"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  FileBadge,
  Home,
  LayoutDashboard,
  LockKeyhole,
  MessageCircleQuestion,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Brand } from "@/components/ui/Brand";
import { useAuth } from "@/lib/auth";
import { demoUsers } from "@/lib/demo-data";
import type { UserRole } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: typeof Home };

const roleConfig: Record<
  UserRole,
  {
    label: string;
    workspace: string;
    title: string;
    path: string;
    icon: typeof FileBadge;
    sidebar: NavItem[];
    mobile: NavItem[];
  }
> = {
  trainee: {
    label: "Trainee",
    workspace: "My learning journey",
    title: "Trainee Portal",
    path: "/trainee",
    icon: FileBadge,
    sidebar: [
      { label: "Outcome Passport", href: "/trainee/dashboard", icon: Home },
      { label: "Update employment", href: "/trainee/update", icon: BriefcaseBusiness },
      { label: "Privacy & consent", href: "/trainee/dashboard#privacy", icon: LockKeyhole },
    ],
    mobile: [
      { label: "Home", href: "/trainee/dashboard", icon: Home },
      { label: "Update", href: "/trainee/update", icon: BriefcaseBusiness },
      { label: "Privacy", href: "/trainee/dashboard#privacy", icon: ShieldCheck },
      { label: "Help", href: "/trainee/dashboard#help", icon: CircleHelp },
    ],
  },
  employer: {
    label: "Employer",
    workspace: "ABC Manufacturing",
    title: "Employer Portal",
    path: "/employer",
    icon: ShieldCheck,
    sidebar: [
      { label: "Verification queue", href: "/employer/dashboard", icon: LayoutDashboard },
      { label: "Review request", href: "/employer/verify/VER-1002", icon: ShieldCheck },
      { label: "Verification guide", href: "/employer/dashboard#guide", icon: MessageCircleQuestion },
    ],
    mobile: [
      { label: "Queue", href: "/employer/dashboard", icon: LayoutDashboard },
      { label: "Review", href: "/employer/verify/VER-1002", icon: ShieldCheck },
      { label: "Guide", href: "/employer/dashboard#guide", icon: MessageCircleQuestion },
    ],
  },
  admin: {
    label: "Government Admin",
    workspace: "Maharashtra Skilling",
    title: "Government Dashboard",
    path: "/dashboard",
    icon: BarChart3,
    sidebar: [
      { label: "Outcome overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "District outcomes", href: "/dashboard#districts", icon: UsersRound },
      { label: "Policy insights", href: "/dashboard#insights", icon: CheckCircle2 },
    ],
    mobile: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Districts", href: "/dashboard#districts", icon: UsersRound },
      { label: "Insights", href: "/dashboard#insights", icon: CheckCircle2 },
    ],
  },
};

const demoLinks: Array<{ role: UserRole; label: string; href: string }> = [
  { role: "trainee", label: "Trainee", href: "/trainee" },
  { role: "employer", label: "Employer", href: "/employer" },
  { role: "admin", label: "Government Admin", href: "/dashboard" },
];

export function isNavigationActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  const cleanHref = href.split("#")[0];
  if (cleanHref === "/dashboard" || cleanHref === "/trainee" || cleanHref === "/employer") {
    return pathname === cleanHref;
  }
  return pathname.startsWith(cleanHref);
}

export interface AppShellProps {
  role: UserRole;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  flush?: boolean;
  maxWidth?: "default" | "narrow";
}

export function AppShell({
  role,
  title,
  subtitle,
  children,
  headerActions,
  flush = false,
  maxWidth = "default",
}: AppShellProps) {
  const pathname = usePathname();
  const config = roleConfig[role];
  const { user } = useAuth();
  const profile = user ?? demoUsers[role];

  return (
    <div className="min-h-screen bg-soft-slate text-navy-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-navy-900 focus:shadow-lift">
        Skip to content
      </a>

      <div className="bg-navy-900 text-white">
        <div className="mx-auto flex h-9 max-w-[1600px] items-center gap-3 overflow-x-auto px-3 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
            <span className="size-1.5 animate-pulse rounded-full bg-success-500" /> Demo workspace
          </div>
          <div className="flex min-w-max items-center gap-1">
            {demoLinks.map((item) => {
              const active = item.role === role;
              return (
                <Link key={item.role} href={item.href} className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold transition", active ? "bg-primary-600 text-white" : "text-white/55 hover:bg-white/10 hover:text-white")} aria-current={active ? "page" : undefined}>
                  Demo as {item.label}
                </Link>
              );
            })}
          </div>
          <span className="ml-auto hidden shrink-0 text-[10px] text-white/35 md:block">Synthetic data · no backend required</span>
        </div>
      </div>

      <aside className="fixed inset-y-9 left-0 z-40 hidden w-[256px] flex-col overflow-hidden bg-navy-900 text-white lg:flex">
        <div className="dark-grid absolute inset-0 opacity-30" />
        <div className="absolute -left-24 top-32 size-64 rounded-full bg-primary-600/15 blur-3xl" />
        <div className="relative flex h-full flex-col">
          <div className="flex h-[76px] items-center border-b border-white/10 px-5"><Brand inverse href="/" /></div>
          <div className="px-4 pt-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-primary-600 text-white"><config.icon className="size-[18px]" /></div>
                <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{config.workspace}</p><p className="mt-0.5 text-[10px] text-white/40">{config.label} workspace</p></div>
              </div>
            </div>
          </div>

          <nav className="px-4 pt-6" aria-label={`${config.label} navigation`}>
            <p className="px-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/35">Workspace</p>
            <div className="mt-2 space-y-1">
              {config.sidebar.map((item) => {
                const active = isNavigationActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition", active ? "bg-white text-navy-900 shadow-sm" : "text-white/55 hover:bg-white/[0.07] hover:text-white")} aria-current={active ? "page" : undefined}>
                    <item.icon className={cn("size-[17px]", active ? "text-primary-600" : "text-white/40")} />{item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-7 px-4">
            <p className="px-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/35">Switch demo role</p>
            <div className="mt-2 space-y-1">
              {demoLinks.map((item) => (
                <Link key={item.role} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[11px] font-semibold transition", item.role === role ? "bg-primary-500/15 text-primary-200" : "text-white/45 hover:bg-white/[0.06] hover:text-white")}>
                  <span className={cn("size-1.5 rounded-full", item.role === role ? "bg-primary-400" : "bg-white/20")} />{item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4">
            <div className="mb-3 rounded-xl border border-success-500/20 bg-success-500/10 p-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-success-200"><CheckCircle2 className="size-3.5" /> Demo data active</div>
              <p className="mt-1 text-[10px] leading-4 text-white/40">Actions are saved locally for this prototype.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-600 text-[10px] font-extrabold text-white">{getInitials(profile.name)}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{profile.name}</p><p className="truncate text-[10px] text-white/40">{config.label} demo</p></div>
              <UserRound className="size-4 text-white/30" />
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[256px]">
        <header className="sticky top-0 z-30 border-b border-navy-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden"><Brand compact /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-extrabold tracking-[-0.025em] text-navy-900 sm:text-lg">{title ?? config.title}</h1>
                <span className="hidden rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary-700 sm:inline-flex">Live demo</span>
              </div>
              {subtitle && <p className="mt-0.5 hidden truncate text-[11px] text-navy-500 sm:block">{subtitle}</p>}
            </div>
            {headerActions}
            <button type="button" className="relative hidden size-10 place-items-center rounded-xl border border-navy-200 bg-white text-navy-500 transition hover:border-primary-200 hover:text-primary-600 sm:grid" aria-label="Notifications, 3 unread">
              <Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-warning-500 ring-2 ring-white" />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-navy-200 bg-white py-1.5 pl-2 pr-3 sm:flex">
              <span className="grid size-7 place-items-center rounded-lg bg-primary-50 text-[9px] font-extrabold text-primary-700">{getInitials(profile.name)}</span>
              <span className="max-w-28 truncate text-[11px] font-bold text-navy-700">{profile.name}</span>
            </div>
          </div>
        </header>

        <main id="main-content" className={cn("mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8", maxWidth === "narrow" ? "max-w-5xl" : "max-w-[1600px]", !flush && "pb-28 lg:pb-10")}>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-navy-900/95 p-1.5 text-white shadow-panel backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {config.mobile.map((item) => {
          const active = isNavigationActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[9px] font-bold transition", active ? "bg-white text-navy-900" : "text-white/50 hover:bg-white/10 hover:text-white")} aria-current={active ? "page" : undefined}>
              <item.icon className={cn("size-4", active ? "text-primary-600" : "text-white/45")} />{item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
