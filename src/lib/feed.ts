import { Event, Source } from "@/lib/types";
import { SignalProfileState } from "@/lib/reader-profile";

export const SECTIONS = [
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

export type SectionKey = (typeof SECTIONS)[number]["key"];
export type SectionFilter = SectionKey | "all";
export type RankMode = "latest" | "for-you" | "rising";
export type DashboardMode = "personal" | "shared";
export type BriefingWindowHours = 24 | 72 | 168;

export type SourceBriefing = {
  source: Source;
  windowHours: BriefingWindowHours;
  windowLabel: string;
  storyCount: number;
  events: Event[];
  topStories: Event[];
  recurringTags: string[];
  lastPublishedAt: string | null;
  averageSpeculation: number;
  toneLabel: string;
  lead: string;
  catchLine: string;
  careLine: string;
};

const SECTION_LOOKUP = Object.fromEntries(
  SECTIONS.map((section) => [section.key, section])
) as Record<SectionKey, (typeof SECTIONS)[number]>;

export function getSectionLabel(section: SectionKey) {
  return SECTION_LOOKUP[section].label;
}

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

const BRIEFING_WINDOWS: { hours: BriefingWindowHours; label: string }[] = [
  { hours: 24, label: "Last 24 hours" },
  { hours: 72, label: "Last 72 hours" },
  { hours: 168, label: "Last 7 days" },
];

function splitIntoSentences(text: string) {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return matches ? matches.map((sentence) => sentence.trim()) : [];
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.!?]+$/, "");
}

