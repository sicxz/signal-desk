/* eslint-disable @typescript-eslint/no-require-imports */

const DEFAULT_MAILBOX = process.env.EMAIL_INGEST_MAILBOX || "INBOX";
const DEFAULT_LOOKBACK_DAYS = Number(process.env.EMAIL_INGEST_LOOKBACK_DAYS || "7");
const DEFAULT_MAX_MESSAGES = Number(process.env.EMAIL_INGEST_MAX_MESSAGES || "10");
const REQUIRED_EMAIL_ENV_VARS = [
  "EMAIL_INGEST_HOST",
  "EMAIL_INGEST_USER",
  "EMAIL_INGEST_PASSWORD",
];

let emailClientPromise = null;

function getMissingEmailEnvVars() {
  return REQUIRED_EMAIL_ENV_VARS.filter((name) => !process.env[name]);
}

function isEmailIngestConfigured() {
  return getMissingEmailEnvVars().length === 0;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for email sources.`);
  }
  return value;
}

function parseBooleanEnv(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  return !["0", "false", "no"].includes(String(value).toLowerCase());
}

function normalizeEmailSourceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const candidate = raw.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
    return null;
  }

  return `mailto:${candidate}`;
}

function emailAddressFromSource(value) {
  const normalized = normalizeEmailSourceUrl(value);
  return normalized ? normalized.replace(/^mailto:/i, "") : null;
}

function buildSinceDate() {
  const since = new Date();
  since.setDate(since.getDate() - DEFAULT_LOOKBACK_DAYS);
  since.setHours(0, 0, 0, 0);
  return since;
}

function trimDescription(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/(unsubscribe|manage preferences|privacy policy|terms of service|view in browser|open in browser|read online|forwarded this email|was this forwarded|email preferences|sponsored by)/i.test(
          line
        )
    );

  const deduped = [];
  for (const line of lines) {
    if (!deduped.includes(line)) {
      deduped.push(line);
    }
  }

  return deduped.join("\n").slice(0, 5000);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractLinksFromHtml(html) {
  const candidates = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(regex)) {
    const href = decodeHtml(match[1]).trim();
    const text = decodeHtml(match[2]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!/^https?:\/\//i.test(href)) {
      continue;
    }
    candidates.push({ url: href, text });
  }

  return candidates;
}

function extractUrlsFromText(text) {
  return [...String(text || "").matchAll(/https?:\/\/[^\s<>"')]+/g)].map((match) => ({
    url: decodeHtml(match[0]),
    text: "",
  }));
}

function scoreCandidate(url, text) {
  let score = 0;
  const lowerUrl = url.toLowerCase();
  const lowerText = text.toLowerCase();

  if (/view in browser|read online|open in browser|web version/.test(lowerText)) {
    score += 40;
  }

  if (/(newsletter|issue|archive|article|blog|post|stories|story|the-batch|beehiiv|substack)/.test(lowerUrl)) {
    score += 18;
  }

  if (/utm_/.test(lowerUrl)) {
    score -= 4;
  }

  if (/(unsubscribe|subscribe|preferences|privacy|terms|linkedin|twitter|x\.com|facebook|instagram|youtube|tiktok|mailto:)/.test(lowerUrl)) {
    score -= 40;
  }

  if (/\b(openai|anthropic|claude|gemini|agent|model|tool|ai)\b/.test(lowerText)) {
    score += 6;
  }

  return score;
}

function pickBestUrl(parsed) {
  const headerCandidates = [];
  const listArchive = parsed.headers?.get?.("list-archive");
  if (typeof listArchive === "string" && /^https?:\/\//i.test(listArchive)) {
    headerCandidates.push({ url: listArchive, text: "list archive" });
  }

  const htmlCandidates = parsed.html ? extractLinksFromHtml(parsed.html) : [];
  const textCandidates = extractUrlsFromText(parsed.text || "");
  const candidates = [...headerCandidates, ...htmlCandidates, ...textCandidates];

  const seen = new Set();
  const ranked = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    ranked.push({ ...candidate, score: scoreCandidate(candidate.url, candidate.text) });
  }

  ranked.sort((a, b) => b.score - a.score);
  const best = ranked.find((candidate) => candidate.score > 0);
  return best ? best.url : null;
}

function pickImage(parsed) {
  const html = String(parsed.html || "");
  const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

  for (const match of matches) {
    const src = decodeHtml(match[1]).trim();
    if (!/^https?:\/\//i.test(src)) continue;
    if (/(pixel|tracking|open\.png|open\.gif|logo)/i.test(src)) continue;
    return src;
  }

  return null;
}

async function getEmailClient() {
  if (!emailClientPromise) {
    emailClientPromise = (async () => {
      const { ImapFlow } = require("imapflow");
      const client = new ImapFlow({
        host: requireEnv("EMAIL_INGEST_HOST"),
        port: Number(process.env.EMAIL_INGEST_PORT || "993"),
        secure: parseBooleanEnv(process.env.EMAIL_INGEST_SECURE, true),
        auth: {
          user: requireEnv("EMAIL_INGEST_USER"),
          pass: requireEnv("EMAIL_INGEST_PASSWORD"),
        },
        logger: false,
      });

      await client.connect();
      return client;
    })().catch((error) => {
      emailClientPromise = null;
      throw error;
    });
  }

  return emailClientPromise;
}

async function fetchArticlesFromEmailSource(source) {
  const sender = emailAddressFromSource(source.url);
  if (!sender) {
    throw new Error("Email source URL must be a sender email or mailto:sender@example.com.");
  }

  const { simpleParser } = require("mailparser");
  const client = await getEmailClient();
  const lock = await client.getMailboxLock(DEFAULT_MAILBOX);

  try {
    const messageIds = await client.search({
      since: buildSinceDate(),
      from: sender,
    });

    if (!messageIds.length) {
      return [];
    }

    const selectedIds = messageIds.slice(-DEFAULT_MAX_MESSAGES);
    const articles = [];

    for await (const message of client.fetch(selectedIds, {
      uid: true,
      envelope: true,
      internalDate: true,
      source: true,
    })) {
      const parsed = await simpleParser(message.source);
      const title =
        String(parsed.subject || message.envelope?.subject || `${source.name} newsletter`).trim() ||
        `${source.name} newsletter`;
      const description = trimDescription(parsed.text || parsed.html || title);

      articles.push({
        title,
        url: pickBestUrl(parsed),
        description: description || title,
        image_url: pickImage(parsed),
      });
    }

    return articles;
  } finally {
    lock.release();
  }
}

async function closeEmailClient() {
  if (!emailClientPromise) {
    return;
  }

  const promise = emailClientPromise;
  emailClientPromise = null;

  try {
    const client = await promise;
    await client.logout();
  } catch {
    // Ignore close failures during shutdown.
  }
}

module.exports = {
  closeEmailClient,
  fetchArticlesFromEmailSource,
  getMissingEmailEnvVars,
  isEmailIngestConfigured,
  normalizeEmailSourceUrl,
};
