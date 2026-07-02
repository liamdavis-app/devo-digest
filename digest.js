// digest.js
// Daily UK devolution digest.
//
// Flow:
//   1. Fetch every RSS/Atom feed in sources.js
//   2. Keep items published in the last LOOKBACK_HOURS that match a KEYWORD
//   3. De-duplicate (same story from multiple feeds)
//   4. Ask Claude to produce the 5 fields per item, as JSON
//   5. Render an HTML email and send it via SMTP
//
// Env vars required (set as GitHub Secrets):
//   ANTHROPIC_API_KEY   - your Claude API key
//   SMTP_HOST           - e.g. smtp.gmail.com
//   SMTP_PORT           - e.g. 465
//   SMTP_USER           - the sending address / SMTP username
//   SMTP_PASS           - SMTP password or app-password
//   DIGEST_TO           - where to send the digest (your inbox)

import Parser from "rss-parser";
import nodemailer from "nodemailer";
import { SOURCES, GROUPS, KEYWORDS, LOOKBACK_HOURS } from "./sources.js";

const MODEL = "claude-sonnet-5"; // fast + cheap; fine for summarising
const parser = new Parser({ timeout: 15000 });

// ---------- 1. Fetch feeds ----------
async function fetchAll() {
  const results = await Promise.allSettled(
    SOURCES.map(async (s) => {
      const feed = await parser.parseURL(s.feed);
      return (feed.items || []).map((item) => ({
        sourceName: s.name,
        sourceType: s.type,
        title: (item.title || "").trim(),
        link: item.link || item.guid || "",
        published: item.isoDate || item.pubDate || null,
        summary: (item.contentSnippet || item.content || item.summary || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 1200),
      }));
    })
  );

  const items = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
    else console.error("Feed failed:", r.reason?.message || r.reason);
  }
  return items;
}

// ---------- 2. Filter ----------
function withinLookback(iso) {
  if (!iso) return true; // keep undated items; Claude/you can judge
  const ageHours = (Date.now() - new Date(iso).getTime()) / 36e5;
  return ageHours <= LOOKBACK_HOURS;
}

function matchesKeyword(item) {
  const hay = (item.title + " " + item.summary).toLowerCase();
  return KEYWORDS.some((k) => hay.includes(k));
}

