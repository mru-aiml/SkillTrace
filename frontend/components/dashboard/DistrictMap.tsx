"use client";

import { MapPin } from "lucide-react";
import type { DistrictOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  mumbai: "Mumbai",
  pune: "Pune",
  nashik: "Nashik",
  gadchiroli: "Gadchiroli",
  sambhajinagar: "Chhatrapati Sambhajinagar",
};

function point(lng: number | null, lat: number | null) {
  if (lng == null || lat == null) return { x: 250, y: 290 };
  return {
    x: 42 + ((lng - 72.5) / 8.7) * 390,
    y: 40 + ((21.5 - lat) / 3.8) * 500,
  };
}

function retentionColor(value: number) {
  if (value >= 70) return "#0B7A75";
  if (value >= 62) return "#E99024";
  return "#D85C4A";
}

export function DistrictMap({
  districts,
  selectedId,
  onSelect,
}: {
  districts: DistrictOutcome[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,.75fr)_minmax(0,1.25fr)]">
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-navy-100 bg-soft-slate">
        <div className="civic-grid absolute inset-0 opacity-60" />
        <div className="absolute left-4 top-4 z-10 rounded-xl border border-navy-100 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-400">Maharashtra</p>
          <p className="mt-0.5 text-[10px] font-bold text-navy-700">Select a district marker</p>
        </div>
        <svg viewBox="0 0 500 620" className="absolute inset-0 h-full w-full" role="img" aria-labelledby="district-map-title district-map-description">
          <title id="district-map-title">Maharashtra district outcome map</title>
          <desc id="district-map-description">Interactive markers for Pune, Mumbai, Nashik, Gadchiroli and Chhatrapati Sambhajinagar. The table contains the same values.</desc>
          <defs>
            <filter id="district-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#102D3A" floodOpacity=".12" />
            </filter>
          </defs>
          <path
            d="M242 32 L292 47 L318 83 L356 108 L365 154 L399 188 L381 236 L418 276 L392 322 L408 367 L374 412 L346 472 L301 504 L261 553 L218 538 L181 506 L137 482 L119 433 L88 390 L104 343 L75 302 L97 263 L84 218 L121 182 L147 132 L189 108 L211 70 Z"
            fill="#FFFFFF"
            stroke="#A8BBB6"
            strokeWidth="2"
            filter="url(#district-shadow)"
          />
          <path d="M97 263 C165 277 209 272 262 315 S341 361 392 322 M147 132 C178 192 205 221 262 315 M211 70 C230 160 234 225 262 315 M262 315 C284 384 291 448 301 504" fill="none" stroke="#A8BBB6" strokeWidth="1.2" strokeDasharray="4 7" />
          <text x="248" y="302" textAnchor="middle" fill="#102D3A" opacity=".10" fontSize="22" fontWeight="800" letterSpacing="3">MAHARASHTRA</text>
          {districts.map((district) => {
            const { x, y } = point(district.lng, district.lat);
            const selected = selectedId === district.id;
            const color = retentionColor(district.retention_6m_rate);
            const labelOnLeft = ["mumbai", "pune", "gadchiroli"].includes(district.id);
            return (
              <g
                key={district.id}
                role="button"
                tabIndex={0}
                aria-label={`${district.name}: ${district.employed_rate}% employment rate, ${district.retention_6m_rate}% six-month retention`}
                aria-pressed={selected}
                onClick={() => onSelect(district.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(district.id);
                  }
                }}
                className="cursor-pointer outline-none"
              >
                {selected && <circle cx={x} cy={y} r="23" fill={color} opacity=".15" className="animate-pulse-soft" />}
                <circle cx={x} cy={y} r={selected ? 14 : 11} fill={color} stroke="#fff" strokeWidth="4" className="transition-all" />
                <circle cx={x} cy={y} r="3" fill="#fff" />
                <text x={x + (labelOnLeft ? -18 : 18)} y={y + 4} textAnchor={labelOnLeft ? "end" : "start"} fill="#102D3A" fontSize={selected ? "11" : "9"} fontWeight="800">{labels[district.id]}</text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-3 rounded-xl border border-navy-100 bg-white/90 px-3 py-2 text-[8px] font-bold text-navy-500 shadow-sm backdrop-blur-sm">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> 70%+ retained</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary-600" /> 62–69%</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning-500" /> Below 62%</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-primary-600"><MapPin className="size-3.5" /> Regional outcomes</p>
            <h3 className="mt-1 text-base font-extrabold text-navy-900">District comparison</h3>
          </div>
          <p className="text-[9px] text-navy-400">Click any row to select</p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-navy-100">
          <table className="w-full min-w-[670px] border-collapse text-left">
            <caption className="sr-only">Outcome metrics by district</caption>
            <thead>
              <tr className="bg-soft-slate text-[8px] font-extrabold uppercase tracking-[0.1em] text-navy-400">
                <th scope="col" className="px-3 py-3">District</th>
                <th scope="col" className="px-3 py-3 text-right">Trained</th>
                <th scope="col" className="px-3 py-3 text-right">Employment</th>
                <th scope="col" className="px-3 py-3 text-right">6M retention</th>
                <th scope="col" className="px-3 py-3 text-right">Self-employed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {districts.map((district) => {
                const selected = selectedId === district.id;
                return (
                  <tr
                    key={district.id}
                    onClick={() => onSelect(district.id)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(district.id);
                      }
                    }}
                    className={cn("cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500", selected ? "bg-primary-50" : "hover:bg-soft-slate")}
                    aria-selected={selected}
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", selected ? "bg-primary-600" : "bg-navy-200")} />
                        <span className="text-[11px] font-extrabold text-navy-900">{district.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right text-[11px] font-bold text-navy-600">{district.trained.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3.5 text-right text-[11px] font-extrabold text-navy-800">{district.employed_rate}%</td>
                    <td className="px-3 py-3.5 text-right text-[11px] font-extrabold text-navy-800">{district.retention_6m_rate}%</td>
                    <td className="px-3 py-3.5 text-right text-[11px] font-extrabold text-primary-700">{district.self_employment_rate == null ? "—" : `${district.self_employment_rate}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[9px] leading-4 text-navy-400">Map positions are illustrative. The table and map use the same district dataset.</p>
      </div>
    </div>
  );
}
