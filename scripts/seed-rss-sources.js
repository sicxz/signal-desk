#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Seed the RSS-backed newsletter sources into Supabase.
 *
 * This list was recovered from the public Notion tracker view and
 * includes the tracker rows with direct feed URLs available to the
 * existing RSS ingestion pipeline.
 *
 * Usage:
 *   node scripts/seed-rss-sources.js
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in .env.local or environment.
 */

const { createClient } = require("@supabase/supabase-js");
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RSS_SOURCES = [
  // Substack
  { name: "After Babel", url: "https://jonathanhaidt.substack.com/feed", tag: "policy" },
  { name: "Ahead of AI", url: "https://sebastianraschka.substack.com/feed", tag: "ai" },
  { name: "AI & Academia: The Future", url: "https://aiandacademia.substack.com/feed", tag: "education" },
  { name: "AI EDU Simplified", url: "https://aiedusimplified.substack.com/feed", tag: "education" },
  { name: "AI Guide for Thinking Humans", url: "https://aiguide.substack.com/feed", tag: "ai" },
  { name: "AI Supremacy", url: "https://aisupremacy.substack.com/feed", tag: "ai" },
  { name: "Artificial Ignorance", url: "https://generatives.substack.com/feed", tag: "ai" },
  { name: "Ben's Bites", url: "https://bensbites.substack.com/feed", tag: "ai" },
  { name: "Biblioracle", url: "https://biblioracle.substack.com/feed", tag: "education" },
  { name: "ChatGPT for Education", url: "https://openaiforeducation.substack.com/feed", tag: "education" },
  { name: "Communication & Innovation", url: "https://abramanders.substack.com/feed", tag: "education" },
  { name: "Design Better", url: "https://thecuriositydepartment.substack.com/feed", tag: "design" },
  { name: "Dr Philippa Hardman", url: "https://drphilippahardman.substack.com/feed", tag: "education" },
  { name: "Glenn Loury", url: "https://glennloury.substack.com/feed", tag: "policy" },
  { name: "Isophist", url: "https://lancecummings.substack.com/feed", tag: "education" },
  { name: "Last Week in AI", url: "https://lastweekinai.substack.com/feed", tag: "ai" },
  { name: "Leading Edge", url: "https://whatsimportant.substack.com/feed", tag: "tech" },
  { name: "Lenny's Newsletter", url: "https://lenny.substack.com/feed", tag: "business" },
  { name: "Middleground", url: "https://damonlinker.substack.com/feed", tag: "policy" },
  { name: "Nate's Substack", url: "https://natesnewsletter.substack.com/feed", tag: "tech" },
  { name: "Paul Krugman", url: "https://paulkrugman.substack.com/feed", tag: "policy" },
  { name: "The Eternally Radical Idea", url: "https://greglukianoff.substack.com/feed", tag: "policy" },
  { name: "The Median", url: "https://dcthemedian.substack.com/feed", tag: "ai" },
  { name: "Thinking About...", url: "https://snyder.substack.com/feed", tag: "policy" },
  { name: "Understanding AI", url: "https://understandingai.substack.com/feed", tag: "ai" },
  { name: "Why Try AI", url: "https://whytryai.substack.com/feed", tag: "ai" },

  // Ghost
  { name: "404 Media", url: "https://www.404media.co/rss/", tag: "tech" },
  { name: "Range Media", url: "https://www.rangemedia.co/rss/", tag: "tech" },

  // Other RSS-backed newsletters and digests
  { name: "DEV Community", url: "https://dev.to/feed", tag: "tech" },
  { name: "DoubleBlind", url: "https://doubleblindmag.com/feed/", tag: "education" },
  { name: "HackerNoon", url: "https://hackernoon.com/feed", tag: "tech" },
  { name: "Medium", url: "https://medium.com/feed/@Medium", tag: "tech" },
  { name: "Medium Personal Growth", url: "https://medium.com/feed/personal-growth", tag: "education" },
  { name: "Railway", url: "https://blog.railway.com/feed.xml", tag: "tech" },
  { name: "The New Yorker", url: "https://www.newyorker.com/feed/everything", tag: "policy" },
  { name: "TLDR Design", url: "https://tldr.tech/api/rss/design", tag: "design" },
  { name: "TLDR Tech", url: "https://tldr.tech/api/rss/tech", tag: "tech" },
  { name: "Zell Liew", url: "https://zellwk.com/rss.xml", tag: "tech" },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log(`Seeding ${RSS_SOURCES.length} RSS sources...\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const source of RSS_SOURCES) {
    const { data: existing } = await supabase
      .from("sources")
      .select("id")
      .eq("url", source.url)
      .maybeSingle();

    if (existing) {
      console.log(`  ~ ${source.name} — already exists, skipping`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("sources")
      .insert({ name: source.name, url: source.url, type: "rss", tag: source.tag });

    if (error) {
      console.log(`  x ${source.name} — ${error.message}`);
      failed++;
    } else {
      console.log(`  + ${source.name}`);
      added++;
    }
  }

  console.log(`\nDone! ${added} added, ${skipped} skipped, ${failed} failed.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  RSS_SOURCES,
};