// ---------- 3. De-duplicate ----------
function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    // normalise title for near-duplicate detection
    const key = it.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (key && seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// ---------- 4. Summarise with Claude ----------
async function summarise(items) {
  if (items.length === 0) return [];

  const system =
    "You are a research analyst producing a daily digest on UK local-government " +
    "and fiscal devolution for a policy-literate reader. For each item you are " +
    "given, return an object with these exact keys: " +
    "title (the article/report title, tightened if needlessly long but not reworded misleadingly); " +
    "author (the named author if present, else the publishing organisation); " +
    "orgBlurb (a short phrase — under 12 words — on who that author/organisation is and their leaning/remit); " +
    "hook (ONE tight sentence, under 30 words, capturing what the piece says and why it matters — " +
    "the single line that tells the reader whether to open it; lead with the substance, " +
    "name a specific figure, mechanism or recommendation if there is one; no throat-clearing); " +
    "date (the publication date as given, else 'unknown'); " +
    "type (copy the 'type' value through unchanged — one of: official, thinktank, press); " +
    "link (copy the link through unchanged). " +
    "Be precise and plain. Do not invent authors, figures, titles or claims not supported by the text provided. " +
    "If the provided text is too thin to summarise confidently, say so plainly in the hook rather than guessing. " +
    "Respond with ONLY a JSON array of these objects, no prose, no markdown fences.";

  const payload = items.map((it, i) => ({
    i,
    source: it.sourceName,
    type: it.sourceType,
    title: it.title,
    link: it.link,
    published: it.published,
    text: it.summary,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system,
      messages: [
        {
          role: "user",
          content:
            "Here are today's candidate items as JSON. Produce the digest array.\n\n" +
            JSON.stringify(payload, null, 2),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Could not parse Claude output:\n", text);
    throw e;
  }
}

// ---------- 5. Render + send ----------
// Design register: a policy briefing sheet, not a startup newsletter.
// Restrained type, a monospace document-reference eyebrow, and a single
// signature device — a coloured left rule keyed to source type so the
// reader can tell Parliament from think-tank from press at a glance.
// Native light/dark via prefers-color-scheme; Apple Mail renders this well.

const escapeHtml = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Accent per source type. Muted, not neon — a filing colour, not a highlight.
const TYPE_ACCENT = {
  official: "#8a6d1f",  // brass — Parliament / audit
  thinktank: "#3a6b6e", // slate teal — research
  press: "#7a5a7d",     // muted plum — press / other
};

function renderItem(e) {
  const accent = TYPE_ACCENT[e.type] || TYPE_ACCENT.press;
  const ref = [e.author, e.date && e.date !== "unknown" ? e.date : null]
    .filter(Boolean)
    .map(escapeHtml)
    .join("  ·  ");

  return `
  <a href="${escapeHtml(e.link)}" style="text-decoration:none;color:inherit;display:block">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px">
      <tr>
        <td width="3" style="background:${accent};border-radius:2px" class="rule">&nbsp;</td>
        <td width="14">&nbsp;</td>
        <td style="padding:2px 0 14px;vertical-align:top">
          <div style="font-family:'SFMono-Regular',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#8a8f98" class="eyebrow">${ref || "source"}</div>
          <div style="font-size:17px;font-weight:600;line-height:1.3;margin:3px 0 5px;color:#15181d" class="title">${escapeHtml(e.title || e.author || "Untitled")}</div>
          ${e.orgBlurb ? `<div style="font-size:12.5px;line-height:1.4;color:#6b7280;margin:0 0 6px" class="blurb">${escapeHtml(e.orgBlurb)}</div>` : ""}
          <div style="font-size:14.5px;line-height:1.5;color:#33383f" class="hook">${escapeHtml(e.hook || "")}</div>
        </td>
      </tr>
    </table>
  </a>`;
}

function renderHtml(entries, counts) {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Shared <head> with dark-mode overrides. Apple Mail honours these.
  const head = `
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      .bg      { background:#121417 !important; }
      .sheet   { background:#1a1d21 !important; }
      .kicker  { color:#9aa0a8 !important; }
      .h1      { color:#f2f3f5 !important; }
      .eyebrow { color:#868c95 !important; }
      .title   { color:#f2f3f5 !important; }
      .blurb   { color:#9aa0a8 !important; }
      .hook    { color:#c9ced6 !important; }
      .grouphd { color:#f2f3f5 !important; border-color:#2b2f36 !important; }
      .foot    { color:#6b7280 !important; border-color:#2b2f36 !important; }
    }
    a { color:inherit; }
  </style>`;

  const shell = (inner, preheader) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}</head>
<body style="margin:0;padding:0;background:#eceef1;-webkit-font-smoothing:antialiased" class="bg">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef1" class="bg">
    <tr><td align="center" style="padding:22px 14px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden" class="sheet">
        <tr><td style="padding:26px 26px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
          ${inner}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const header = `
    <div style="font-family:'SFMono-Regular',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8a8f98;margin:0 0 6px" class="kicker">UK Devolution Digest</div>
    <div style="font-size:15px;font-weight:600;color:#15181d;margin:0 0 22px" class="h1">${today}</div>`;

  const footer = `
    <div style="border-top:1px solid #e6e8eb;margin-top:8px;padding-top:14px;font-size:11.5px;line-height:1.5;color:#9aa0a8" class="foot">
      Scanned ${counts.scanned} items across ${SOURCES.length} sources.
      Summaries are generated by Claude from feed excerpts and may contain errors — open the source before relying on anything.
    </div>`;

  if (entries.length === 0) {
    const inner = `${header}
      <div style="font-size:15px;line-height:1.55;color:#33383f">Nothing new on the watchlist today. The scan ran and found no matching items.</div>
      ${footer}`;
    return shell(inner, `Nothing new today — scan of ${SOURCES.length} sources ran clean.`);
  }

  // Group into sections in GROUPS order; skip empty groups.
  const sections = GROUPS.map((g) => {
    const items = entries.filter((e) => e.type === g.type);
    if (items.length === 0) return "";
    return `
      <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#15181d;border-bottom:1px solid #e6e8eb;padding-bottom:7px;margin:6px 0 16px" class="grouphd">${escapeHtml(g.label)} <span style="color:#b3b8bf;font-weight:600">${items.length}</span></div>
      ${items.map(renderItem).join("")}
      <div style="height:14px">&nbsp;</div>`;
  }).join("");

  // Any items whose type didn't match a known group fall in at the end.
  const known = new Set(GROUPS.map((g) => g.type));
  const orphans = entries.filter((e) => !known.has(e.type));
  const orphanSection = orphans.length
    ? `<div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#15181d;border-bottom:1px solid #e6e8eb;padding-bottom:7px;margin:6px 0 16px" class="grouphd">Other</div>
       ${orphans.map(renderItem).join("")}`
    : "";

  const preheader =
    `${entries.length} item${entries.length === 1 ? "" : "s"} · ` +
    entries.slice(0, 2).map((e) => e.title || e.author).filter(Boolean).join(" · ");

  return shell(`${header}${sections}${orphanSection}${footer}`, preheader);
}

async function sendEmail(html, count) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"Devolution Digest" <${process.env.SMTP_USER}>`,
    to: process.env.DIGEST_TO,
    subject: `UK Devolution Digest — ${count} item${count === 1 ? "" : "s"} — ${new Date().toLocaleDateString("en-GB")}`,
    html,
  });
}

// ---------- main ----------
(async () => {
  const raw = await fetchAll();
  const scanned = raw.length;
  const filtered = dedupe(raw.filter((i) => withinLookback(i.published) && matchesKeyword(i)));
  console.log(`Scanned ${scanned}, kept ${filtered.length} after filter + dedupe.`);

  const entries = await summarise(filtered);
  const html = renderHtml(entries, { scanned });
  await sendEmail(html, entries.length);
  console.log("Digest sent.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
