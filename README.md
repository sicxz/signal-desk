# Signal Desk

Signal Desk is a personal signal and briefing product built with Next.js, Supabase, and AI-assisted ingestion.

Today, it ships as a full-width AI news front page with editorial structure, story synopses, and lightweight personalization. Longer term, it is meant to become a user-owned feed: your sources, your signals, your ranking, your briefing.

The current shipping hub is `AI-Info Hub`, under the broader `Signal Desk` product.

## What It Is

Signal Desk is designed to answer a higher-value question than "what was published?"

It tries to answer:

- What should I pay attention to right now?
- What is the big deal?
- What is the catch?
- Is this worth clicking through?

The goal is a front page that reads like a briefing, not a bucket of links.

## Current Product Shape

The current app includes:

- A full-width editorial front page instead of a narrow dashboard layout
- A compact `Top Story` lead with structured synopsis
- Fixed desks for:
  - `Science`
  - `ChatGPT · Claude · Gemini`
  - `Prompting & Tools`
  - `Learning & Tutorials`
  - `Media AI`
  - `Speculation Rankings`
  - `Everything Else`
- Story-level synopsis fields:
  - `summary`
  - `big_deal`
  - `catch`
  - `why_care`
- Provider color cues:
  - OpenAI / ChatGPT = mint
  - Gemini = light blue
  - Claude / Anthropic = tan / yellow
- Live filters at the top of the page for:
  - search
  - desk
  - source
  - ranking mode (`Latest`, `For you`, `Rising`)
- Lightweight local learning from clicks and filter behavior
- Speculation scoring with ranked, color-coded bars
- Article images when source metadata or Open Graph image extraction is available

## What It Is Not Yet

The product direction is larger than the current implementation.

Not built yet:

- user accounts and server-side reader profiles
- persistent cross-device personalization
- Reddit saves import
- Instagram saves import
- a generated daily/hourly briefing object stored per user
- story clustering and entity extraction
- user-owned ranking controls like `more like this`, `less like this`, `follow`, `mute`

Those are part of the intended direction, but the current app is still a single shared feed with local personalization heuristics.

## Stack

- Next.js App Router
- React 19
- Supabase for storage
- RSS/API ingestion
- Claude-based enrichment for classification and synopsis generation

Core files:

- [src/components/newsletter-dashboard.tsx](/Users/tmasingale/Documents/GitHub/flavio/signal-desk/src/components/newsletter-dashboard.tsx)
- [src/app/api/events/route.ts](/Users/tmasingale/Documents/GitHub/flavio/signal-desk/src/app/api/events/route.ts)
- [scripts/ingest.js](/Users/tmasingale/Documents/GitHub/flavio/signal-desk/scripts/ingest.js)
- [src/lib/types.ts](/Users/tmasingale/Documents/GitHub/flavio/signal-desk/src/lib/types.ts)
- [ROADMAP.md](/Users/tmasingale/Documents/GitHub/flavio/signal-desk/ROADMAP.md)

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create `.env.local` with the values needed for the app and ingest pipeline.

App and API access:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Ingestion and enrichment:

- `API_KEY` for the project-level ingest API
- `ANTHROPIC_API_KEY`
- `BASE_URL` optional, defaults to `http://localhost:3000`

## Ingestion

The ingest pipeline pulls from configured RSS/API sources, deduplicates content, enriches stories with AI-generated editorial fields, and writes them into the `events` table.

Enrichment currently generates:

- `summary`
- `big_deal`
- `catch`
- `why_care`
- `tags`
- `section`
- `speculation_score`
- `is_promoted`
- `image_url` when discoverable

Run ingestion locally:

```bash
npm run ingest
```

Optional backfill mode enriches existing events that are missing synopsis or image data:

```bash
BACKFILL=1 BACKFILL_LIMIT=150 node scripts/ingest.js
```

## Scheduled Runs

GitHub Actions:

- `.github/workflows/daily-ingest.yml` runs the ingest job daily and on manual trigger

Required GitHub Actions secrets:

- `API_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BASE_URL`

Optional system cron:

```bash
0 12 * * * cd /path/to/signal-desk && node scripts/ingest.js
```

## Product Direction

The long-term target is not "an AI news dashboard."

It is a personal intelligence surface:

- news that matters to you
- your own saved material and source graph
- a ranking system you can inspect and steer
- briefings that tell you why something matters before you click

The current roadmap lives in [ROADMAP.md](/Users/tmasingale/Documents/GitHub/flavio/signal-desk/ROADMAP.md).
