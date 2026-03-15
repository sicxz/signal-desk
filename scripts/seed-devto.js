#!/usr/bin/env node

/**
 * Fetches the latest JavaScript articles from dev.to and sends them
 * as events to the POST /api/events endpoint.
 *
 * Usage:
 *   API_KEY=<your-project-api-key> node scripts/seed-devto.js
 *
 * Optional:
 *   BASE_URL=http://localhost:3000 (default)
 */

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

if (!API_KEY) {
  console.error("Error: API_KEY environment variable is required.");
  console.error("Usage: API_KEY=<your-api-key> node scripts/seed-devto.js");
  process.exit(1);
}

async function main() {
  console.log("Fetching articles from dev.to...");

  const res = await fetch(
    "https://dev.to/api/articles?per_page=20&tag=ai"
  );

  if (!res.ok) {
    console.error(`Failed to fetch from dev.to: ${res.status}`);
    process.exit(1);
  }

  const articles = await res.json();
  console.log(`Fetched ${articles.length} articles. Sending as events...\n`);

  let success = 0;
  let failed = 0;

  for (const article of articles) {
    const event = {
      channel: "dev-to",
      title: article.title,
      description: article.description || "",
      icon: "📝",
      tags: article.tag_list || [],
    };

    try {
      const response = await fetch(`${BASE_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        success++;
        console.log(`  ✓ ${article.title}`);
      } else {
        failed++;
        const err = await response.json();
        console.log(`  ✗ ${article.title} — ${err.error}`);
      }
    } catch (err) {
      failed++;
      console.log(`  ✗ ${article.title} — ${err.message}`);
    }
  }

  console.log(`\nDone! ${success} sent, ${failed} failed.`);
}

main();
