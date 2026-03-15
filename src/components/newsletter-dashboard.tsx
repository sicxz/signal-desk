"use client";

import type { ReactNode } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Event } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { ChannelFilter } from "@/components/channel-filter";
import { EventsChart } from "@/components/events-chart";
import { KpiCards } from "@/components/kpi-cards";
import { SearchBar } from "@/components/search-bar";

const SECTIONS = [
  {
    key: "science",
    label: "Science",
    description: "Research, papers, breakthroughs",
  },
  {
    key: "big-3",
    label: "ChatGPT · Claude · Gemini",
    description: "Big 3 news",
  },
  {
    key: "prompting-tools",
    label: "Prompting & Tools",
    description: "MCPs, SDKs, prompting techniques",
  },
  {
    key: "learning-tutorials",
    label: "Learning & Tutorials",
    description: "Guides, walkthroughs, hands-on learning",
  },
  {
    key: "media-ai",
    label: "Media AI",
    description: "Image, video, audio AI",
  },
  {
    key: "speculation",
    label: "Speculation Rankings",
    description: "Sorted by speculation score",
  },
  {
    key: "general",
    label: "Everything Else",
    description: "Catch-all",
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];
type SectionFilter = SectionKey | "all";
type RankMode = "latest" | "for-you" | "rising";

type PreferenceProfile = {
  sections: Partial<Record<SectionKey, number>>;
  channels: Record<string, number>;
  tags: Record<string, number>;
};

const STORAGE_KEY = "ai-info-hub-reader-profile-v1";

const EMPTY_PROFILE: PreferenceProfile = {
  sections: {},
  channels: {},
  tags: {},
};

const SECTION_LOOKUP = Object.fromEntries(
  SECTIONS.map((section) => [section.key, section])
) as Record<SectionKey, (typeof SECTIONS)[number]>;

const SECTION_KEYWORDS: Record<
  Exclude<SectionKey, "general" | "speculation">,
  string[]
> = {
  science: [
    "research",
    "paper",
    "papers",
    "study",
    "science",
    "scientific",
    "breakthrough",
    "benchmark",
    "dataset",
    "arxiv",
    "biology",
    "medical",
    "lab",
  ],
  "big-3": [
    "chatgpt",
    "openai",
    "claude",
    "anthropic",
    "gemini",
    "google ai",
    "google deepmind",
    "deepmind",
  ],
  "prompting-tools": [
    "prompt",
    "prompting",
    "mcp",
    "sdk",
    "tool",
    "tools",
    "agent",
    "server",
    "api",
    "workflow",
    "rag",
    "eval",
    "cli",
  ],
  "learning-tutorials": [
    "tutorial",
    "tutorials",
    "guide",
    "guides",
    "walkthrough",
    "how to",
    "lesson",
    "learn",
    "learning",
    "course",
    "beginner",
    "playbook",
  ],
  "media-ai": [
    "image",
    "video",
    "audio",
    "music",
    "voice",
    "speech",
    "multimodal",
    "diffusion",
    "midjourney",
    "runway",
    "sora",
    "veo",
    "elevenlabs",
  ],
};

const SECTION_BASE_WEIGHT: Record<SectionKey, number> = {
  science: 1.15,
  "big-3": 1.3,
  "prompting-tools": 1.1,
  "learning-tutorials": 1.08,
  "media-ai": 1.02,
  speculation: 0.9,
  general: 0.82,
};

const MODE_LABELS: Record<RankMode, string> = {
  latest: "Latest",
  "for-you": "For you",
  rising: "Rising",
};

function getSectionTheme(section: SectionKey) {
  switch (section) {
    case "science":
      return {
        badgeClass: "bg-[#ddf4ff] text-[#0969da]",
        panelClass: "border-[#b6e3ff] bg-[#f4fbff]",
      };
    case "big-3":
      return {
        badgeClass: "bg-[#f5edff] text-[#8250df]",
        panelClass: "border-[#d8b9ff] bg-[#faf5ff]",
      };
    case "prompting-tools":
      return {
        badgeClass: "bg-[#f5edff] text-[#8250df]",
        panelClass: "border-[#d8b9ff] bg-[#faf5ff]",
      };
    case "learning-tutorials":
      return {
        badgeClass: "bg-[#fff8c5] text-[#9a6700]",
        panelClass: "border-[#eac54f] bg-[#fffef0]",
      };
    case "media-ai":
      return {
        badgeClass: "bg-[#ffeff7] text-[#bf3989]",
        panelClass: "border-[#ffb8e0] bg-[#fff7fb]",
      };
    case "speculation":
      return {
        badgeClass: "bg-[#ffebe9] text-[#cf222e]",
        panelClass: "border-[#ffb3ad] bg-[#fff5f4]",
      };
    default:
      return {
        badgeClass: "bg-[#f6f8fa] text-[#57606a]",
        panelClass: "border-[#d8dee4] bg-[#f6f8fa]",
      };
  }
}

function getProviderTheme(event: Event) {
  const haystack = getSearchText(event);

  if (haystack.includes("chatgpt") || haystack.includes("openai")) {
    return {
      label: "OpenAI",
      pillClass: "border-[#2da44e]/20 bg-[#dafbe1] text-[#1a7f37]",
      dotClass: "bg-[#2da44e]",
      accentClass: "border-[#2da44e]",
    };
  }

  if (
    haystack.includes("gemini") ||
    haystack.includes("google ai") ||
    haystack.includes("google deepmind") ||
    haystack.includes("deepmind")
  ) {
    return {
      label: "Gemini",
      pillClass: "border-[#54aeff]/25 bg-[#ddf4ff] text-[#0969da]",
      dotClass: "bg-[#54aeff]",
      accentClass: "border-[#54aeff]",
    };
  }

  if (haystack.includes("claude") || haystack.includes("anthropic")) {
    return {
      label: "Claude",
      pillClass: "border-[#c69026]/25 bg-[#fff8c5] text-[#9a6700]",
      dotClass: "bg-[#c69026]",
      accentClass: "border-[#c69026]",
    };
  }

  return null;
}

function formatEditionDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function formatTimestamp(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function splitIntoSentences(text: string) {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return matches ? matches.map((sentence) => sentence.trim()) : [];
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.!?]+$/, "");
}

