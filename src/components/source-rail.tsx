"use client";

import { formatTimestamp } from "@/lib/feed";
import { Source } from "@/lib/types";

type SourceRailItem = {
  source: Source;
  storyCount: number;
  latestTimestamp: number | null;
};

export function SourceRail({
  items,
  selectedSourceId,
  onSelect,
}: {
  items: SourceRailItem[];
  selectedSourceId: string | null;
  onSelect: (sourceId: string | null) => void;
}) {
  return (
    <section className="rounded-xl border border-[#d0d7de] bg-white shadow-sm">
      <div className="border-b border-[#e5e7eb] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
          Sources
        </p>
        <h2 className="mt-1 text-base font-semibold text-[#111827]">
          Reader view
        </h2>
      </div>

      <div className="overflow-x-auto p-2 lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
        <div className="flex gap-2 lg:flex-col">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`min-w-[180px] rounded-lg border px-3 py-2 text-left transition-colors lg:min-w-0 ${
              selectedSourceId === null
                ? "border-[#0969da] bg-[#eaf5ff]"
                : "border-[#d0d7de] bg-white hover:border-[#8c959f]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[#111827]">All sources</span>
              <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 text-[11px] text-[#57606a]">
                {items.reduce((sum, item) => sum + item.storyCount, 0)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#57606a]">
              Reset to the full desk feed.
            </p>
          </button>

          {items.map(({ source, storyCount, latestTimestamp }) => (
            <button
              key={source.id}
              type="button"
              onClick={() => onSelect(source.id)}
              className={`min-w-[220px] rounded-lg border px-3 py-2 text-left transition-colors lg:min-w-0 ${
                selectedSourceId === source.id
                  ? "border-[#0969da] bg-[#eaf5ff]"
                  : "border-[#d0d7de] bg-white hover:border-[#8c959f]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#111827]">{source.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#57606a]">
                    {source.tag} · {source.type === "api" && source.url.startsWith("mailto:") ? "email" : source.type}
                  </p>
                </div>
                <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 text-[11px] text-[#57606a]">
                  {storyCount}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#57606a]">
                {latestTimestamp
                  ? `Latest: ${formatTimestamp(new Date(latestTimestamp).toISOString())}`
                  : "No recent stories in the current feed window."}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
