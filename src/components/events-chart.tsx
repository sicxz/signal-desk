"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Event } from "@/lib/types";

export function EventsChart({ events }: { events: Event[] }) {
  const counts: Record<string, number> = {};

  for (const event of events) {
    const date = new Date(event.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    counts[date] = (counts[date] || 0) + 1;
  }

  const data = Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .reverse()
    .slice(-14);

  return (
    <section className="rounded-lg border border-[#d0d7de] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
            Activity
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#1f2328]">
            Story volume
          </h2>
        </div>
        <p className="text-xs text-[#57606a]">14 days</p>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#57606a]">
          No event data yet.
        </p>
      ) : (
        <div className="mt-4 min-h-[220px]">
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <AreaChart data={data} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="hubVolume" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0969da" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0969da" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#d8dee4" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="#57606a"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="#57606a"
              />
              <Tooltip
                cursor={{ stroke: "#0969da", strokeDasharray: "4 4" }}
                contentStyle={{
                  borderRadius: "6px",
                  border: "1px solid #d0d7de",
                  background: "#ffffff",
                  color: "#1f2328",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0969da"
                strokeWidth={2}
                fill="url(#hubVolume)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