export function formatEditionDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function formatTimestamp(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getSectionTheme(section: SectionKey) {
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

export function getProviderTheme(event: Event) {
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

export function scoreTone(score: number | null) {
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

export function getEventSourceName(event: Event) {
  return event.source?.name || event.channel;
}

export function getSearchText(event: Event) {
  return [
    event.title,
    event.summary,
    event.description,
    event.channel,
    event.source?.name,
    event.source?.tag,
    event.topic,
    event.section,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function resolveSection(event: Event): SectionKey {
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

export function getSummary(event: Event) {
  return (
    event.summary ||
    event.description ||
    "No summary is available for this story yet."
  );
}

export function getStorySynopsis(
  event: Event,
  profile: SignalProfileState
) {
  const summary = getSummary(event);
  const section = resolveSection(event);
  const providerTheme = getProviderTheme(event);
  const sentences = splitIntoSentences(summary);
  const sourceWeight = event.source_id
    ? profile.sourceWeights[event.source_id] || 0
    : 0;

  if (event.big_deal && event.catch && event.why_care) {
    const storedLead = event.big_deal.replace(/^Big deal:\s*/i, "");
    const watchLine = sentences[1]
      ? `Watch for: ${stripTrailingPunctuation(sentences[1])}.`
      : "Watch for: whether this turns into rollout, benchmarks, or a real workflow shift.";

    return {
      lead: storedLead,
      bigDeal: event.big_deal.match(/^Big deal:/i)
        ? event.big_deal
        : `Big deal: ${event.big_deal}`,
      catchLine: event.catch.match(/^The catch:/i)
        ? event.catch
        : `The catch: ${event.catch}`,
      careLine: event.why_care.match(/^Why care:/i)
        ? event.why_care
        : `Why care: ${event.why_care}`,
      watchLine,
    };
  }

  const leadSentence =
    sentences[0] ||
    `${event.title} is the most important signal in ${SECTION_LOOKUP[
      section
    ].label.toLowerCase()} right now.`;

  let catchLine = "The catch: the downstream impact matters more than the headline.";

  if ((event.speculation_score ?? 0) >= 7) {
    catchLine =
      "The catch: this is still a high-noise signal, so treat it as direction rather than settled fact.";
  } else if (section === "science") {
    catchLine =
      "The catch: strong research headlines still need replication, benchmarks, or product follow-through.";
  } else if (section === "learning-tutorials") {
    catchLine =
      "The catch: it only matters if the workflow is reusable, not just clever in a demo.";
  } else if (section === "prompting-tools") {
    catchLine =
      "The catch: tool news is only meaningful if it saves time, removes friction, or improves evaluation.";
  } else if (section === "media-ai") {
    catchLine =
      "The catch: visual AI demos can outrun reliability, rights, or production readiness.";
  } else if (providerTheme?.label === "OpenAI") {
    catchLine =
      "The catch: the real effect depends on rollout, pricing, and whether access reaches your workflow.";
  } else if (providerTheme?.label === "Gemini") {
    catchLine =
      "The catch: product integration matters more than isolated model claims.";
  } else if (providerTheme?.label === "Claude") {
    catchLine =
      "The catch: quality alone does not matter unless the workflow fit and adoption follow.";
  }

  let careLine =
    "Why care: this is worth opening if it changes your picture of what matters next.";

  if ((profile.sectionWeights[section] || 0) >= 3) {
    careLine = `Why care: this overlaps with your recent interest in ${SECTION_LOOKUP[
      section
    ].label.toLowerCase()}.`;
  } else if (sourceWeight >= 3) {
    careLine = `Why care: you have been leaning toward ${getEventSourceName(
      event
    )} lately.`;
  } else if (section === "big-3") {
    careLine =
      "Why care: upstream platform moves tend to reshape tools, pricing, and product bets across the rest of the market.";
  } else if (section === "prompting-tools") {
    careLine =
      "Why care: this could change how quickly you build, prompt, ship, or evaluate AI systems.";
  } else if (section === "learning-tutorials") {
    careLine =
      "Why care: this is the kind of story you open when you want something practical today, not just industry chatter.";
  } else if (section === "science") {
    careLine =
      "Why care: research signals often show where product capabilities and benchmarks are heading next.";
  } else if (section === "media-ai") {
    careLine =
      "Why care: media tooling shifts can change creative workflow, cost, and quality expectations quickly.";
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

export function storyInterestScore(
  event: Event,
  profile: SignalProfileState
) {
  const section = resolveSection(event);
  const ageHours =
    (Date.now() - new Date(event.created_at).getTime()) / (1000 * 60 * 60);
  const freshness = Math.max(0, 42 - ageHours) / 3.5;
  const sectionWeight = profile.sectionWeights[section] || 0;
  const sourceWeight = event.source_id
    ? profile.sourceWeights[event.source_id] || 0
    : 0;
  const tagWeight = (event.tags || []).reduce(
    (sum, tag) => sum + (profile.tagWeights[tag] || 0),
    0
  );

  return (
    freshness +
    SECTION_BASE_WEIGHT[section] * 2 +
    sectionWeight * 1.55 +
    sourceWeight * 0.9 +
    tagWeight * 0.3 +
    (event.speculation_score ?? 0) * (section === "speculation" ? 0.45 : 0.08)
  );
}

export function risingSignalScore(
  event: Event,
  profile: SignalProfileState
) {
  const ageHours =
    (Date.now() - new Date(event.created_at).getTime()) / (1000 * 60 * 60);

  return (
    Math.max(0, 20 - ageHours) +
    storyInterestScore(event, profile) * 0.3 +
    (event.speculation_score ?? 0) * 0.55 +
    (event.tags?.length || 0) * 0.35
  );
}

export function dedupeEvents(events: Event[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    if (seen.has(event.id)) {
      return false;
    }
    seen.add(event.id);
    return true;
  });
}

export function sortEvents(
  events: Event[],
  rankMode: RankMode,
  profile: SignalProfileState
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

export function whyThisStory(event: Event, profile: SignalProfileState) {
  const section = resolveSection(event);
  const sectionWeight = profile.sectionWeights[section] || 0;
  const sourceWeight = event.source_id
    ? profile.sourceWeights[event.source_id] || 0
    : 0;
  const tagHit = (event.tags || []).find(
    (tag) => (profile.tagWeights[tag] || 0) > 0
  );

  if (sourceWeight >= 3) {
    return `Strong source match: ${getEventSourceName(event)}`;
  }

  if (sectionWeight >= 3) {
    return `You keep returning to ${SECTION_LOOKUP[
      section
    ].label.toLowerCase()}`;
  }

  if (tagHit) {
    return `Tag match: ${tagHit}`;
  }

  return "Fresh signal";
}

export function topLearningBars(
  profile: SignalProfileState,
  activeSections: SectionKey[]
) {
  const ranked = SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    value: profile.sectionWeights[section.key] || 0,
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

export function topTags(events: Event[]) {
  const scores = new Map<string, number>();

  for (const event of events) {
    for (const tag of event.tags || []) {
      scores.set(tag, (scores.get(tag) || 0) + 1);
    }
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([tag]) => tag);
}

export function buildSourceRailData(events: Event[], sources: Source[]) {
  const counts = new Map<string, number>();
  const latestBySource = new Map<string, number>();

  for (const event of events) {
    if (!event.source_id) {
      continue;
    }

    counts.set(event.source_id, (counts.get(event.source_id) || 0) + 1);

    const timestamp = new Date(event.created_at).getTime();
    const currentLatest = latestBySource.get(event.source_id) || 0;
    latestBySource.set(event.source_id, Math.max(currentLatest, timestamp));
  }

  return [...sources].sort((left, right) => {
    const leftLatest = latestBySource.get(left.id) || 0;
    const rightLatest = latestBySource.get(right.id) || 0;

    if (leftLatest && rightLatest) {
      return rightLatest - leftLatest;
    }

    if (leftLatest) {
      return -1;
    }

    if (rightLatest) {
      return 1;
    }

    return left.name.localeCompare(right.name);
  }).map((source) => ({
    source,
    storyCount: counts.get(source.id) || 0,
    latestTimestamp: latestBySource.get(source.id) || null,
  }));
}

export function buildSourceBriefing(source: Source, events: Event[]): SourceBriefing {
  const latestFirst = [...events].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  const selectedWindow =
    BRIEFING_WINDOWS.find(({ hours }) => {
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      return latestFirst.some(
        (event) => new Date(event.created_at).getTime() >= cutoff
      );
    }) || BRIEFING_WINDOWS[BRIEFING_WINDOWS.length - 1];

  const cutoff = Date.now() - selectedWindow.hours * 60 * 60 * 1000;
  const windowEvents = latestFirst.filter(
    (event) => new Date(event.created_at).getTime() >= cutoff
  );
  const briefingEvents = windowEvents.length > 0 ? windowEvents : latestFirst.slice(0, 5);
  const topStories = briefingEvents.slice(0, 5);
  const recurringTags = topTags(briefingEvents).slice(0, 5);
  const averageSpeculation =
    briefingEvents.length > 0
      ? Math.round(
          briefingEvents.reduce(
            (sum, event) => sum + (event.speculation_score ?? 0),
            0
          ) / briefingEvents.length
        )
      : 0;
  const leadStory = topStories[0] || null;
  const leadSynopsis = leadStory
      ? getStorySynopsis(leadStory, {
        sectionWeights: {},
        sourceWeights: {},
        tagWeights: {},
        lastViewedSourceId: source.id,
      })
    : null;

  return {
    source,
    windowHours: selectedWindow.hours,
    windowLabel: selectedWindow.label,
    storyCount: briefingEvents.length,
    events: briefingEvents,
    topStories,
    recurringTags,
    lastPublishedAt: leadStory?.created_at || null,
    averageSpeculation,
    toneLabel: scoreTone(averageSpeculation).label,
    lead:
      leadStory?.big_deal ||
      leadSynopsis?.bigDeal ||
      `${source.name} has not produced enough recent stories for a stronger daily readout yet.`,
    catchLine:
      leadStory?.catch ||
      leadSynopsis?.catchLine ||
      "The catch: there is not enough recent signal yet to separate trend from noise.",
    careLine:
      leadStory?.why_care ||
      leadSynopsis?.careLine ||
      "Why care: even a quieter source view helps you separate repeat coverage from isolated headlines.",
  };
}
