"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import {
  DashboardMode,
  RankMode,
  SECTIONS,
  SectionFilter,
  buildSourceBriefing,
  buildSourceRailData,
  dedupeEvents,
  formatEditionDate,
  resolveSection,
  sortEvents,
  topLearningBars,
  topTags,
  whyThisStory,
} from "@/lib/feed";
import { EMPTY_SIGNAL_PROFILE } from "@/lib/reader-profile";
import { Event } from "@/lib/types";
import { EventsChart } from "@/components/events-chart";
import { KpiCards } from "@/components/kpi-cards";
import { SearchBar } from "@/components/search-bar";
import { SourceBriefingPanel } from "@/components/source-briefing-panel";
import { SourceRail } from "@/components/source-rail";
import { CompactStory, SpeculationCard, StoryCard } from "@/components/story-cards";
import { useFeedQueryState } from "@/hooks/use-feed-query-state";
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[#0969da] bg-[#eaf5ff] text-[#0969da]"
          : "border-[#d0d7de] bg-white text-[#57606a] hover:border-[#8c959f] hover:text-[#111827]"
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
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[#111827] bg-[#111827] text-white"
          : "border-[#d0d7de] bg-white text-[#57606a] hover:text-[#111827]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#d0d7de] bg-white p-8 text-center shadow-sm">
      <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
      <p className="mt-2 text-sm text-[#57606a]">{body}</p>
    </div>
  );
}

