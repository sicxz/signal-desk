"use client";

import { CompactStory } from "@/components/story-cards";
import { SourceBriefing, formatTimestamp, scoreTone } from "@/lib/feed";
import { SignalProfileState } from "@/lib/reader-profile";
import { Event } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function SourceBriefingPanel({
  briefing,
  profile,
  onOpenStory,
}: {
  briefing: SourceBriefing;
  profile: SignalProfileState;
  onOpenStory: (event: Event) => void;
}) {
  const tone = scoreTone(briefing.averageSpeculation);

  return (
    <section className="rounded-xl border border-[#d0d7de] bg-white shadow-sm">
      <div className="border-b border-[#e5e7eb] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
          Source briefing
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#111827]">
          {briefing.source.name}
        </h2>
        <p className="mt-1 text-sm text-[#57606a]">
          {briefing.windowLabel} · {briefing.storyCount} stories
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-[#d8dee4] bg-[#f6f8fa] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
            What mattered
          </p>
          <p className="mt-2 text-sm leading-6 text-[#111827]">{briefing.lead}</p>
          <p className="mt-3 text-sm leading-6 text-[#57606a]">{briefing.catchLine}</p>
          <p className="mt-3 text-sm leading-6 text-[#57606a]">{briefing.careLine}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-[#d8dee4] bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
              Tone
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={`rounded-full border px-2 py-1 text-xs font-medium ${tone.pillClass}`}>
                {briefing.toneLabel}
              </span>
              <span className="text-sm font-semibold text-[#111827]">
                {briefing.averageSpeculation}/10
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#d8dee4] bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
              Last publish
            </p>
            <p className="mt-2 text-sm font-semibold text-[#111827]">
              {briefing.lastPublishedAt
                ? formatTimestamp(briefing.lastPublishedAt)
                : "No recent publication"}
            </p>
            {briefing.lastPublishedAt ? (
              <p className="mt-1 text-xs text-[#57606a]">
                {timeAgo(briefing.lastPublishedAt)}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
            Recurring themes
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {briefing.recurringTags.length > 0 ? (
              briefing.recurringTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 py-0.5 text-xs text-[#57606a]"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#57606a]">
                Not enough repeated tags yet.
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
            Top stories
          </p>
          {briefing.topStories.map((event, index) => (
            <CompactStory
              key={event.id}
              event={event}
              label={index === 0 ? "Desk lead" : "Also from this source"}
              profile={profile}
              onOpen={onOpenStory}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
