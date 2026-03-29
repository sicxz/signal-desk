#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Seed the 20 email-only newsletter sources into Supabase.
 *
 * These are newsletters that don't have public RSS feeds (Beehiiv,
 * DeepLearning.AI, etc.). The existing email-source.js pipeline will
 * ingest them via IMAP from Gmail.
 *
 * Usage:
 *   node scripts/seed-email-sources.js
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in .env.local or environment.
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── The 20 email-only newsletters ──────────────────────────────────
// Format: { name, url (mailto:sender), tag }
// These match the senders in the Notion Newsletter Source Tracker.

const EMAIL_SOURCES = [
  // Beehiiv newsletters (8)
  { name: "The AI Report", url: "mailto:theaireport@mail.beehiiv.com", tag: "ai" },
  { name: "UX Tools", url: "mailto:uxtools@mail.beehiiv.com", tag: "design" },
  { name: "AI Stock Letter", url: "mailto:aistockletter@mail.beehiiv.com", tag: "ai" },
  { name: "Simple AI (Dharmesh)", url: "mailto:agentai@mail.beehiiv.com", tag: "ai" },
  { name: "Future Tools", url: "mailto:futuretools@mail.beehiiv.com", tag: "ai" },
  { name: "Turing Post", url: "mailto:turingpost@mail.beehiiv.com", tag: "ai" },
  { name: "Sloth Bytes", url: "mailto:slothbytes@mail.beehiiv.com", tag: "tech" },
  { name: "The AI Exchange", url: "mailto:theaiexchange@mail.beehiiv.com", tag: "ai" },

  // Other email-only platforms (12)
  { name: "The Batch (DeepLearning.AI)", url: "mailto:thebatch@deeplearning.ai", tag: "ai" },
  { name: "Spokesman-Review", url: "mailto:noreply@spokesmanreview-email.com", tag: "policy" },
  { name: "The Rundown AI", url: "mailto:news@daily.therundown.ai", tag: "ai" },
  { name: "Designlab Brief", url: "mailto:hello@designlab.com", tag: "design" },
  { name: "Bytes (UI.dev)", url: "mailto:tyler@ui.dev", tag: "tech" },
  { name: "1440 Daily Digest", url: "mailto:dailydigest@email.join1440.com", tag: "tech" },
  { name: "The Code (Superhuman)", url: "mailto:thecode@mail.joinsuperhuman.ai", tag: "tech" },
  { name: "Superhuman AI (Zain Kahn)", url: "mailto:superhuman@mail.joinsuperhuman.ai", tag: "ai" },
  { name: "Every.to", url: "mailto:hello@every.to", tag: "ai" },
  { name: "Oboe", url: "mailto:bsharp@newsletter.oboe.com", tag: "tech" },
  { name: "The Neuron Daily", url: "mailto:theneuron@newsletter.theneurondaily.com", tag: "ai" },
  { name: "Frederik G. Pferdt", url: "mailto:team@nextletter.frederikgpferdt.com", tag: "business" },
];

function shouldFallbackToLegacyType(error) {
  return Boolean(
    error &&
      /violates check constraint "sources_type_check"/i.test(error.message || "")
  );
}

async function main() {
  console.log(`Seeding ${EMAIL_SOURCES.length} email sources...\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const source of EMAIL_SOURCES) {
    // Check if source already exists (by url)
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

    let { error } = await supabase
      .from("sources")
      .insert({ name: source.name, url: source.url, type: "email", tag: source.tag });

    if (shouldFallbackToLegacyType(error)) {
      ({ error } = await supabase
        .from("sources")
        .insert({ name: source.name, url: source.url, type: "api", tag: source.tag }));
    }

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
