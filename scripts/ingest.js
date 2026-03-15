#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Ingestion script: fetches articles from configured sources,
 * deduplicates via content_hash, summarizes with Claude, and
 * POSTs to the events API.
 *
 * Usage:
 *   API_KEY=<project-api-key> ANTHROPIC_API_KEY=<key> node scripts/ingest.js
 *
 * Optional:
 *   BASE_URL=http://localhost:3000 (default)
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in .env.local or environment.
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// Load .env.local for Supabase credentials
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BACKFILL_MODE = process.env.BACKFILL === "1";
const BACKFILL_LIMIT = Number(process.env.BACKFILL_LIMIT || "150");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY && !BACKFILL_MODE) {
  console.error("Error: API_KEY environment variable is required.");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function contentHash(title, url) {
  return crypto.createHash("sha256").update(title + url).digest("hex");
}

async function fetchArticlesFromSource(source) {
  if (source.type === "rss") {
    const RSSParser = require("rss-parser");
    const parser = new RSSParser({
      customFields: {
        item: [
          ["media:content", "mediaContent", { keepArray: false }],
          ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
        ],
      },
    });
    const feed = await parser.parseURL(source.url);
    return feed.items.map((item) => ({
      title: item.title || "Untitled",
      url: item.link || "",
      description: item.contentSnippet || item.content || "",
      image_url:
        item.enclosure?.url ||
        item.mediaContent?.$.url ||
        item.mediaThumbnail?.$.url ||
        null,
    }));
  } else {
    const res = await fetch(source.url);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const articles = await res.json();
    return articles.map((a) => ({
      title: a.title || "Untitled",
      url: a.url || a.canonical_url || "",
      description: a.description || "",
      image_url: a.cover_image || a.social_image || null,
    }));
  }
}

async function extractOgImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FlavioBot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (match) return match[1];
    const reversed = html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    );
    return reversed ? reversed[1] : null;
  } catch {
    return null;
  }
}

async function summarizeWithClaude(title, description) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are an editorial AI classifier for a tech newsletter. Analyze this article and return structured JSON.

Title: ${title}
Description: ${description}

Return JSON only, no markdown fences:
{
  "summary": "Exactly 2-sentence summary",
  "big_deal": "One sentence: why this matters right now, without the prefix 'Big deal:'",
  "catch": "One sentence: the caveat or hidden risk, without the prefix 'The catch:'",
  "why_care": "One sentence: why the reader should open this, without the prefix 'Why care:'",
  "tags": ["tag1", "tag2", "tag3"],
  "section": "<one of: science | big-3 | prompting-tools | learning-tutorials | media-ai | speculation | general>",
  "speculation_score": <0-10 integer>,
  "is_promoted": <true|false>
}

Section rules:
- "science": Research papers, scientific discoveries, benchmarks, datasets
- "big-3": News specifically about ChatGPT/OpenAI, Claude/Anthropic, or Gemini/Google AI
- "prompting-tools": Prompting techniques, MCP servers, AI developer tools, SDKs, APIs
- "learning-tutorials": Tutorials, walkthroughs, guides, playbooks, hands-on explainers
- "media-ai": Image generation, video AI, audio/music AI, multimodal models
- "speculation": Primarily opinion, prediction, or speculation (auto-assign if speculation_score >= 7)
- "general": Everything else that doesn't fit above categories

Scoring: 0 = pure verified fact, 5 = mix of fact and opinion, 10 = pure speculation/prediction.
If speculation_score >= 7, section MUST be "speculation".
is_promoted: true if this reads like sponsored content, a product ad, or promotional material.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}

