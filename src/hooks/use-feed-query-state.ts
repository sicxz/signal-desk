"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RankMode, SectionFilter, SECTIONS } from "@/lib/feed";

const SECTION_KEYS = new Set<string>(SECTIONS.map((section) => section.key));

function sanitizeSection(value: string | null): SectionFilter {
  if (value && SECTION_KEYS.has(value)) {
    return value as SectionFilter;
  }

  return "all";
}

function sanitizeRank(
  value: string | null,
  options: RankMode[],
  fallback: RankMode
): RankMode {
  return value && options.includes(value as RankMode)
    ? (value as RankMode)
    : fallback;
}

export function useFeedQueryState({
  allowPersonalRank,
  fallbackRank,
}: {
  allowPersonalRank: boolean;
  fallbackRank: RankMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const availableRankModes = useMemo(
    () =>
      allowPersonalRank
        ? (["latest", "for-you", "rising"] as RankMode[])
        : (["latest", "rising"] as RankMode[]),
    [allowPersonalRank]
  );
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const selectedSourceId = searchParams.get("source");
  const selectedSection = sanitizeSection(searchParams.get("section"));
  const rankMode = sanitizeRank(
    searchParams.get("rank"),
    availableRankModes,
    fallbackRank
  );

  const patchQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      }

      const query = nextParams.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams]
  );

  const setSelectedSourceId = useCallback(
    (sourceId: string | null) => {
      patchQuery({ source: sourceId });
    },
    [patchQuery]
  );

  const setSelectedSection = useCallback(
    (section: SectionFilter) => {
      patchQuery({ section: section === "all" ? null : section });
    },
    [patchQuery]
  );

  const setRankMode = useCallback(
    (nextRankMode: RankMode) => {
      patchQuery({
        rank: nextRankMode === fallbackRank ? null : nextRankMode,
      });
    },
    [fallbackRank, patchQuery]
  );

  const setSearchQuery = useCallback(
    (nextSearch: string) => {
      setSearch(nextSearch);
      patchQuery({ q: nextSearch.trim() || null });
    },
    [patchQuery]
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    patchQuery({
      q: null,
      source: null,
      section: null,
      rank: null,
    });
  }, [patchQuery]);

  return {
    search,
    selectedSourceId,
    selectedSection,
    rankMode,
    availableRankModes,
    setSelectedSourceId,
    setSelectedSection,
    setRankMode,
    setSearchQuery,
    resetFilters,
  };
}
