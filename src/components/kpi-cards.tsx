"use client";

import { Event } from "@/lib/types";

export function KpiCards({ events }: { events: Event[] }) {
  const totalStories = events.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const storiesToday = events.filter(
    (event) => new Date(event.created_at) >= today
  ).length;
  const activeSources = new Set(events.map((event) => event.channel)).size;
  const averageSpeculation = events.length
    ? Math.round(
        events.reduce((sum, event) => sum + (event.speculation_score ?? 0), 0) /
          events.length
      )
    : 0;

  const cards = [
    { label: "Stories", value: totalStories.toString() },
    { label: "Today", value: storiesToday.toString() },
    { label: "Sources", value: activeSources.toString() },
    { label: "Spec", value: `${averageSpeculation}/10` },
  ];

  return (
    <section className="rounded-lg border border-[#d0d7de] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">
            Snapshot
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#1f2328]">
            Live counters
          </h2>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-md border border-[#d8dee4] bg-[#f6f8fa] p-3"
          >
            <p className="text-xs font-medium text-[#57606a]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#1f2328]">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