async function backfillExistingEvents() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,summary,description,original_url,big_deal,catch,why_care,image_url,is_promoted")
    .eq("is_promoted", false)
    .order("created_at", { ascending: false })
    .limit(BACKFILL_LIMIT);

  if (error) {
    throw new Error(`Failed to load events for backfill: ${error.message}`);
  }

  const targets = (events || []).filter(
    (event) =>
      !event.big_deal ||
      !event.catch ||
      !event.why_care ||
      !event.image_url
  );

  console.log(`Backfill mode: ${targets.length} event(s) need enrichment.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let withImage = 0;
  let withoutImage = 0;

  for (const event of targets) {
    try {
      const patch = {};

      if (!event.big_deal || !event.catch || !event.why_care) {
        const ai = await summarizeWithClaude(
          event.title,
          event.summary || event.description || ""
        );

        if (!event.big_deal) patch.big_deal = ai.big_deal || null;
        if (!event.catch) patch.catch = ai.catch || null;
        if (!event.why_care) patch.why_care = ai.why_care || null;
      }

      if (!event.image_url && event.original_url) {
        const imageUrl = await extractOgImage(event.original_url);
        patch.image_url = imageUrl || null;
      }

      if (Object.keys(patch).length === 0) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("events")
        .update(patch)
        .eq("id", event.id);

      if (updateError) {
        failed++;
        console.log(`  x ${event.title} — ${updateError.message}`);
        continue;
      }

      updated++;
      if (patch.image_url) {
        withImage++;
      } else if (!event.image_url) {
        withoutImage++;
      }
      console.log(`  + backfilled ${event.title}`);
    } catch (err) {
      failed++;
      console.log(`  x ${event.title} — ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\nBackfill done! ${updated} updated, ${skipped} skipped, ${failed} failed.`
  );
  console.log(
    `Image backfill coverage: ${withImage} with image, ${withoutImage} without image.`
  );
}

async function seedDefaultSources() {
  console.log("No sources found. Seeding defaults...");
  const { error } = await supabase.from("sources").insert([
    { name: "Dev.to AI", url: "https://dev.to/api/articles?per_page=20&tag=ai", type: "api", tag: "ai" },
    { name: "HackerNoon AI", url: "https://hackernoon.com/tagged/ai/feed", type: "rss", tag: "ai" },
    { name: "404 Media", url: "https://www.404media.co/rss/", type: "rss", tag: "tech" },
    { name: "Critical Playground", url: "https://criticalplayground.org/feed", type: "rss", tag: "tech" },
    { name: "The Curiosity Department", url: "https://thecuriositydepartment.substack.com/feed", type: "rss", tag: "design" },
    { name: "Bytes (Fireship)", url: "https://bytes-rss.onrender.com/feed", type: "rss", tag: "ai" },
    { name: "The Batch (DeepLearning.AI)", url: "https://www.deeplearning.ai/the-batch/feed", type: "rss", tag: "ai" },
    { name: "Ben's Bites", url: "https://bensbites.substack.com/feed", type: "rss", tag: "ai" },
    { name: "Future Tools", url: "https://futuretools.beehiiv.com/feed", type: "rss", tag: "ai" },
    { name: "The Neuron Daily", url: "https://www.theneurondaily.com/feed", type: "rss", tag: "ai" },
  ]);
  if (error) {
    console.error("Failed to seed sources:", error.message);
    process.exit(1);
  }
  console.log("Seeded 10 default sources.\n");
}

async function main() {
  if (BACKFILL_MODE) {
    await backfillExistingEvents();
    return;
  }

  // 1. Get active sources
  let { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("active", true);

  if (!sources || sources.length === 0) {
    await seedDefaultSources();
    const result = await supabase
      .from("sources")
      .select("*")
      .eq("active", true);
    sources = result.data;
  }

  console.log(`Found ${sources.length} active source(s).\n`);

  // 2. Get existing content hashes for dedup
  const { data: existingEvents } = await supabase
    .from("events")
    .select("content_hash")
    .not("content_hash", "is", null);
  const existingHashes = new Set(
    (existingEvents || []).map((e) => e.content_hash)
  );

  let totalNew = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalFiltered = 0;
  let totalWithImage = 0;
  let totalWithoutImage = 0;

  // 3. Process each source
  for (const source of sources) {
    console.log(`--- ${source.name} (${source.type}) ---`);

    let articles;
    try {
      articles = await fetchArticlesFromSource(source);
    } catch (err) {
      console.error(`  Failed to fetch: ${err.message}`);
      continue;
    }

    console.log(`  Fetched ${articles.length} articles.`);

    for (const article of articles) {
      const hash = contentHash(article.title, article.url);

      if (existingHashes.has(hash)) {
        totalSkipped++;
        continue;
      }

      try {
        // Classify with Claude
        const result = await summarizeWithClaude(
          article.title,
          article.description
        );

        // Filter out promoted/ad content
        if (result.is_promoted) {
          totalFiltered++;
          console.log(`  ~ ${article.title} [filtered: promoted]`);
          continue;
        }

        // Resolve image: prefer source-provided, fall back to og:image
        let imageUrl = article.image_url || null;
        if (!imageUrl && article.url) {
          imageUrl = await extractOgImage(article.url);
        }
        if (imageUrl) {
          totalWithImage++;
        } else {
          totalWithoutImage++;
        }

        // POST to events API
        const response = await fetch(`${BASE_URL}/api/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            channel: source.tag,
            title: article.title,
            description: article.description,
            icon: "📰",
            tags: result.tags || [],
            source_id: source.id,
            summary: result.summary,
            original_url: article.url,
            content_hash: hash,
            topic: result.section || null,
            section: result.section || null,
            speculation_score: result.speculation_score ?? null,
            is_promoted: false,
            big_deal: result.big_deal || null,
            catch: result.catch || null,
            why_care: result.why_care || null,
            image_url: imageUrl,
          }),
        });

        if (response.ok) {
          totalNew++;
          existingHashes.add(hash);
          console.log(`  + [${result.section}] ${article.title} (spec: ${result.speculation_score})`);
        } else {
          totalFailed++;
          const err = await response.json();
          console.log(`  x ${article.title} — ${err.error}`);
        }
      } catch (err) {
        totalFailed++;
        console.log(`  x ${article.title} — ${err.message}`);
      }

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(
    `\nDone! ${totalNew} new, ${totalSkipped} skipped, ${totalFiltered} filtered (ads), ${totalFailed} failed.`
  );
  console.log(
    `Image coverage: ${totalWithImage} with image, ${totalWithoutImage} without image.`
  );
}

main();