function getSearchText(event: Event) {
  return [
    event.title,
    event.summary,
    event.description,
    event.channel,
    event.topic,
    event.section,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolveSection(event: Event): SectionKey {
  if ((event.speculation_score ?? 0) >= 7) {
    return "speculation";
  }

  const normalized = (event.section || event.topic || "").toLowerCase().trim();

  if (normalized === "science") return "science";
  if (normalized === "big-3" || normalized === "big 3") return "big-3";
  if (
    normalized === "prompting-tools" ||
    normalized === "prompting tools" ||
    normalized === "tools"
  ) {
    return "prompting-tools";
  }
  if (
    normalized === "learning-tutorials" ||
    normalized === "learning tutorials" ||
    normalized === "tutorials" ||
    normalized === "learning"
  ) {
    return "learning-tutorials";
  }
  if (normalized === "media-ai" || normalized === "media ai") return "media-ai";
  if (normalized === "speculation") return "speculation";
  if (normalized === "general") return "general";

  const haystack = getSearchText(event);

  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return section as Exclude<SectionKey, "general" | "speculation">;
    }
  }

  return "general";
}

function getSummary(event: Event) {
  return (
    event.summary ||
    event.description ||
    "No summary is available for this story yet."
  );
}

function getStorySynopsis(event: Event, profile: PreferenceProfile) {
  const summary = getSummary(event);
  const section = resolveSection(event);
  const providerTheme = getProviderTheme(event);
  const sentences = splitIntoSentences(summary);

  if (event.big_deal && event.catch && event.why_care) {
    const storedLead = event.big_deal.replace(/^Big deal:\s*/i, "");
    const watchLine = sentences[1]
      ? `Watch for: ${stripTrailingPunctuation(sentences[1])}.`
      : "Watch for: whether this turns into rollout, benchmarks, or a real workflow shift.";

    return {
      lead: storedLead,
      bigDeal: event.big_deal.match(/^Big deal:/i) ? event.big_deal : `Big deal: ${event.big_deal}`,
      catchLine: event.catch.match(/^The catch:/i) ? event.catch : `The catch: ${event.catch}`,
      careLine: event.why_care.match(/^Why care:/i) ? event.why_care : `Why care: ${event.why_care}`,
      watchLine,
    };
  }

  const leadSentence =
    sentences[0] ||
    `${event.title} is the most important signal in ${SECTION_LOOKUP[section].label.toLowerCase()} right now.`;

  let catchLine = "The catch: the downstream impact matters more than the headline.";

  if ((event.speculation_score ?? 0) >= 7) {
    catchLine = "The catch: this is still a high-noise signal, so treat it as direction rather than settled fact.";
  } else if (section === "science") {
    catchLine = "The catch: strong research headlines still need replication, benchmarks, or product follow-through.";
  } else if (section === "learning-tutorials") {
    catchLine = "The catch: it only matters if the workflow is reusable, not just clever in a demo.";
  } else if (section === "prompting-tools") {
    catchLine = "The catch: tool news is only meaningful if it saves time, removes friction, or improves evaluation.";
  } else if (section === "media-ai") {
    catchLine = "The catch: visual AI demos can outrun reliability, rights, or production readiness.";
  } else if (providerTheme?.label === "OpenAI") {
    catchLine = "The catch: the real effect depends on rollout, pricing, and whether access reaches your workflow.";
  } else if (providerTheme?.label === "Gemini") {
    catchLine = "The catch: product integration matters more than isolated model claims.";
  } else if (providerTheme?.label === "Claude") {
    catchLine = "The catch: quality alone does not matter unless the workflow fit and adoption follow.";
  }

  let careLine = "Why care: this is worth opening if it changes your picture of what matters next.";

  if ((profile.sections[section] || 0) >= 3) {
    careLine = `Why care: this overlaps with your recent interest in ${SECTION_LOOKUP[section].label.toLowerCase()}.`;
  } else if (section === "big-3") {
    careLine = "Why care: upstream platform moves tend to reshape tools, pricing, and product bets across the rest of the market.";
  } else if (section === "prompting-tools") {
    careLine = "Why care: this could change how quickly you build, prompt, ship, or evaluate AI systems.";
  } else if (section === "learning-tutorials") {
    careLine = "Why care: this is the kind of story you open when you want something practical today, not just industry chatter.";
  } else if (section === "science") {
    careLine = "Why care: research signals often show where product capabilities and benchmarks are heading next.";
  } else if (section === "media-ai") {
    careLine = "Why care: media tooling shifts can change creative workflow, cost, and quality expectations quickly.";
  }

  const watchLine = sentences[1]
    ? `Watch for: ${stripTrailingPunctuation(sentences[1])}.`
    : "Watch for: whether this turns into rollout, benchmarks, or a real workflow shift.";

  return {
    lead: leadSentence,
    bigDeal: `Big deal: ${stripTrailingPunctuation(leadSentence)}.`,
    catchLine,
    careLine,
    watchLine,
  };
}

