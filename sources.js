// sources.js
// Curated list of UK local-government / fiscal-devolution sources.
// Each source has an RSS/Atom feed. Feeds are polled daily and filtered
// against KEYWORDS before anything is sent to Claude for summarising.
//
// "type" groups items in the email: "thinktank" | "official" | "press".
//
// To add a source: find its RSS feed URL and add a { name, type, feed } row.
// To tune what gets through: edit KEYWORDS below.

export const SOURCES = [
  // --- Think tanks ---
  { name: "IPPR",                     type: "thinktank", feed: "https://www.ippr.org/feed" },
  { name: "Centre for Cities",        type: "thinktank", feed: "https://www.centreforcities.org/feed/" },
  { name: "Institute for Government", type: "thinktank", feed: "https://www.instituteforgovernment.org.uk/feed" },
  { name: "Resolution Foundation",    type: "thinktank", feed: "https://www.resolutionfoundation.org/feed/" },
  { name: "New Local",                type: "thinktank", feed: "https://www.newlocal.org.uk/feed/" },
  { name: "Onward",                   type: "thinktank", feed: "https://www.ukonward.com/feed/" },
  { name: "Reform",                   type: "thinktank", feed: "https://reform.uk/feed/" },
  { name: "Localis",                  type: "thinktank", feed: "https://www.localis.org.uk/feed/" },

  // --- Official / Parliament ---
  { name: "Commons Library",          type: "official",  feed: "https://commonslibrary.parliament.uk/feed/" },
  { name: "National Audit Office",    type: "official",  feed: "https://www.nao.org.uk/feed/" },

  // --- Sector press (council finance / local gov) ---
  { name: "Room151",                  type: "press",     feed: "https://www.room151.co.uk/feed/" },
  { name: "LGC",                      type: "press",     feed: "https://www.lgcplus.com/feed/" },
  { name: "The MJ",                   type: "press",     feed: "https://www.themj.co.uk/rss" },

  // --- Catch-all: Google News queries as RSS feeds ---
  // These backstop the curated feeds and catch gov.uk publications, academic
  // pieces, and anything the named sources miss. Two complementary queries
  // widen the net. Tagged "press" for grouping.
  //
  // The query is the bit after q= and before &hl. It's URL-encoded:
  //   %22 = a double-quote (for exact phrases)   + = a space   OR = literal OR
  // To tune, edit the phrases; keep the &hl=en-GB&gl=GB&ceid=GB:en tail so
  // results stay UK-focused.
  {
    name: "Google News (devolution)",
    type: "press",
    feed:
      "https://news.google.com/rss/search?q=" +
      "(%22devolution%22+OR+%22combined+authority%22+OR+%22strategic+authority%22+OR+%22metro+mayor%22)" +
      "+(council+OR+funding+OR+finance+OR+powers)+UK" +
      "&hl=en-GB&gl=GB&ceid=GB:en",
  },
  {
    name: "Google News (council finance)",
    type: "press",
    feed:
      "https://news.google.com/rss/search?q=" +
      "(%22council+tax%22+OR+%22business+rates%22+OR+%22section+114%22+OR+%22council+housing%22+OR+%22local+government+finance%22)" +
      "+UK" +
      "&hl=en-GB&gl=GB&ceid=GB:en",
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