export function NewsletterDashboard({
  mode = "personal",
}: {
  mode?: DashboardMode;
}) {
  const pathname = usePathname();
  const isSharedView = mode === "shared";
  const { events: attachedEvents, sources, loading } = useLiveFeedData();
  const readerProfile = useReaderProfile({
    enabled: !isSharedView,
    sources,
  });
  const allowPersonalRank = !isSharedView;
  const defaultRank: RankMode = allowPersonalRank ? "for-you" : "latest";
  const {
    search,
    selectedSourceId,
    selectedSection,
    rankMode,
    availableRankModes,
    setRankMode,
    setSearchQuery,
    setSelectedSection,
    setSelectedSourceId,
    resetFilters,
  } = useFeedQueryState({
    allowPersonalRank,
    fallbackRank: defaultRank,
  });
  const deferredSearch = useDeferredValue(search);
  const effectiveProfile = allowPersonalRank
    ? readerProfile.profile
    : EMPTY_SIGNAL_PROFILE;
  const selectedSource =
    sources.find((source) => source.id === selectedSourceId) || null;

  useEffect(() => {
    if (!selectedSourceId) {
      return;
    }

    const exists = sources.some((source) => source.id === selectedSourceId);

    if (!exists && sources.length > 0) {
      setSelectedSourceId(null);
    }
  }, [selectedSourceId, setSelectedSourceId, sources]);

  const rememberEvent = useCallback(
    (event: Event) => {
      if (!allowPersonalRank) {
        return;
      }

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
    [allowPersonalRank, readerProfile]
  );

  const sourceRail = useMemo(
    () => buildSourceRailData(attachedEvents, sources),
    [attachedEvents, sources]
  );

  const filteredEvents = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return attachedEvents.filter((event) => {
      if (selectedSourceId && event.source_id !== selectedSourceId) {
        return false;
      }

      if (selectedSection !== "all" && resolveSection(event) !== selectedSection) {
        return false;
      }

      if (query) {
        const haystack = [
          event.title,
          event.summary,
          event.description,
          event.source?.name,
          event.channel,
          ...(event.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [attachedEvents, deferredSearch, selectedSection, selectedSourceId]);

  const orderedEvents = useMemo(
    () => sortEvents(filteredEvents, rankMode, effectiveProfile),
    [effectiveProfile, filteredEvents, rankMode]
  );

  const hero = orderedEvents[0] || null;
  const remainder = orderedEvents.slice(1);

  const sectionData = useMemo(() => {
    return SECTIONS.reduce<Record<(typeof SECTIONS)[number]["key"], Event[]>>(
      (grouped, section) => {
        grouped[section.key] = remainder.filter(
          (event) => resolveSection(event) === section.key
        );

        if (section.key === "speculation") {
          grouped[section.key].sort(
            (left, right) =>
              (right.speculation_score ?? 0) - (left.speculation_score ?? 0)
          );
        }

        return grouped;
      },
      {
        science: [],
        "big-3": [],
        "prompting-tools": [],
        "learning-tutorials": [],
        "media-ai": [],
        speculation: [],
        general: [],
      }
    );
  }, [remainder]);

  const activeSections = useMemo(() => {
    if (selectedSource) {
      return [];
    }

    if (selectedSection !== "all") {
      return SECTIONS.filter(
        (section) =>
          section.key === selectedSection && sectionData[section.key].length > 0
      );
    }

    return SECTIONS.filter((section) => sectionData[section.key].length > 0);
  }, [sectionData, selectedSection, selectedSource]);

  const personalizedStories = useMemo(
    () =>
      dedupeEvents(sortEvents(orderedEvents, "for-you", effectiveProfile)).slice(0, 4),
    [effectiveProfile, orderedEvents]
  );

  const risingStories = useMemo(
    () => sortEvents(orderedEvents, "rising", effectiveProfile).slice(0, 4),
    [effectiveProfile, orderedEvents]
  );

  const learningStories = useMemo(
    () =>
      orderedEvents
        .filter((event) => {
          const section = resolveSection(event);
          return (
            section === "learning-tutorials" || section === "prompting-tools"
          );
        })
        .slice(0, 4),
    [orderedEvents]
  );

  const sourceBriefing = useMemo(
    () =>
      selectedSource
        ? buildSourceBriefing(
            selectedSource,
            orderedEvents.filter((event) => event.source_id === selectedSource.id)
          )
        : null,
    [orderedEvents, selectedSource]
  );

  useEffect(() => {
    if (!allowPersonalRank || !selectedSource || !sourceBriefing) {
      return;
    }

    const dwellTimer = window.setTimeout(() => {
      const leadStory = sourceBriefing.topStories[0];
      void readerProfile.trackInteraction({
        sourceId: selectedSource.id,
        section: leadStory ? resolveSection(leadStory) : null,
        tags: sourceBriefing.recurringTags.slice(0, 2),
        sourceDelta: 1,
        sectionDelta: leadStory ? 1 : 0,
        tagDelta: 1,
        lastViewedSourceId: selectedSource.id,
      });
    }, 12000);

    return () => window.clearTimeout(dwellTimer);
  }, [allowPersonalRank, readerProfile, selectedSource, sourceBriefing]);

  const hotTags = useMemo(() => topTags(orderedEvents), [orderedEvents]);
  const learningBars = useMemo(
    () =>
      topLearningBars(
        effectiveProfile,
        activeSections.map((section) => section.key)
      ),
    [activeSections, effectiveProfile]
  );

  const statsEvents = orderedEvents.length > 0 ? orderedEvents : attachedEvents;
  const headerTitle = isSharedView ? "Signal Desk // Shared" : "Signal Desk";
  const headerSubtitle = isSharedView
    ? "A read-only edition with source filters and briefings, but no reader learning."
    : "A calmer source-first AI reader with local briefings, source memory, and editorial context.";

  if (loading || (!isSharedView && readerProfile.loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <div className="rounded-lg border border-[#d0d7de] bg-white px-4 py-2 text-sm text-[#57606a] shadow-sm">
          Loading Signal Desk...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-[#1f2328]">
      <header className="sticky top-0 z-30 border-b border-[#d0d7de] bg-white/95 backdrop-blur">
        <div className="px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#57606a]">
                  AI briefing
                </p>
                <span className="rounded-full border border-[#1a7f37]/20 bg-[#dafbe1] px-2 py-0.5 text-xs font-medium text-[#1a7f37]">
                  Live
                </span>
                {selectedSource ? (
                  <span className="rounded-full border border-[#0969da]/20 bg-[#eaf5ff] px-2 py-0.5 text-xs font-medium text-[#0969da]">
                    {selectedSource.name}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[#111827]">
                {headerTitle}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#57606a]">
                {headerSubtitle}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <NavLink
                  href="/"
                  active={pathname === "/" || pathname === "/feed"}
                >
                  Feed
                </NavLink>
                {!isSharedView ? (
                  <NavLink href="/briefing" active={pathname === "/briefing"}>
                    Briefing
                  </NavLink>
                ) : null}
                <NavLink href="/shared" active={pathname === "/shared"}>
                  Shared
                </NavLink>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="flex flex-wrap gap-3 text-xs text-[#57606a]">
                <span>{formatEditionDate()}</span>
                <span>{orderedEvents.length} visible stories</span>
                <span>{sources.length} active sources</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="grid gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[260px_minmax(0,1fr)_340px] xl:px-8">
        <div className="order-1 xl:sticky xl:top-[6.5rem] xl:self-start">
          <SourceRail
            items={sourceRail}
            selectedSourceId={selectedSourceId}
            onSelect={(sourceId) => {
              setSelectedSourceId(sourceId);

              if (allowPersonalRank && sourceId) {
                void readerProfile.trackInteraction({
                  sourceId,
                  sourceDelta: 2,
                  lastViewedSourceId: sourceId,
                });
              }
            }}
          />
        </div>

        <div className="order-3 space-y-4 xl:order-2">
          <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,420px)_auto]">
              <SearchBar value={search} onChange={setSearchQuery} />
              <div className="flex flex-wrap gap-2">
                {availableRankModes.map((modeOption) => (
                  <ModeButton
                    key={modeOption}
                    active={rankMode === modeOption}
                    onClick={() => setRankMode(modeOption)}
                  >
                    {modeOption === "for-you"
                      ? "For you"
                      : modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
                  </ModeButton>
                ))}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-[#d0d7de] bg-white px-3 py-1.5 text-xs font-medium text-[#57606a] hover:text-[#111827]"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
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
                    setSelectedSection(section.key as SectionFilter);

                    if (allowPersonalRank) {
                      void readerProfile.trackInteraction({
                        section: section.key,
                        sectionDelta: 1,
                      });
                    }
                  }}
                >
                  {section.label}
                </FilterButton>
              ))}
            </div>
          </section>

          {orderedEvents.length === 0 ? (
            <EmptyState
              title="No stories match these filters"
              body="Try another source, reset filters, or widen the desk selection."
            />
          ) : selectedSource ? (
            <div className="space-y-4">
              {hero ? (
                <StoryCard
                  event={hero}
                  featured
                  note={`${selectedSource.name} lead`}
                  profile={effectiveProfile}
                  onOpen={rememberEvent}
                />
              ) : null}
              {remainder.length > 0 ? (
                <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
                  <div className="flex items-end justify-between gap-3 border-b border-[#e5e7eb] pb-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                        Source feed
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                        More from {selectedSource.name}
                      </h2>
                    </div>
                    <p className="text-xs text-[#57606a]">
                      {orderedEvents.length} matching stories
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {remainder.map((event) => (
                      <StoryCard
                        key={event.id}
                        event={event}
                        profile={effectiveProfile}
                        onOpen={rememberEvent}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {hero ? (
                <StoryCard
                  event={hero}
                  featured
                  note="Desk lead"
                  profile={effectiveProfile}
                  onOpen={rememberEvent}
                />
              ) : null}

              {activeSections.map((section) => (
                <section
                  key={section.key}
                  className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-end justify-between gap-3 border-b border-[#e5e7eb] pb-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                        {section.description}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                        {section.label}
                      </h2>
                    </div>
                    <p className="text-xs text-[#57606a]">
                      {sectionData[section.key].length} stories
                    </p>
                  </div>

                  {section.key === "speculation" ? (
                    <div className="mt-4 space-y-3">
                      {sectionData.speculation.map((event, index) => (
                        <SpeculationCard
                          key={event.id}
                          event={event}
                          position={index + 1}
                          profile={effectiveProfile}
                          onOpen={rememberEvent}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {sectionData[section.key].map((event, index) => (
                        <div
                          key={event.id}
                          className={index === 0 ? "md:col-span-2" : undefined}
                        >
                          <StoryCard
                            event={event}
                            featured={index === 0}
                            note={index === 0 ? "Section lead" : undefined}
                            profile={effectiveProfile}
                            onOpen={rememberEvent}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}

              {hotTags.length > 0 ? (
                <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                    Themes building across the desk
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {hotTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-2 py-0.5 text-xs text-[#57606a]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>

        <div className="order-2 space-y-3 xl:order-3 xl:sticky xl:top-[6.5rem] xl:self-start">
          {sourceBriefing ? (
            <SourceBriefingPanel
              briefing={sourceBriefing}
              profile={effectiveProfile}
              onOpenStory={rememberEvent}
            />
          ) : (
            <>
              <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                  {isSharedView ? "Desk snapshot" : "For you"}
                </p>
                <h2 className="mt-1 text-base font-semibold text-[#111827]">
                  {isSharedView
                    ? "Shared desk view"
                    : readerProfile.hasLearnedProfile
                      ? "Adaptive picks"
                      : "Learning your briefing"}
                </h2>
                {isSharedView ? (
                  <p className="mt-3 text-sm leading-6 text-[#57606a]">
                    This shared edition keeps the source filters and source briefings,
                    but it does not learn from reader behavior.
                  </p>
                ) : personalizedStories.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {personalizedStories.slice(0, 3).map((event) => (
                      <CompactStory
                        key={event.id}
                        event={event}
                        label={whyThisStory(event, effectiveProfile)}
                        profile={effectiveProfile}
                        onOpen={rememberEvent}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[#57606a]">
                    Open a few stories and this briefing lane will start adapting
                    locally to the sources and themes you return to most.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                  Rising now
                </p>
                <h2 className="mt-1 text-base font-semibold text-[#111827]">
                  Stories climbing fastest
                </h2>
                <div className="mt-3 space-y-2">
                  {risingStories.slice(0, 4).map((event, index) => (
                    <CompactStory
                      key={event.id}
                      event={event}
                      label={index === 0 ? "Highest momentum" : "Trending up"}
                      profile={effectiveProfile}
                      onOpen={rememberEvent}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                  Learning & tutorials
                </p>
                <h2 className="mt-1 text-base font-semibold text-[#111827]">
                  Practical guides
                </h2>
                <div className="mt-3 space-y-2">
                  {learningStories.length > 0 ? (
                    learningStories.map((event, index) => (
                      <CompactStory
                        key={event.id}
                        event={event}
                        label={index === 0 ? "Hands-on" : "Worth learning"}
                        profile={effectiveProfile}
                        onOpen={rememberEvent}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-[#57606a]">
                      No tutorial-heavy stories match the current feed filters.
                    </p>
                  )}
                </div>
              </section>

              <KpiCards events={statsEvents} />
              <EventsChart events={statsEvents} />

              {!isSharedView ? (
                <section className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57606a]">
                        Local learning
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-[#111827]">
                        What the desk is learning
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => void readerProfile.resetProfile()}
                      className="rounded-lg border border-[#d0d7de] bg-white px-3 py-1 text-xs font-medium text-[#57606a] hover:text-[#111827]"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {learningBars.map((bar) => (
                      <div key={bar.key}>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#57606a]">
                          <span>{bar.label}</span>
                          <span className="font-medium text-[#111827]">{bar.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-[#e5e7eb]">
                          <div
                            className="h-1.5 rounded-full bg-[#0969da]"
                            style={{ width: bar.width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