function scoreTone(score: number | null) {
  const value = score ?? 0;

  if (value >= 7) {
    return {
      label: "High speculation",
      barClass: "bg-[#cf222e]",
      trackClass: "bg-[#ffebe9]",
      textClass: "text-[#cf222e]",
      pillClass: "border-[#ff8182] bg-[#ffebe9] text-[#cf222e]",
    };
  }

  if (value >= 4) {
    return {
      label: "Medium speculation",
      barClass: "bg-[#9a6700]",
      trackClass: "bg-[#fff8c5]",
      textClass: "text-[#9a6700]",
      pillClass: "border-[#d4a72c] bg-[#fff8c5] text-[#9a6700]",
    };
  }

  return {
    label: "Low speculation",
    barClass: "bg-[#1a7f37]",
    trackClass: "bg-[#dafbe1]",
    textClass: "text-[#1a7f37]",
    pillClass: "border-[#4ac26b] bg-[#dafbe1] text-[#1a7f37]",
  };
}

function incrementCounter(
  values: Record<string, number>,
  key: string,
  amount: number
) {
  return {
    ...values,
    [key]: (values[key] || 0) + amount,
  };
}

function learnFromEvent(profile: PreferenceProfile, event: Event): PreferenceProfile {
  const section = resolveSection(event);

  let nextProfile: PreferenceProfile = {
    sections: {
      ...profile.sections,
      [section]: (profile.sections[section] || 0) + 3,
    },
    channels: incrementCounter(profile.channels, event.channel, 2),
    tags: { ...profile.tags },
  };

  for (const tag of event.tags?.slice(0, 4) || []) {
    nextProfile = {
      ...nextProfile,
      tags: incrementCounter(nextProfile.tags, tag, 1),
    };
  }

  return nextProfile;
}

function mergeProfile(input: unknown): PreferenceProfile {
  if (!input || typeof input !== "object") {
    return EMPTY_PROFILE;
  }

  const candidate = input as PreferenceProfile;

  return {
    sections: candidate.sections || {},
    channels: candidate.channels || {},
    tags: candidate.tags || {},
  };
}

