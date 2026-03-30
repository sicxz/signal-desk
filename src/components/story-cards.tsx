"use client";

import { Event } from "@/lib/types";
import {
  formatTimestamp,
  getEventSourceName,
  getProviderTheme,
  getSectionLabel,
  getSectionTheme,
  getStorySynopsis,
  getSummary,
  resolveSection,
  scoreTone,
} from "@/lib/feed";
import { SignalProfileState } from "@/lib/reader-profile";
import { timeAgo } from "@/lib/utils";
import { StoryImage } from "@/components/story-image";

function StoryMeta({
  event,
  compact = false,
}: {
  event: Event;
  compact?: boolean;
}) {
  const section = resolveSection(event);
  const sectionTheme = getSectionTheme(section);
  const providerTheme = getProviderTheme(event);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[#57606a]">
      <span className="font-semibold uppercase tracking-[0.08em] text-[#1f2328]">
        {getEventSourceName(event)}
      </span>
      <span className={`rounded-full px-2 py-0.5 font-medium ${sectionTheme.badgeClass}`}>
        {getSectionLabel(section)}
      </span>
      {providerTheme ? (
        <span
          className={`rounded-full border px-2 py-0.5 font-medium ${providerTheme.pillClass}`}
        >
          {providerTheme.label}
        </span>
      ) : null}
      <span>{compact ? timeAgo(event.created_at) : formatTimestamp(event.created_at)}</span>
    </div>
  );
}

export function StoryCard({
  event,
  featured = false,
  note,
  profile,
  onOpen,
}: {
  event: Event;
  featured?: boolean;
  note?: string;
  profile: SignalProfileState;
  onOpen: (event: Event) => void;
}) {
  const section = resolveSection(event);
  const sectionTheme = getSectionTheme(section);
  const synopsis = getStorySynopsis(event, profile);

  return (
    <article className="overflow-hidden rounded-xl border border-[#d0d7de] bg-white shadow-sm">
      <div className="p-3">
        <StoryMeta event={event} />
      </div>
      <div className="px-3">
        <StoryImage
          src={event.image_url}
          variant={featured ? "hero" : "card"}
          label={event.title}
        />
      </div>
      <div className={featured ? "p-4" : "p-3"}>
        {note ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0969da]">
            {note}
          </p>
        ) : null}
        <h3
          className={`mt-1 font-semibold tracking-[-0.02em] text-[#111827] ${
            featured ? "text-xl leading-7 md:text-2xl" : "text-base leading-6"
          }`}
        >
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#374151]">
          {getSummary(event)}
        </p>
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${sectionTheme.panelClass}`}
        >
          {synopsis.careLine}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e7eb] pt-3">
          <div className="flex flex-wrap gap-1.5">
            {event.tags?.slice(0, featured ? 5 : 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 py-0.5 text-[11px] text-[#57606a]"
              >
                {tag}
              </span>
            ))}
          </div>
          {event.original_url ? (
            <a
              href={event.original_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpen(event)}
              className="text-xs font-semibold text-[#075fc0] hover:underline"
            >
              Open story
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CompactStory({
  event,
  label,
  profile,
  onOpen,
}: {
  event: Event;
  label: string;
  profile: SignalProfileState;
  onOpen: (event: Event) => void;
}) {
  const synopsis = getStorySynopsis(event, profile);

  return (
    <article className="rounded-xl border border-[#d0d7de] bg-white p-3 shadow-sm">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
        <StoryImage src={event.image_url} variant="thumb" label={event.title} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0969da]">
            {label}
          </p>
          <div className="mt-1">
            <StoryMeta event={event} compact />
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-6 text-[#1f2328]">
            {event.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#57606a]">
            {synopsis.bigDeal.replace(/^Big deal:\s*/i, "")}
          </p>
          {event.original_url ? (
            <a
              href={event.original_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpen(event)}
              className="mt-3 inline-flex text-xs font-medium text-[#0969da] hover:underline"
            >
              Open
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function SpeculationCard({
  event,
  position,
  profile,
  onOpen,
}: {
  event: Event;
  position: number;
  profile: SignalProfileState;
  onOpen: (event: Event) => void;
}) {
  const score = event.speculation_score ?? 0;
  const tone = scoreTone(score);
  const synopsis = getStorySynopsis(event, profile);

  return (
    <article className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#57606a]">
            <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 font-medium text-[#1f2328]">
              Rank #{position}
            </span>
            <span className="font-semibold uppercase tracking-[0.08em] text-[#1f2328]">
              {getEventSourceName(event)}
            </span>
            <span>{formatTimestamp(event.created_at)}</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold leading-7 text-[#1f2328]">
            {event.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#57606a]">{getSummary(event)}</p>
          <p className="mt-3 text-sm leading-6 text-[#57606a]">{synopsis.catchLine}</p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${tone.pillClass}`}>
          {score}/10
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-[#f6f8fa]">
        <div
          className={`h-2 rounded-full ${tone.barClass}`}
          style={{ width: `${Math.max(10, score * 10)}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#d8dee4] pt-3 text-xs text-[#57606a]">
        <span>{tone.label}</span>
        {event.original_url ? (
          <a
            href={event.original_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen(event)}
            className="font-medium text-[#0969da] hover:underline"
          >
            Open
          </a>
        ) : null}
      </div>
    </article>
  );
}
