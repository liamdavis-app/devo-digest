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

  // --- Catch-all: Google News query as an RSS feed ---
  // Backstops the curated feeds and catches gov.uk publications, academic
  // pieces, and anything the named sources miss. Tagged "press" for grouping.
  {
    name: "Google News (devolution)",
    type: "press",
    feed: "https://news.google.com/rss/search?q=%22fiscal+devolution%22+OR+%22local+government+devolution%22+OR+%22combined+authority%22+UK&hl=en-GB&gl=GB&ceid=GB:en",
  },
];

// Human-readable group headings, in the order they appear in the email.
export const GROUPS = [
  { type: "official",  label: "Official & Parliament" },
  { type: "thinktank", label: "Think tanks & research" },
  { type: "press",     label: "Sector press & other" },
];

// An item is kept only if its title OR summary contains at least one keyword.
// Lowercased, matched as substrings. Keep these tight to avoid noise.
export const KEYWORDS = [
  "devolution",
  "devolved",
  "fiscal devolution",
  "combined authority",
  "combined authorities",
  "mayoral",
  "metro mayor",
  "council tax",
  "business rates",
  "local government finance",
  "council finance",
  "levelling up",
  "english devolution",
  "council housing",
  "housebuilding",
  "local growth",
  "fair funding",
  "revenue support grant",
  "section 114",
  "single settlement",
];

// How far back to look each run (hours). 26 gives a little overlap
// so a slightly-late daily run never drops a day.
export const LOOKBACK_HOURS = 26;