function readStoredProfile() {
  if (typeof window === "undefined") {
    return EMPTY_PROFILE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? mergeProfile(JSON.parse(stored)) : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

function storyInterestScore(event: Event, profile: PreferenceProfile) {
  const section = resolveSection(event);
  const ageHours =
    (Date.now() - new Date(event.created_at).getTime()) / (1000 * 60 * 60);
  const freshness = Math.max(0, 42 - ageHours) / 3.5;
  const sectionWeight = profile.sections[section] || 0;
  const channelWeight = profile.channels[event.channel] || 0;
  const tagWeight = (event.tags || []).reduce(
    (sum, tag) => sum + (profile.tags[tag] || 0),
    0
  );

  return (
    freshness +
    SECTION_BASE_WEIGHT[section] * 2 +
    sectionWeight * 1.6 +
    channelWeight * 0.75 +
    tagWeight * 0.3 +
    (event.speculation_score ?? 0) * (section === "speculation" ? 0.45 : 0.08)
  );
}

function risingSignalScore(event: Event, profile: PreferenceProfile) {
  const ageHours =
    (Date.now() - new Date(event.created_at).getTime()) / (1000 * 60 * 60);

  return (
    Math.max(0, 20 - ageHours) +
    storyInterestScore(event, profile) * 0.3 +
    (event.speculation_score ?? 0) * 0.55 +
    (event.tags?.length || 0) * 0.35
  );
}

function dedupeEvents(events: Event[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    if (seen.has(event.id)) {
      return false;
    }
    seen.add(event.id);
    return true;
  });
}

function whyThisStory(event: Event, profile: PreferenceProfile) {
  const section = resolveSection(event);
  const sectionWeight = profile.sections[section] || 0;
  const channelWeight = profile.channels[event.channel] || 0;
  const tagHit = (event.tags || []).find((tag) => (profile.tags[tag] || 0) > 0);

  if (sectionWeight >= 3) {
    return `You keep returning to ${SECTION_LOOKUP[section].label.toLowerCase()}`;
  }

  if (channelWeight >= 3) {
    return `Strong source match: ${event.channel}`;
  }

  if (tagHit) {
    return `Tag match: ${tagHit}`;
  }

  return "Fresh signal";
}

function topLearningBars(profile: PreferenceProfile, activeSections: SectionKey[]) {
  const ranked = SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    value: profile.sections[section.key] || 0,
  }))
    .filter((section) => section.value > 0)
    .sort((left, right) => right.value - left.value);

  if (ranked.length > 0) {
    const maxValue = ranked[0].value;

    return ranked.slice(0, 4).map((section) => ({
      ...section,
      width: `${Math.max(16, Math.round((section.value / maxValue) * 100))}%`,
    }));
  }

  return activeSections.slice(0, 4).map((section) => ({
    key: section,
    label: SECTION_LOOKUP[section].label,
    value: 0,
    width: "32%",
  }));
}

function topTags(events: Event[], profile: PreferenceProfile) {
  const scores = new Map<string, number>();

  for (const event of events) {
    for (const tag of event.tags || []) {
      scores.set(tag, (scores.get(tag) || 0) + 1 + (profile.tags[tag] || 0) * 0.6);
    }
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([tag]) => tag);
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-[#fd8c73] text-[#1f2328]"
          : "border-transparent text-[#57606a] hover:border-[#d0d7de] hover:text-[#1f2328]"
      }`}
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border border-[#0969da] bg-[#ddf4ff] text-[#0969da]"
          : "border border-[#d0d7de] bg-white text-[#57606a] hover:text-[#1f2328]"
      }`}
    >
      {children}
    </button>
  );
}

