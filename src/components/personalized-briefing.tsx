"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
  dedupeEvents,
  formatEditionDate,
  formatTimestamp,
  getEventSourceName,
  getStorySynopsis,
  resolveSection,
  sortEvents,
  topTags,
  whyThisStory,
} from "@/lib/feed";
import { Event } from "@/lib/types";
import { CompactStory, StoryCard } from "@/components/story-cards";
import { useLiveFeedData } from "@/hooks/use-live-feed-data";
import { useReaderProfile } from "@/hooks/use-reader-profile";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-[#111827] text-white"
          : "border border-[#d0d7de] bg-white text-[#57606a] hover:text-[#111827]"
      }`}
    >
      {children}
    </Link>
  );
}

export function PersonalizedBriefing() {
  const pathname = usePathname();
  const { events, sources, loading } = useLiveFeedData();
  const readerProfile = useReaderProfile({
    enabled: true,
    sources,
  });
  const effectiveProfile = readerProfile.profile;
  const hasLearnedProfile = readerProfile.hasLearnedProfile;
  const rankedStories = useMemo(
    () =>
      hasLearnedProfile
        ? sortEvents(events, "for-you", effectiveProfile)
        : dedupeEvents([
            ...sortEvents(events, "latest", effectiveProfile).slice(0, 6),
            ...sortEvents(events, "rising", effectiveProfile).slice(0, 6),
          ]),
    [effectiveProfile, events, hasLearnedProfile]
  );
  const topStory = rankedStories[0] || null;
  const supportingStories = rankedStories.slice(1, 5);
  const watchNext = sortEvents(events, "rising", effectiveProfile)[0] || null;
  const themeTags = useMemo(() => topTags(rankedStories).slice(0, 6), [rankedStories]);
  const favoredSources = useMemo(
    () =>
      Object.entries(effectiveProfile.sourceWeights)
        .map(([id, value]) => ({
          source: sources.find((candidate) => candidate.id === id) || null,
          value,
        }))
        .filter(
          (entry): entry is { source: (typeof sources)[number]; value: number } =>
            Boolean(entry.source)
        )
        .sort((left, right) => right.value - left.value)
        .slice(0, 5),
    [effectiveProfile.sourceWeights, sources]
  );

  useEffect(() => {
    if (!topStory) {
      return;
    }

    const dwellTimer = window.setTimeout(() => {
      void readerProfile.trackInteraction({
        section: resolveSection(topStory),
        sourceId: topStory.source_id,
        tags: topStory.tags?.slice(0, 3),
        sectionDelta: 1,
        sourceDelta: 1,
        tagDelta: 1,
        lastViewedSourceId: topStory.source_id,
      });
    }, 12000);

    return () => window.clearTimeout(dwellTimer);
  }, [readerProfile, topStory]);

  const rememberEvent = useCallback(
    (event: Event) => {
      void readerProfile.trackInteraction({
        section: resolveSection(event),
        sourceId: event.source_id,
        tags: event.tags?.slice(0, 4),
        sectionDelta: 2,
        sourceDelta: 2,
        tagDelta: 1,
        lastViewedSourceId: event.source_id,
      });
    },
    [readerProfile]
  );

  if (loading || readerProfile.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <div className="rounded-lg border border-[#d0d7de] bg-white px-4 py-2 text-sm text-[#57606a] shadow-sm">
          Loading personalized briefing...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-[#1f2328]">
      <header className="sticky top-0 z-30 border-b border-[#d0d7de] bg-white/95 backdrop-blur">
        <div className="px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#57606a]">
                Personalized memo
              </p>
              <h1 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[#111827]">
                Briefing
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#57606a]">
                A combined daily read of the AI desk, ranked by what you keep opening,
                what sources you lean toward, and what themes are building
                locally in this browser.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <NavLink href="/" active={pathname === "/" || pathname === "/feed"}>
                  Feed
                </NavLink>
                <NavLink href="/briefing" active={pathname === "/briefing"}>
                  Briefing
                </NavLink>
                <NavLink href="/shared" active={pathname === "/shared"}>
                  Shared
                </NavLink>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="flex flex-wrap gap-3 text-xs text-[#57606a]">
                <span>{formatEditionDate()}</span>
                <span>{rankedStories.length} candidate stories</span>
                <span>{sources.length} active sources</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="grid gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[minmax(0,1.6fr)_340px] xl:px-8">
        <div className="space-y-4">
          {!hasLearnedProfile ? (
            <section className="rounded-xl border border-[#d0d7de] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                Cold start briefing
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                Learning your desk locally
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#57606a]">
                This page starts with a blend of the latest desk signals and rising
                stories, then adapts locally as you open more stories and spend time with
                the sources you trust most.
              </p>
            </section>
          ) : null}

          {topStory ? (
            <StoryCard
              event={topStory}
              featured
              note={hasLearnedProfile ? "Top pick for you" : "Cold-start lead"}
              profile={effectiveProfile}
              onOpen={rememberEvent}
            />
          ) : null}

          <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3 border-b border-[#e5e7eb] pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                  Why these are surfacing
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                  Top picks for this briefing
                </h2>
              </div>
              <p className="text-xs text-[#57606a]">
                Personalized locally by sections, tags, and source affinity
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {supportingStories.map((event) => (
                <div key={event.id} className="space-y-2 rounded-xl border border-[#d0d7de] bg-[#fbfcfd] p-3">
                  <CompactStory
                    event={event}
                    label={whyThisStory(event, effectiveProfile)}
                    profile={effectiveProfile}
                    onOpen={rememberEvent}
                  />
                  <div className="rounded-lg border border-[#d8dee4] bg-white p-3 text-sm leading-6 text-[#57606a]">
                    {getStorySynopsis(event, effectiveProfile).careLine}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-3 xl:sticky xl:top-[6.5rem] xl:self-start">
          <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
              Sources you’re leaning toward
            </p>
            <div className="mt-3 space-y-2">
              {favoredSources.length > 0 ? (
                favoredSources.map(({ source, value }) => (
                  <div
                    key={source.id}
                    className="rounded-lg border border-[#d0d7de] bg-[#fbfcfd] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[#111827]">{source.name}</span>
                      <span className="text-xs text-[#57606a]">{value}</span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#57606a]">
                      {source.tag}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#57606a]">
                  Once you start opening stories, this panel will learn which newsletters
                  keep pulling you back.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
              Themes building across sources
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {themeTags.length > 0 ? (
                themeTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 py-0.5 text-xs text-[#57606a]"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[#57606a]">
                  As the desk fills out, repeated tags and topics will show up here.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
              Watch next
            </p>
            {watchNext ? (
              <div className="mt-3 rounded-xl border border-[#d0d7de] bg-[#fbfcfd] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0969da]">
                  Rising signal
                </p>
                <h2 className="mt-2 text-base font-semibold text-[#111827]">
                  {watchNext.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#57606a]">
                  {getStorySynopsis(watchNext, effectiveProfile).watchLine}
                </p>
                <div className="mt-3 text-xs text-[#57606a]">
                  {getEventSourceName(watchNext)} · {formatTimestamp(watchNext.created_at)}
                </div>
                {watchNext.original_url ? (
                  <a
                    href={watchNext.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => rememberEvent(watchNext)}
                    className="mt-3 inline-flex text-xs font-semibold text-[#0969da] hover:underline"
                  >
                    Open story
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#57606a]">
                No rising signal yet. Once more stories land, this becomes your next-watch panel.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
