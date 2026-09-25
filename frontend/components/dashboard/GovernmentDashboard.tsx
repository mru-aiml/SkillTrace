"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  IndianRupee,
  Lightbulb,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AttritionDonut, FunnelChart, OutcomeTrendChart, SkillGapBars } from "@/components/charts/ClientCharts";
import { DistrictMap } from "@/components/dashboard/DistrictMap";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataSourceIndicator } from "@/components/ui/DataSourceIndicator";
import { StatCard } from "@/components/ui/StatCard";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { demoDashboardData, formatIndianNumber } from "@/lib/demo-data";
import type { DataSourceState } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

function ChartTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="group mt-3 border-t border-navy-100 pt-3">
      <summary className="cursor-pointer list-none text-[10px] font-extrabold text-primary-600">View accessible data table</summary>
      <div className="mt-3 overflow-x-auto rounded-lg border border-navy-100">
        <table className="w-full border-collapse text-left text-[9px]">
          <thead className="bg-soft-slate text-navy-400">
            <tr>{headers.map((header) => <th key={header} className="px-2.5 py-2 font-extrabold">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-navy-100 text-navy-600">
            {rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell} className="px-2.5 py-2 font-bold">{value}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function GovernmentDashboard() {
  const { token, isDemoSession } = useAuth();
  const [data, setData] = useState(demoDashboardData);
  const [districtId, setDistrictId] = useState("all");
  const [skillSector, setSkillSector] = useState(data["skill-gaps"].sectors[0].sector);
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2026-09-25");
  const [period, setPeriod] = useState("Last 12 months");
  const [dataSource, setDataSource] = useState<DataSourceState>({
    source: "demo",
    lastUpdated: data.overview.updated_at,
    message: "Complete illustrative state dataset is active while the backend is offline.",
  });

  useEffect(() => {
    if (!token || isDemoSession || token.startsWith("demo-")) return;
    let active = true;
    api
      .getDashboard({ district: districtId === "all" ? undefined : districtId, period: period === "Last 6 months" ? "6m" : period === "Last 12 months" ? "12m" : undefined }, token)
      .then((response) => {
        if (!active) return;
        setData(response);
        setDataSource({ source: "live", lastUpdated: response.overview.updated_at });
        setSkillSector((current) => response["skill-gaps"].sectors.some((item) => item.sector === current) ? current : response["skill-gaps"].sectors[0]?.sector ?? "");
      })
      .catch(() => {
        if (active) {
          setDataSource({
            source: "demo",
            lastUpdated: demoDashboardData.overview.updated_at,
            message: "Live analytics service is unavailable; complete illustrative data remains active.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [districtId, period, token, isDemoSession]);

  const selectedDistrict = districtId === "all" ? null : data.districts.find((district) => district.id === districtId) ?? null;
  const activeDistrict = selectedDistrict ?? data.districts.find((district) => district.id === "pune") ?? data.districts[0];
  const kpis = useMemo(() => {
    if (!selectedDistrict) {
      return {
        trained: data.overview.total_trained,
        placed: data.overview.total_placed,
        employed: dataSource.source === "live"
          ? Math.round(data.overview.total_placed * (data.overview.employed_rate / 100))
          : 72114,
        employedRate: data.overview.employed_rate,
        retention: data.overview.retention_6m_rate,
        wage: data.overview.median_monthly_wage ?? 18500,
      };
    }
    return {
      trained: selectedDistrict.trained,
      placed: selectedDistrict.placed,
      employed: Math.round(selectedDistrict.placed * (selectedDistrict.employed_rate / 100)),
      employedRate: selectedDistrict.employed_rate,
      retention: selectedDistrict.retention_6m_rate,
      wage: selectedDistrict.median_wage ?? 0,
    };
  }, [data.overview, dataSource.source, selectedDistrict]);
  const sector = data["skill-gaps"].sectors.find((item) => item.sector === skillSector) ?? data["skill-gaps"].sectors[0];
  const largestGap = sector?.skills.reduce((largest, skill) => (skill.gap > largest.gap ? skill : largest), sector.skills[0]);

  const exportReport = () => {
    const headings = ["District", "Trained", "Placed", "Employment Rate", "6M Retention", "Self Employment", "Median Wage"];
    const rows = data.districts.map((district) => [district.name, district.trained, district.placed, `${district.employed_rate}%`, `${district.retention_6m_rate}%`, `${district.self_employment_rate}%`, district.median_wage]);
    const csv = [headings, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "skilltrace-maharashtra-outcome-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AppShell
        role="admin"
        title="Government & Administrator Dashboard"
        subtitle="Maharashtra skill outcomes and policy intelligence"
        headerActions={
          <div className="hidden items-center gap-3 lg:flex">
            <DataSourceIndicator state={dataSource} />
            <Button onClick={exportReport}><ArrowDownToLine className="size-4" /> Export report</Button>
          </div>
        }
      >
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue" dot>Maharashtra</Badge>
            <Badge tone="neutral">Decision support prototype</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.04em] text-navy-900 sm:text-3xl">Outcome intelligence for every district.</h1>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-navy-500 sm:text-sm">Track how training becomes placement, retention and wage growth—and use skill-gap signals to improve the next cohort.</p>
        </div>
        <Button onClick={exportReport} className="w-fit xl:hidden"><ArrowDownToLine className="size-4" /> Export report</Button>
      </section>

      <Card className="mt-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><CalendarRange className="size-5" /></div>
            <div>
              <h2 className="text-sm font-extrabold text-navy-900">Outcome scope</h2>
              <p className="mt-0.5 text-[10px] text-navy-400">Filter the dashboard by geography, period or course.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[720px]">
            <label>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">District</span>
              <select value={districtId} onChange={(event) => setDistrictId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-bold text-navy-800 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10">
                <option value="all">All Maharashtra</option>
                {data.districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
              </select>
            </label>
            <label>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">Period</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-bold text-navy-800 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10">
                <option>Last 6 months</option><option>Last 12 months</option><option>Current cohort</option>
              </select>
            </label>
            <label>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">Reporting lens</span>
              <select className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-bold text-navy-800 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10" defaultValue="outcomes" aria-label="Reporting lens">
                <option value="outcomes">Outcome outcomes</option>
                <option value="verification">Verification quality</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[480px]">
            <label>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">From date</span>
              <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-bold text-navy-800 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10" />
            </label>
            <label>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">To date</span>
              <input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-bold text-navy-800 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10" />
            </label>
          </div>
        </div>
      </Card>

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Trained" value={formatIndianNumber(kpis.trained)} detail={selectedDistrict ? selectedDistrict.name : "Current reporting cohort"} icon={GraduationCap} tone="blue" />
        <StatCard label="Placed" value={formatIndianNumber(kpis.placed)} detail={`${((kpis.placed / kpis.trained) * 100).toFixed(1)}% placement yield`} icon={BriefcaseBusiness} tone="navy" />
        <StatCard label="Currently employed rate" value={`${kpis.employedRate}%`} detail={`${formatIndianNumber(kpis.employed)} people in verified work`} icon={Activity} tone="green" />
        <StatCard label="6M retention rate" value={`${kpis.retention}%`} detail="Employed at six months" icon={Target} tone="amber" />
        <StatCard label="Median monthly wage" value={`₹${formatIndianNumber(kpis.wage)}`} detail="Among verified placements" icon={IndianRupee} tone="blue" className="col-span-2 md:col-span-1" />
      </section>

      <Card id="districts" className="mt-5 overflow-hidden scroll-mt-24">
        <div className="flex flex-col gap-3 border-b border-navy-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><MapPinned className="size-5" /></div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">Maharashtra district outcomes</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy-900">Regional outcome pulse</h2>
            </div>
          </div>
          <Badge tone="neutral">5 representative districts</Badge>
        </div>
        <div className="p-4 sm:p-6">
          <DistrictMap districts={data.districts} selectedId={activeDistrict?.id ?? "pune"} onSelect={setDistrictId} />
        </div>
        <div className="border-t border-navy-100 bg-soft-slate p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-navy-400">Selected region</p>
              <h3 className="mt-1 text-lg font-extrabold text-navy-900">{activeDistrict?.name ?? "Pune"}</h3>
              <p className="mt-1 text-[10px] text-navy-500">Representative district metrics shown on the map and table.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Trained", formatIndianNumber(activeDistrict?.trained ?? 0)],
                ["Employment", `${activeDistrict?.employed_rate ?? 0}%`],
                ["6M retained", `${activeDistrict?.retention_6m_rate ?? 0}%`],
                ["Self-employed", `${activeDistrict?.self_employment_rate ?? 0}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-navy-100 bg-white px-3 py-3">
                  <p className="text-[8px] font-extrabold uppercase tracking-wider text-navy-400">{label}</p>
                  <p className="mt-1 text-sm font-extrabold text-navy-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
          {activeDistrict && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-saffron/20 bg-saffron-soft/55 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C510C]">Top outcome risks</p>
                  <Badge tone={activeDistrict.risk_level === "high" ? "red" : activeDistrict.risk_level === "moderate" ? "amber" : "green"}>{activeDistrict.risk_level} risk</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeDistrict.top_risk_drivers.map((driver) => <Badge key={driver} tone="amber">{driver}</Badge>)}
                </div>
              </div>
              <p className="max-w-sm text-[10px] leading-5 text-navy-500">
                {activeDistrict.risk_level === "high"
                  ? "Prioritise mobility support, local employer partnerships and multilingual placement guidance."
                  : "Sustain placement volume while strengthening contract renewal checks and role-specific upskilling."}
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">Conversion pathway</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy-900">Training-to-employment funnel</h2>
              <p className="mt-1 text-[10px] text-navy-400">Where cohorts grow—and where they narrow.</p>
            </div>
            <Badge tone="green"><TrendingUp className="size-3" /> 12-month retention</Badge>
          </div>
          <div className="mt-3"><FunnelChart data={data.funnel.stages} /></div>
          <ChartTable headers={["Stage", "People", "Of enrolled"]} rows={data.funnel.stages.map((stage) => [stage.name, stage.value.toLocaleString("en-IN"), `${stage.percentage}%`])} />
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">Outcome trend</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy-900">Placement, employment & retention</h2>
              <p className="mt-1 text-[10px] text-navy-400">Six-month cohort performance trend.</p>
            </div>
            <Badge tone="blue">Apr–Sep 2026</Badge>
          </div>
          <div className="mt-3"><OutcomeTrendChart data={data.overview.trend} /></div>
          <ChartTable headers={["Month", "Placement", "Employment", "6M retention"]} rows={data.overview.trend.map((point) => [point.label, point.placement_rate == null ? "—" : `${point.placement_rate}%`, `${point.employed_rate}%`, point.retention_6m_rate == null ? "—" : `${point.retention_6m_rate}%`])} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">Attrition signals</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy-900">Top reasons for leaving work</h2>
              <p className="mt-1 text-[10px] text-navy-400">Verified exit-check responses.</p>
            </div>
            <Badge tone="amber">Top 5 reasons</Badge>
          </div>
          <div className="mt-1"><AttritionDonut data={data.attrition} /></div>
          <div className="space-y-2">
            {data.attrition.reasons.map((reason, index) => (
              <div key={reason.reason} className="flex items-center justify-between gap-3 text-[10px]">
                <span className="flex items-center gap-2 font-bold text-navy-600"><span className={cn("size-2 rounded-full", index === 0 ? "bg-primary-600" : index === 1 ? "bg-warning-500" : index === 2 ? "bg-success-500" : "bg-navy-300")} />{reason.reason}</span>
                <span className="font-extrabold text-navy-900">{reason.percentage}%</span>
              </div>
            ))}
          </div>
          <ChartTable headers={["Reason", "Count", "Share"]} rows={data.attrition.reasons.map((reason) => [reason.reason, reason.count.toLocaleString("en-IN"), `${reason.percentage}%`])} />
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">Skill gap intelligence</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy-900">Trained supply vs. market demand</h2>
              <p className="mt-1 text-[10px] text-navy-400">Verified skill evidence compared with employer role requirements.</p>
            </div>
            <select value={skillSector} onChange={(event) => setSkillSector(event.target.value)} className="h-10 rounded-xl border border-navy-200 bg-white px-3 text-[10px] font-extrabold text-navy-700 outline-none focus:border-primary-500">
              {data["skill-gaps"].sectors.map((item) => <option key={item.sector}>{item.sector}</option>)}
            </select>
          </div>
          <div className="mt-3"><SkillGapBars sector={sector} /></div>
          <div className="flex items-center gap-3 rounded-xl border border-warning-200 bg-warning-50 p-3.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-warning-500 text-navy-900"><Lightbulb className="size-4" /></div>
            <div>
              <p className="text-[10px] font-extrabold text-navy-900">Largest gap: {largestGap?.skill ?? "—"}</p>
              <p className="mt-0.5 text-[9px] text-navy-500">Supply {largestGap?.supply ?? "—"} vs demand {largestGap?.demand ?? "—"} · {largestGap?.gap ?? 0}-point shortfall</p>
            </div>
          </div>
          <ChartTable headers={["Skill", "Supply", "Demand", "Gap"]} rows={sector.skills.map((skill) => [skill.skill, skill.supply, skill.demand, skill.gap])} />
        </Card>
      </div>

      <section id="insights" className="mt-5 scroll-mt-24">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-navy-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><BrainCircuit className="size-5" /></div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600">AI insights & policy alerts</p>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy-900">Signals that point to a practical next step</h2>
              </div>
            </div>
            <Badge tone="neutral">Evidence-linked summaries</Badge>
          </div>
          <div className="grid divide-y divide-navy-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {data.insights.insights.map((insight) => (
              <article key={insight.id} className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", insight.severity === "opportunity" ? "bg-success-50 text-success-600" : insight.severity === "critical" ? "bg-red-50 text-coral" : "bg-warning-50 text-warning-700")}>
                    {insight.severity === "opportunity" ? <Sparkles className="size-5" /> : <AlertTriangle className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={insight.severity === "opportunity" ? "green" : insight.severity === "critical" ? "red" : "amber"}>{insight.severity}</Badge>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-navy-400">{insight.district} · {insight.sector}</span>
                    </div>
                    <h3 className="mt-3 text-sm font-extrabold leading-6 text-navy-900">{insight.title}</h3>
                    <p className="mt-2 text-[11px] leading-5 text-navy-500">{insight.summary}</p>
                    <Badge tone="neutral" className="mt-3">{insight.metric}</Badge>
                    <details className="group mt-4 rounded-xl border border-navy-100 bg-soft-slate p-4">
                      <summary className="cursor-pointer list-none text-[10px] font-extrabold text-primary-600">Why this insight?</summary>
                      <p className="mt-3 text-[10px] leading-5 text-navy-500"><strong className="text-navy-800">Evidence:</strong> {insight.evidence}</p>
                      <p className="mt-3 text-[10px] leading-5 text-navy-500"><strong className="text-navy-800">Recommended action:</strong> {insight.recommendation}</p>
                    </details>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>

      <Card className="mt-5 border-navy-800 bg-navy-900 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-primary-300"><ShieldCheck className="size-5" /></div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-300">Methodology & confidence</p>
              <h2 className="mt-1 text-sm font-extrabold">How to read this dashboard</h2>
              <p className="mt-2 max-w-4xl text-[10px] leading-5 text-white/45">Rates combine verified training completions, consented trainee updates and authorised employer confirmations. AI-assisted summaries are decision prompts grounded in the same metrics shown here—not causal claims.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-success-500/15 text-success-500 ring-success-500/20" dot>High coverage</Badge>
            <Badge className="bg-white/10 text-white/70 ring-white/10">24h refresh</Badge>
            <Badge className="bg-white/10 text-white/70 ring-white/10">Consent protected</Badge>
          </div>
        </div>
      </Card>

      <div className="mt-4 flex flex-col gap-2 text-[9px] text-navy-400 sm:flex-row sm:items-center sm:justify-between">
        <p>{selectedDistrict?.name ?? "Maharashtra"} · {period} · {dataSource.source === "live" ? "Live API data" : "Illustrative demo data"}</p>
        <p className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3" /> Last updated {formatDateTime(dataSource.lastUpdated)}</p>
        </div>
      </AppShell>
    </>
  );
}