function StoryCard({
  event,
  featured = false,
  note,
  onOpen,
}: {
  event: Event;
  featured?: boolean;
  note?: string;
  onOpen: (event: Event) => void;
}) {
  const section = SECTION_LOOKUP[resolveSection(event)];
  const sectionTheme = getSectionTheme(section.key);
  const providerTheme = getProviderTheme(event);
  const isVisualPackage = Boolean(event.image_url) && !featured;

  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white ${
        isVisualPackage
          ? "border-[#9ca3af] bg-[#fafbfc] shadow-md"
          : providerTheme
            ? providerTheme.accentClass
            : "border-[#c7d0da] shadow-sm"
      }`}
    >
      {event.image_url ? (
        <div className={`relative ${featured ? "h-40" : "h-28"} w-full bg-[#f0f4f8]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className={featured ? "p-4" : "p-3"}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#4b5563]">
          <span className={`rounded-full px-2 py-0.5 font-medium ${sectionTheme.badgeClass}`}>
            {section.label}
          </span>
          {providerTheme ? (
            <span className={`rounded-full border px-2 py-0.5 font-medium ${providerTheme.pillClass}`}>
              {providerTheme.label}
            </span>
          ) : null}
          <span>{event.channel}</span>
          <span>{timeAgo(event.created_at)}</span>
        </div>
        <h3
          className={`mt-2 font-semibold tracking-[-0.02em] text-[#111827] ${
            featured ? "text-xl leading-7 md:text-2xl" : "text-base leading-6"
          }`}
        >
          {event.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-[#374151]">{getSummary(event)}</p>
        {note ? (
          <p className="mt-2 text-[11px] font-semibold text-[#0969da]">{note}</p>
        ) : null}
        <div className={`mt-2 rounded border border-[#d8dee4] px-2.5 py-1.5 text-xs leading-5 ${sectionTheme.panelClass}`}>
          {getStorySynopsis(event, EMPTY_PROFILE).careLine}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e7eb] pt-2">
          <div className="flex flex-wrap gap-1.5">
            {event.tags?.slice(0, featured ? 4 : 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#9ca3af] bg-[#f6f8fa] px-1.5 py-0.5 text-[11px] text-[#4b5563]"
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
              Read more
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CompactStory({
  event,
  label,
  onOpen,
}: {
  event: Event;
  label: string;
  onOpen: (event: Event) => void;
}) {
  const providerTheme = getProviderTheme(event);
  const synopsis = getStorySynopsis(event, EMPTY_PROFILE);

  return (
    <article className="flex gap-2.5 rounded-md border border-[#9ca3af] bg-[#f8fafc] p-2.5">
      {event.image_url ? (
        <div className="hidden h-14 w-14 flex-shrink-0 overflow-hidden rounded sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-[#0969da]">{label}</p>
          {providerTheme ? (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${providerTheme.pillClass}`}>
              {providerTheme.label}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 text-sm font-semibold leading-6 text-[#1f2328]">
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#57606a]">
          {synopsis.bigDeal.replace(/^Big deal:\s*/, "")}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#57606a]">
          <span>{timeAgo(event.created_at)}</span>
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
      </div>
    </article>
  );
}

function SpeculationCard({
  event,
  position,
  onOpen,
}: {
  event: Event;
  position: number;
  onOpen: (event: Event) => void;
}) {
  const score = event.speculation_score ?? 0;
  const tone = scoreTone(score);
  const providerTheme = getProviderTheme(event);
  const synopsis = getStorySynopsis(event, EMPTY_PROFILE);

  return (
    <article className="rounded-lg border border-[#d0d7de] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#57606a]">
            <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 font-medium text-[#1f2328]">
              Rank #{position}
            </span>
            {providerTheme ? (
              <span className={`rounded-full border px-2 py-0.5 font-medium ${providerTheme.pillClass}`}>
                {providerTheme.label}
              </span>
            ) : null}
            <span>{event.channel}</span>
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

function sortEvents(
  events: Event[],
  rankMode: RankMode,
  profile: PreferenceProfile
) {
  const items = [...events];

  if (rankMode === "latest") {
    return items.sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  }

  if (rankMode === "rising") {
    return items.sort(
      (left, right) =>
        risingSignalScore(right, profile) - risingSignalScore(left, profile)
    );
  }

  return items.sort(
    (left, right) =>
      storyInterestScore(right, profile) - storyInterestScore(left, profile)
  );
}

export function NewsletterDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionFilter>("all");
  const [rankMode, setRankMode] = useState<RankMode>("for-you");
  const [profile, setProfile] = useState<PreferenceProfile>(() => readStoredProfile());
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    async function loadEvents() {
      try {
        const { data } = await supabase
          .from("events")
          .select("*")
          .eq("is_promoted", false)
          .order("created_at", { ascending: false })
          .limit(180);

        if (!active) {
          return;
        }

        if (data) {
          setEvents(data);
        }
      } catch {
        if (active) {
          setEvents([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvents();

    const channel = supabase
      .channel("ai-info-hub")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const nextEvent = payload.new as Event;

          if (nextEvent.is_promoted) {
            return;
          }

          setEvents((current) => [nextEvent, ...current].slice(0, 180));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const rememberEvent = useCallback((event: Event) => {
    setProfile((current) => learnFromEvent(current, event));
  }, []);

  const channels = useMemo(
    () => [...new Set(events.map((event) => event.channel))].sort(),
    [events]
  );

  const baseFilteredEvents = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return events.filter((event) => {
      if (selectedChannel && event.channel !== selectedChannel) {
        return false;
      }

      if (selectedSection !== "all" && resolveSection(event) !== selectedSection) {
        return false;
      }

      if (query && !getSearchText(event).includes(query)) {
        return false;
      }

      return true;
    });
  }, [deferredSearch, events, selectedChannel, selectedSection]);

  const orderedEvents = useMemo(
    () => sortEvents(baseFilteredEvents, rankMode, profile),
    [baseFilteredEvents, profile, rankMode]
  );

  const hero = orderedEvents[0] ?? null;
  const bodyEvents = orderedEvents.slice(1);

  const sectionData = useMemo(() => {
    const grouped: Record<SectionKey, Event[]> = {
      science: [],
      "big-3": [],
      "prompting-tools": [],
      "learning-tutorials": [],
      "media-ai": [],
      speculation: [],
      general: [],
    };

    for (const event of bodyEvents) {
      grouped[resolveSection(event)].push(event);
    }

    grouped.speculation.sort(
      (left, right) => (right.speculation_score ?? 0) - (left.speculation_score ?? 0)
    );

    return grouped;
  }, [bodyEvents]);

  const activeSections = useMemo(() => {
    if (selectedSection !== "all") {
      return sectionData[selectedSection].length > 0 ? [SECTION_LOOKUP[selectedSection]] : [];
    }

    return SECTIONS.filter((section) => sectionData[section.key].length > 0);
  }, [sectionData, selectedSection]);

  const personalizedStories = useMemo(
    () =>
      dedupeEvents(
        [...bodyEvents].sort(
          (left, right) =>
            storyInterestScore(right, profile) - storyInterestScore(left, profile)
        )
      ).slice(0, 4),
    [bodyEvents, profile]
  );

  const risingSignals = useMemo(
    () =>
      dedupeEvents(
        [...bodyEvents].sort(
          (left, right) =>
            risingSignalScore(right, profile) - risingSignalScore(left, profile)
        )
      ).slice(0, 4),
    [bodyEvents, profile]
  );

  const learningStories = useMemo(() => {
    const pool = selectedSection === "all"
      ? bodyEvents.filter(
          (event) =>
            resolveSection(event) === "learning-tutorials" ||
            resolveSection(event) === "prompting-tools"
        )
      : bodyEvents;

    return dedupeEvents(pool).slice(0, 4);
  }, [bodyEvents, selectedSection]);

  const hotTags = useMemo(() => topTags(orderedEvents, profile), [orderedEvents, profile]);

  const hasLearnedProfile = useMemo(
    () =>
      Object.keys(profile.sections).length > 0 ||
      Object.keys(profile.channels).length > 0 ||
      Object.keys(profile.tags).length > 0,
    [profile]
  );

  const learningBars = useMemo(
    () => topLearningBars(profile, activeSections.map((section) => section.key)),
    [activeSections, profile]
  );

  const totalSignals = orderedEvents.length;
  const snapshotEvents = totalSignals > 0 ? orderedEvents : events;
  const heroProviderTheme = hero ? getProviderTheme(hero) : null;
  const heroSectionTheme = hero ? getSectionTheme(resolveSection(hero)) : null;
  const heroSynopsis = hero ? getStorySynopsis(hero, profile) : null;
  const updateStory = risingSignals[0] || personalizedStories[0] || learningStories[0] || null;
  const updateSynopsis = updateStory ? getStorySynopsis(updateStory, profile) : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <div className="rounded-md border border-[#d0d7de] bg-white px-4 py-2 text-sm text-[#57606a] shadow-sm">
          Loading AI-Info Hub...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-[#1f2328]">
      <header className="sticky top-0 z-30 border-b border-[#d0d7de] bg-white/95 backdrop-blur">
        <div className="px-4 py-2.5 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-[#1f2328]">
                  AI-Info Hub
                </h1>
                <span className="rounded-full border border-[#1a7f37]/20 bg-[#dafbe1] px-2 py-0.5 text-xs font-medium text-[#1a7f37]">
                  Live
                </span>
                <span className="rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 py-0.5 text-xs text-[#57606a]">
                  {MODE_LABELS[rankMode]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#57606a]">
                Compact AI news with adaptive ranking, desk filters, and tutorial coverage.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#57606a]">
              <span>{formatEditionDate()}</span>
              <span>{totalSignals} visible stories</span>
              <span>{channels.length} sources</span>
            </div>
          </div>

          <div className="mt-2 grid gap-2.5 xl:grid-cols-[minmax(260px,420px)_auto]">
            <SearchBar value={search} onChange={setSearch} />
            <div className="flex flex-wrap gap-2">
              {(["latest", "for-you", "rising"] as RankMode[]).map((mode) => (
                <ModeButton
                  key={mode}
                  active={rankMode === mode}
                  onClick={() => setRankMode(mode)}
                >
                  {MODE_LABELS[mode]}
                </ModeButton>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedChannel(null);
                  setSelectedSection("all");
                  setRankMode("for-you");
                }}
                className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-xs font-medium text-[#57606a] hover:text-[#1f2328]"
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="mt-2 border-b border-[#d8dee4]">
            <div className="flex gap-4 overflow-x-auto hide-scrollbar">
              <FilterButton
                active={selectedSection === "all"}
                onClick={() => setSelectedSection("all")}
              >
                All desks
              </FilterButton>
              {SECTIONS.map((section) => (
                <FilterButton
                  key={section.key}
                  active={selectedSection === section.key}
                  onClick={() => {
                    setSelectedSection(section.key);
                    setProfile((current) => ({
                      ...current,
                      sections: {
                        ...current.sections,
                        [section.key]: (current.sections[section.key] || 0) + 1,
                      },
                    }));
                  }}
                >
                  {section.label}
                </FilterButton>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <ChannelFilter
              channels={channels}
              selected={selectedChannel}
              onSelect={(channel) => {
                setSelectedChannel(channel);

                if (channel) {
                  setProfile((current) => ({
                    ...current,
                    channels: incrementCounter(current.channels, channel, 1),
                  }));
                }
              }}
            />
          </div>
        </div>
      </header>

      <main className="w-full max-w-none px-4 py-4 sm:px-6 xl:px-8">
        {totalSignals === 0 ? (
          <div className="rounded-lg border border-[#d0d7de] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#57606a]">
              No stories match the current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top briefing row: hero + AI update */}
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="overflow-hidden rounded-lg border border-[#c7d0da] bg-white shadow-sm">
                {hero?.image_url ? (
                  <div className="relative h-24 w-full bg-[#f0f4f8] md:h-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hero.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#4b5563]">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${heroSectionTheme?.badgeClass ?? "bg-[#ddf4ff] text-[#0969da]"}`}>
                      Top story
                    </span>
                    {hero ? <span className="text-[#374151]">{SECTION_LOOKUP[resolveSection(hero)].label}</span> : null}
                    {heroProviderTheme ? (
                      <span className={`rounded-full border px-2 py-0.5 font-medium ${heroProviderTheme.pillClass}`}>
                        {heroProviderTheme.label}
                      </span>
                    ) : null}
                  </div>
                  {hero ? (
                    <div className="mt-2 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-[1.1rem] font-semibold leading-6 tracking-[-0.02em] text-[#111827] md:text-[1.2rem]">
                          {hero.title}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#374151]">
                          {heroSynopsis?.lead}
                        </p>
                        <div className={`mt-2 grid gap-1 rounded-md border border-[#c7d0da] p-2 text-[12px] leading-[1.4] ${heroSectionTheme?.panelClass ?? "bg-[#f6f8fa]"}`}>
                          <p className="text-[#111827]"><span className="font-semibold">Big deal:</span> {heroSynopsis?.bigDeal.replace(/^Big deal:\s*/i, "")}</p>
                          <p className="text-[#374151]"><span className="font-semibold text-[#111827]">The catch:</span> {heroSynopsis?.catchLine.replace(/^The catch:\s*/i, "")}</p>
                          <p className="text-[#374151]"><span className="font-semibold text-[#111827]">Why care:</span> {heroSynopsis?.careLine.replace(/^Why care:\s*/i, "")}</p>
                        </div>
                      </div>
                      <div className="rounded-md border border-[#9ca3af] bg-[#f8fafc] p-2">
                        <div className="space-y-1 text-xs text-[#4b5563]">
                          <div className="flex justify-between gap-2">
                            <span>Source</span>
                            <span className="font-semibold text-[#111827]">{hero.channel}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>Published</span>
                            <span className="font-semibold text-[#111827]">{formatTimestamp(hero.created_at)}</span>
                          </div>
                          {hero.speculation_score !== null ? (
                            <div className="flex justify-between gap-2">
                              <span>Spec</span>
                              <span className="font-semibold text-[#111827]">{hero.speculation_score}/10</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {hero.tags?.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full border border-[#9ca3af] bg-white px-1.5 py-0.5 text-[11px] text-[#4b5563]">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {hero.original_url ? (
                          <a
                            href={hero.original_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => rememberEvent(hero)}
                            className="mt-2 inline-flex text-xs font-semibold text-[#075fc0] hover:underline"
                          >
                            Open story
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#57606a]">No lead story yet.</p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-[#c7d0da] bg-white p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5563]">AI update</p>
                <h2 className="mt-0.5 text-base font-semibold text-[#111827]">What deserves attention</h2>
                <div className="mt-2.5 space-y-2">
                  {heroSynopsis ? (
                    <>
                      <div className="rounded border border-[#9ca3af] bg-[#f8fafc] p-2">
                        <p className="text-[10px] font-semibold uppercase text-[#4b5563]">Big deal</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-[1.4] text-[#111827]">{heroSynopsis.bigDeal.replace(/^Big deal:\s*/i, "")}</p>
                      </div>
                      <div className="rounded border border-[#b45309] bg-[#fff9db] p-2">
                        <p className="text-[10px] font-semibold uppercase text-[#9a6700]">The catch</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-[1.4] text-[#374151]">{heroSynopsis.catchLine.replace(/^The catch:\s*/i, "")}</p>
                      </div>
                      <div className="rounded border border-[#0969da] bg-[#eaf5ff] p-2">
                        <p className="text-[10px] font-semibold uppercase text-[#075fc0]">Worth opening?</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-[1.4] text-[#374151]">{heroSynopsis.careLine.replace(/^Why care:\s*/i, "")}</p>
                      </div>
                      {updateStory && updateSynopsis ? (
                        <div className="rounded border border-[#bf3989] bg-[#fff4fa] p-2">
                          <p className="text-[10px] font-semibold uppercase text-[#bf3989]">Next watch</p>
                          <p className="mt-0.5 line-clamp-2 text-xs font-medium text-[#111827]">{updateStory.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#4b5563]">{updateSynopsis.watchLine}</p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-[#57606a]">Waiting for the next cycle.</p>
                  )}
                </div>
              </section>
            </div>

            {/* Main body: editorial river (2/3) + intelligence rail (1/3) */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,340px)]">
              <div className="space-y-4">
                {activeSections.map((section) => (
                  <section
                    key={section.key}
                    id={`section-${section.key}`}
                    className="rounded-lg border border-[#c7d0da] bg-white p-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-0.5 border-b border-[#d8dee4] pb-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5563]">{section.description}</p>
                        <h2 className="mt-0.5 text-lg font-semibold text-[#111827]">{section.label}</h2>
                      </div>
                      <p className="text-xs text-[#4b5563]">{sectionData[section.key].length} stories</p>
                    </div>
                    {section.key === "speculation" ? (
                      <div className="mt-3 space-y-2">
                        {sectionData.speculation.map((event, index) => (
                          <SpeculationCard key={event.id} event={event} position={index + 1} onOpen={rememberEvent} />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {sectionData[section.key].map((event, index) => (
                          <div
                            key={event.id}
                            className={
                              index === 0 && activeSections[0]?.key === section.key
                                ? "md:col-span-2 [&_article]:border-l-4 [&_article]:border-l-[#0969da]"
                                : index === 0
                                  ? "md:col-span-2"
                                  : undefined
                            }
                          >
                            <StoryCard
                              event={event}
                              featured={index === 0}
                              note={index === 0 ? "Desk lead" : undefined}
                              onOpen={rememberEvent}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <div className="space-y-3">
                <section className="rounded-lg border border-[#c7d0da] bg-white p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5563]">For you</p>
                  <h2 className="mt-0.5 text-base font-semibold text-[#111827]">{hasLearnedProfile ? "Adaptive picks" : "Learning your mix"}</h2>
                  <div className="mt-2.5 space-y-2">
                    {personalizedStories.slice(0, 3).map((event) => (
                      <CompactStory key={event.id} event={event} label={whyThisStory(event, profile)} onOpen={rememberEvent} />
                    ))}
                  </div>
                </section>
                <section className="rounded-lg border border-[#c7d0da] bg-white p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5563]">Rising now</p>
                  <h2 className="mt-0.5 text-base font-semibold text-[#111827]">Stories climbing fastest</h2>
                  <div className="mt-2.5 space-y-2">
                    {risingSignals.slice(0, 4).map((event, index) => (
                      <CompactStory key={event.id} event={event} label={index === 0 ? "Highest momentum" : "Trending up"} onOpen={rememberEvent} />
                    ))}
                  </div>
                </section>
                <section className="rounded-lg border border-[#c7d0da] bg-white p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5563]">Learning & tutorials</p>
                  <h2 className="mt-0.5 text-base font-semibold text-[#111827]">Practical guides</h2>
                  <div className="mt-2.5 space-y-2">
                    {learningStories.length > 0 ? (
                      learningStories.map((event, index) => (
                        <CompactStory
                          key={event.id}
                          event={event}
                          label={index === 0 ? "Hands-on" : SECTION_LOOKUP[resolveSection(event)].label}
                          onOpen={rememberEvent}
                        />
                      ))
                    ) : (
                      <p className="rounded border border-[#d8dee4] bg-[#f6f8fa] p-2 text-xs text-[#57606a]">No tutorial-heavy stories match filters.</p>
                    )}
                  </div>
                </section>
                <KpiCards events={snapshotEvents} />
                <EventsChart events={snapshotEvents} />
                <section className="rounded-lg border border-[#c7d0da] bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5563]">Reader model</p>
                      <h2 className="mt-0.5 text-base font-semibold text-[#111827]">What the hub is learning</h2>
                    </div>
                    <button type="button" onClick={() => setProfile(EMPTY_PROFILE)} className="rounded border border-[#9ca3af] bg-white px-2 py-0.5 text-[11px] font-medium text-[#4b5563] hover:text-[#111827]">
                      Reset
                    </button>
                  </div>
                  <div className="mt-2.5 space-y-2">
                    {learningBars.map((bar) => (
                      <div key={bar.key}>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#4b5563]">
                          <span>{bar.label}</span>
                          <span className="font-medium text-[#111827]">{bar.value}</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-[#e5e7eb]">
                          <div className="h-1 rounded-full bg-[#0969da]" style={{ width: bar.width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {hotTags.length > 0 ? (
              <section className="rounded-lg border border-[#c7d0da] bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#4b5563]">Hot tags</span>
                  {hotTags.map((tag) => (
                    <span key={tag} className="rounded-full border border-[#9ca3af] bg-[#f6f8fa] px-2 py-0.5 text-xs text-[#4b5563]">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
