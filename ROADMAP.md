# Flavio Dispatch Roadmap

## Product Direction
Turn the dashboard into a living AI news front page:

- The page should feel competitive, with multiple blocks fighting for attention instead of one long feed.
- The layout should adapt based on what the reader opens, ignores, saves, and filters.
- Every major desk should stay visible, but the order, prominence, and story selection inside those desks should evolve.
- The interface should feel editorial, not operational.

## Current State

- Full-width editorial shell is in place.
- Fixed desks exist: Top Story, Science, Big 3, Prompting & Tools, Media AI, Speculation Rankings, Everything Else.
- Lightweight local learning exists from story opens and source filters.
- Ranking is still client-side and session-local.

## Phase 1: Real Reader Signals
Goal: stop pretending the page is personalized and start collecting real inputs.

- Add a `reader_events` table in Supabase for `open`, `save`, `dismiss`, `share`, `filter`, and `hover_dwell`.
- Add anonymous session IDs now; support logged-in users later without reworking the model.
- Track story opens from every CTA, not just headline clicks.
- Add explicit controls on cards: `Save`, `Less like this`, `More like this`.
- Persist preference weights server-side by section, source, tag, and entity.

Deliverable:
- A reader profile that survives refreshes, devices, and future ranking changes.

## Phase 2: Front Page Competition
Goal: make the page feel alive and uneven in a good way.

- Replace the single top stack with competing modules:
  - `Top Story`
  - `For You`
  - `Rising Signals`
  - `Now Orbiting`
  - `Most Debated`
  - `Speculation Watch`
- Let blocks expand, shrink, and reorder based on engagement and freshness.
- Add “story clusters” so five articles about the same topic do not occupy five premium positions.
- Introduce a fast-moving ticker or ribbon for hot tags, alerts, and source bursts.
- Randomize one lower-priority module per load to keep discovery alive.

Deliverable:
- A front page with hierarchy shifts, novelty, and visible motion in what gets promoted.

## Phase 3: Richer Story Packaging
Goal: make each item feel like a story package, not a database row.

- Pull hero images and thumbnails from source metadata where available.
- Add compact story formats:
  - hero lead
  - visual card
  - chart card
  - quote card
  - “3 things to know” brief
- Promote summaries over raw descriptions.
- Show source quality signals: source name, recency, speculation, story count in cluster.
- Give each desk its own visual treatment so sections are recognizable at a glance.

Deliverable:
- A page that reads like a publication, not a categorized list.

## Phase 4: Smarter Ranking
Goal: move from heuristics to explicit ranking layers.

- Score each story on:
  - freshness
  - reader affinity
  - source affinity
  - topic momentum
  - novelty
  - speculation heat
  - section diversity
- Add penalties for duplicate topics and repeated sources near the top.
- Build a cold-start strategy:
  - global defaults
  - trending defaults
  - optional onboarding topic picks
- Add explainability labels like `Because you read MCP stories` or `Trending across 4 sources`.

Deliverable:
- Rankings that are tunable, inspectable, and less brittle than hardcoded sorting.

## Phase 5: Story Intelligence Layer
Goal: make the system understand stories, not just rows.

- Cluster related articles into one story object with multiple source links.
- Extract entities: companies, models, labs, products, researchers.
- Add embeddings or topic vectors for semantic similarity and better recommendations.
- Detect recurring themes over the last 24h and 7d.
- Generate desk-level summaries such as “What changed in the Big 3 today?”

Deliverable:
- A front page driven by story clusters and topic understanding.

## Phase 6: Reader Controls
Goal: let the user steer the algorithm instead of being trapped by it.

- Add controls to follow or mute:
  - sections
  - tags
  - sources
  - companies
  - model families
- Add a visible “tune the front page” panel.
- Show why a story appeared and let the user correct the reason.
- Add multiple modes:
  - `Balanced`
  - `For You`
  - `Breaking`
  - `Research`
  - `Speculative`

Deliverable:
- Personalization that is user-steerable instead of opaque.

## Technical Workstreams

### Data Model
- Add `reader_events`
- Add `reader_profiles`
- Add `story_clusters`
- Add `entities`
- Add `event_images`

### APIs
- `POST /api/reader-events`
- `GET /api/front-page`
- `GET /api/recommendations`
- `POST /api/preferences`

### UI
- Replace static section rendering with block orchestration.
- Add image-capable cards and cluster cards.
- Add save/dismiss/follow controls.
- Add an explainability layer for personalization.

### Ranking
- Move scoring out of the component and into a reusable ranking module.
- Keep a deterministic fallback path for empty profiles or API failures.

## Recommended Build Order

1. Persist reader events and profiles in Supabase.
2. Add save/dismiss/more-like-this controls to cards.
3. Create a server-ranked `front-page` response.
4. Add clustering so repeated topics collapse into one package.
5. Add visual story formats and source imagery.
6. Add reader controls and ranking explanations.

## Definition of Done

- The page no longer feels static after repeated use.
- A reader can see the page adapting within one session and across sessions.
- The front page keeps editorial variety instead of collapsing into one topic.
- The ranking logic is explainable.
- The UI feels like a publication homepage, not a dashboard with better styling.
