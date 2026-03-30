import { Source } from "@/lib/types";

export type CounterMap = Record<string, number>;

export type SignalProfileState = {
  sectionWeights: CounterMap;
  sourceWeights: CounterMap;
  tagWeights: CounterMap;
  lastViewedSourceId: string | null;
};

export type LegacyPreferenceProfile = {
  sections: CounterMap;
  channels: CounterMap;
  tags: CounterMap;
};

export type ProfileInteraction = {
  section?: string | null;
  sourceId?: string | null;
  tags?: string[] | null;
  sectionDelta?: number;
  sourceDelta?: number;
  tagDelta?: number;
  lastViewedSourceId?: string | null;
};

export const LEGACY_PROFILE_STORAGE_KEY = "ai-info-hub-reader-profile-v1";
export const LOCAL_PROFILE_STORAGE_KEY = "signal-desk-reader-profile-v2";

export const EMPTY_SIGNAL_PROFILE: SignalProfileState = {
  sectionWeights: {},
  sourceWeights: {},
  tagWeights: {},
  lastViewedSourceId: null,
};

function normalizeCounterMap(input: unknown): CounterMap {
  if (!input || typeof input !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).flatMap(([key, value]) => {
      const numericValue =
        typeof value === "number" && Number.isFinite(value)
          ? Math.max(0, Math.round(value))
          : 0;

      return key && numericValue > 0 ? [[key, numericValue]] : [];
    })
  );
}

export function readLegacyLocalProfile(): LegacyPreferenceProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    return {
      sections: normalizeCounterMap(parsed?.sections),
      channels: normalizeCounterMap(parsed?.channels),
      tags: normalizeCounterMap(parsed?.tags),
    };
  } catch {
    return null;
  }
}

export function clearLegacyLocalProfile() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
  } catch {}
}

export function readLocalProfile(): SignalProfileState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    return {
      sectionWeights: normalizeCounterMap(parsed?.sectionWeights),
      sourceWeights: normalizeCounterMap(parsed?.sourceWeights),
      tagWeights: normalizeCounterMap(parsed?.tagWeights),
      lastViewedSourceId:
        typeof parsed?.lastViewedSourceId === "string"
          ? parsed.lastViewedSourceId
          : null,
    };
  } catch {
    return null;
  }
}

export function writeLocalProfile(profile: SignalProfileState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

function incrementCounter(
  values: CounterMap,
  key: string,
  amount: number
): CounterMap {
  if (!key || amount <= 0) {
    return values;
  }

  return {
    ...values,
    [key]: (values[key] || 0) + amount,
  };
}

export function applyProfileInteraction(
  current: SignalProfileState,
  interaction: ProfileInteraction
): SignalProfileState {
  const next: SignalProfileState = {
    sectionWeights: { ...current.sectionWeights },
    sourceWeights: { ...current.sourceWeights },
    tagWeights: { ...current.tagWeights },
    lastViewedSourceId:
      interaction.lastViewedSourceId ?? interaction.sourceId ?? current.lastViewedSourceId,
  };

  if (interaction.section) {
    next.sectionWeights = incrementCounter(
      next.sectionWeights,
      interaction.section,
      interaction.sectionDelta ?? 1
    );
  }

  if (interaction.sourceId) {
    next.sourceWeights = incrementCounter(
      next.sourceWeights,
      interaction.sourceId,
      interaction.sourceDelta ?? 1
    );
  }

  for (const tag of interaction.tags || []) {
    next.tagWeights = incrementCounter(
      next.tagWeights,
      tag,
      interaction.tagDelta ?? 1
    );
  }

  return next;
}

export function hasLearnedSignals(profile: SignalProfileState) {
  return (
    Object.keys(profile.sectionWeights).length > 0 ||
    Object.keys(profile.sourceWeights).length > 0 ||
    Object.keys(profile.tagWeights).length > 0
  );
}

export function mergeLegacyProfileIntoState(
  current: SignalProfileState,
  legacy: LegacyPreferenceProfile | null,
  sources: Source[]
): SignalProfileState {
  if (!legacy) {
    return current;
  }

  const next: SignalProfileState = {
    sectionWeights: { ...current.sectionWeights },
    sourceWeights: { ...current.sourceWeights },
    tagWeights: { ...current.tagWeights },
    lastViewedSourceId: current.lastViewedSourceId,
  };

  for (const [key, value] of Object.entries(legacy.sections)) {
    next.sectionWeights = incrementCounter(next.sectionWeights, key, value);
  }

  for (const [key, value] of Object.entries(legacy.tags)) {
    next.tagWeights = incrementCounter(next.tagWeights, key, value);
  }

  for (const [channel, value] of Object.entries(legacy.channels)) {
    const matches = sources.filter((source) => source.tag === channel);

    if (matches.length === 0) {
      continue;
    }

    const perSource = Math.max(1, Math.round(value / matches.length));

    for (const source of matches) {
      next.sourceWeights = incrementCounter(
        next.sourceWeights,
        source.id,
        perSource
      );
    }
  }

  return next;
}
