// sources.js
// Curated list of UK local-government / fiscal-devolution sources.
// Each source has an RSS/Atom feed. Feeds are polled daily and filtered
// against KEYWORDS before anything is sent to Claude for summarising.
//
// "type" groups items in the email: "thinktank" | "official" | "press".
//
// TWO KINDS OF SOURCE below:
//   1. Native RSS feeds — the source's own feed. Cleanest data when they work.
//   2. Google News "site:" queries — a reliable fallback that pulls one
//      organisation's output through Google News RSS. Used for orgs whose
//      native feed was dead or malformed (404s / bad XML). Slightly noisier
//      but far more reliable — and proven to work in practice.
//
// To add a native feed:   { name, type, feed: "https://.../feed" }
// To add a Google source: use googleSite() or googleQuery() helpers below.

// Build a Google News RSS URL from a raw query string (already URL-encoded).
const GNEWS = (q) =>
  "https://news.google.com/rss/search?q=" + q + "&hl=en-GB&gl=GB&ceid=GB:en";

// One organisation's output, filtered to relevant topics.
// site:domain limits to that org; the topic terms keep it on-brief.
const googleSite = (domain) =>
  GNEWS(
    `site:${domain}+(devolution+OR+council+OR+%22local+government%22+OR+funding+OR+housing+OR+mayor)`
  );

export const SOURCES = [
  // --- Think tanks ---
  // These five use Google News site: queries because their native RSS feeds
  // were dead (404) or returned malformed XML. Google News covers them
  // reliably. Swap back to a native feed here if you find a working one.
  { name: "IPPR",                     type: "thinktank", feed: googleSite("ippr.org") },
  { name: "Centre for Cities",        type: "thinktank", feed: googleSite("centreforcities.org") },
  { name: "Institute for Government", type: "thinktank", feed: googleSite("instituteforgovernment.org.uk") },
  { name: "Reform",                   type: "thinktank", feed: googleSite("reform.uk") },

  // These three native feeds work — leave them as-is.
  { name: "Resolution Foundation",    type: "thinktank", feed: "https://www.resolutionfoundation.org/feed/" },
  { name: "New Local",                type: "thinktank", feed: "https://www.newlocal.org.uk/feed/" },

  // These two load but often return 0 items — harmless, kept per your call.
  { name: "Onward",                   type: "thinktank", feed: "https://www.ukonward.com/feed/" },
  { name: "Localis",                  type: "thinktank", feed: "https://www.localis.org.uk/feed/" },

  // --- Official / Parliament (native feeds, working) ---
  { name: "Commons Library",          type: "official",  feed: "https://commonslibrary.parliament.uk/feed/" },
  { name: "National Audit Office",    type: "official",  feed: "https://www.nao.org.uk/feed/" },

  // --- Sector press ---
  { name: "Room151",                  type: "press",     feed: "https://www.room151.co.uk/feed/" }, // native, works
  { name: "LGC",                      type: "press",     feed: "https://www.lgcplus.com/feed/" },    // native, works
  // The MJ's native feed 404s — via Google News instead.
  { name: "The MJ",                   type: "press",     feed: googleSite("themj.co.uk") },

  // --- Broad catch-all: Google News topic queries ---
  // Backstop the named sources and catch gov.uk publications, academic
  // pieces, and anything else. Two complementary queries widen the net.
  //   %22 = a double-quote (exact phrase)   + = a space   OR = literal OR
  {
    name: "Google News (devolution)",
    type: "press",
    feed: GNEWS(
      "(%22devolution%22+OR+%22combined+authority%22+OR+%22strategic+authority%22+OR+%22metro+mayor%22)" +
      "+(council+OR+funding+OR+finance+OR+powers)+UK"
    ),
  },
  {
    name: "Google News (council finance)",
    type: "press",
    feed: GNEWS(
      "(%22council+tax%22+OR+%22business+rates%22+OR+%22section+114%22+OR+%22council+housing%22+OR+%22local+government+finance%22)" +
      "+UK"
    ),
  },
];

// Human-readable group headings, in the order they appear in the email.
export const GROUPS = [
  { type: "official",  label: "Official & Parliament" },
  { type: "thinktank", label: "Think tanks & research" },
  { type: "press",     label: "Sector press & other" },
];

// An item is kept if its title OR summary contains any keyword.
// Matching is punctuation-insensitive substring (see matchesKeyword).
//
// TIP: prefer STEMS over full words. "devolv" catches devolve, devolved,
// devolving, devolution and devolutionary in one. "settle" catches
// settlement and settlements. This is the main lever if you're getting
// too few items — shorten a keyword to its stem. If you get NOISE, make
// a keyword longer/more specific again.
export const KEYWORDS = [
  // core devolution — stems catch all variants
  "devolv",              // devolve / devolved / devolving / devolution
  "devolution",
  "combined authorit",   // authority / authorities
  "mayoral",
  "metro mayor",
  "metro-mayor",
  "elected mayor",
  "strategic authorit",  // the new English Devolution term
  "county deal",
  "devolution deal",
  "english devolution",

  // council / local government finance
  "council tax",
  "business rates",
  "local government finance",
  "local government funding",
  "council finance",
  "council funding",
  "local authority finance",
  "local authority funding",
  "fair funding",
  "funding formula",
  "revenue support grant",
  "single settlement",
  "multi-year settlement",
  "section 114",
  "s114",
  "financial sustainability",
  "council bankrupt",    // "bankrupt" / "bankruptcy"

  // housing / growth (your platform's core)
  "council housing",
  "council house",
  "housebuilding",
  "house building",
  "social housing",
  "hra",                 // Housing Revenue Account
  "housing revenue account",
  "right to buy",
  "local growth",
  "growth plan",
  "levelling up",

  // institutions / policy vehicles that signal relevance
  "mhclg",               // the department
  "local government reorganisation",
  "unitary",             // unitary authority / reorganisation
  "precept",
];

// How far back to look each run (hours). 26 gives a little overlap
// so a slightly-late daily run never drops a day.
export const LOOKBACK_HOURS = 26;
