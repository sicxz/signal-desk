#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * One-shot newsletter setup.
 *
 * Runs the email and RSS seeders in sequence and can optionally kick off
 * the ingest pipeline once the sources are in place.
 *
 * Usage:
 *   node scripts/setup-newsletters.js
 *   node scripts/setup-newsletters.js --ingest
 */

const { spawnSync } = require("child_process");
const path = require("path");

const shouldRunIngest = process.argv.includes("--ingest");

function runScript(scriptName) {
  const scriptPath = path.resolve(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  console.log("Setting up newsletter sources...\n");

  console.log("1/2 Seeding email sources");
  runScript("seed-email-sources.js");

  console.log("\n2/2 Seeding RSS sources");
  runScript("seed-rss-sources.js");

  if (shouldRunIngest) {
    console.log("\n3/3 Running ingest");
    runScript("ingest.js");
    return;
  }

  console.log("\nSetup complete.");
  console.log("Run `npm run ingest` when your API keys and IMAP environment variables are configured.");
  console.log("Or use `npm run setup:newsletters:ingest` to seed and ingest in one command.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
