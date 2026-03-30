"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Event, Source } from "@/lib/types";

const FEED_EVENT_LIMIT = 260;

function attachSources(events: Event[], sources: Source[]) {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));

  return events.map((event) => ({
    ...event,
    source: event.source_id ? sourceMap.get(event.source_id) || null : null,
  }));
}

export function useLiveFeedData() {
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const events = useMemo(() => attachSources(rawEvents, sources), [rawEvents, sources]);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    async function loadFeed() {
      try {
        const [eventsResult, sourcesResult] = await Promise.all([
          supabase
            .from("events")
            .select("*")
            .eq("is_promoted", false)
            .order("created_at", { ascending: false })
            .limit(FEED_EVENT_LIMIT),
          supabase
            .from("sources")
            .select("*")
            .eq("active", true)
            .order("name", { ascending: true }),
        ]);

        if (!active) {
          return;
        }

        if (!eventsResult.error) {
          setRawEvents(eventsResult.data || []);
        }

        if (!sourcesResult.error) {
          setSources(sourcesResult.data || []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFeed();

    const channel = supabase
      .channel("signal-desk-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const nextEvent = payload.new as Event;

          if (nextEvent.is_promoted) {
            return;
          }

          setRawEvents((current) => [nextEvent, ...current].slice(0, FEED_EVENT_LIMIT));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    events,
    sources,
    loading,
  };
}
