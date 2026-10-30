export const SECTORS = [
  "Food & Beverage",
  "Kitchen Technology",
  "Indoor & Outdoor",
  "Sonderschau Barbesuch",
  "Lefa",
  "Table Top",
  "Coffee & Tea"
];

const verified = "2026-10-30";

export const demoResult = {
  meta: {
    mode: "demo",
    generatedAt: "2026-10-30T08:24:00Z",
    verificationDate: verified,
    sourceCount: 7,
    unresolvedGaps: ["Past igeho participation has not been verified for every demo prospect."]
  },
  query: {
    term: "RATIONAL",
    kind: "player",
    geography: ["CH", "DE", "AT"],
    primarySector: "Kitchen Technology"
  },
  center: {
    id: "center-rational",
    name: "RATIONAL",
    kind: "current exhibitor",
    subtitle: "Kitchen Technology · current exhibitor"
  },
  sectors: SECTORS.map((name, index) => ({
    id: `sector-${index + 1}`,
    name,
    kind: "sector",
    count: name === "Kitchen Technology" ? 4 : 0,
    active: name === "Kitchen Technology"
  })),
  groups: [
    { id: "group-competitors", name: "Competitors", kind: "group", sector: "Kitchen Technology", count: 2 },
    { id: "group-distributors", name: "Distributors", kind: "group", sector: "Kitchen Technology", count: 2 },
    { id: "group-contacts", name: "Contacts", kind: "group", sector: "Kitchen Technology", count: 3 },
    { id: "group-drafts", name: "Outreach drafts", kind: "group", sector: "Kitchen Technology", count: 2 },
    { id: "group-signals", name: "Market signals", kind: "group", sector: "Kitchen Technology", count: 2 },
    { id: "group-sources", name: "Sources", kind: "group", sector: "Kitchen Technology", count: 7 }
  ],
  companies: [
    {
      id: "company-unox",
      groupId: "group-competitors",
      name: "UNOX",
      kind: "company",
      relationship: "Direct competitor",
      score: 87,
      tier: "A",
      tierReason: "Direct combi-oven overlap, Swiss market presence, and strong hospitality buyer fit.",
      igehoStatus: "unverified",
      sector: "Kitchen Technology",
      geography: { country: "CH", region: "Switzerland", presence: "Verified Swiss market route" },
      scoreBreakdown: { competitorOverlap: 35, swissPresence: 16, sectorFit: 15, dachFairs: 8, capacity: 8, pastIgeho: 5 },
      contacts: [
        { name: "UNOX Switzerland sales", role: "Sales", email: "", phone: "", language: "DE", confidence: "not found", route: "Official contact form", sourceUrl: "https://www.unox.com/en_ch/contact-us/", verifiedAt: verified }
      ],
      evidence: [
        { label: "Professional ovens product portfolio", claim: "Official portfolio supports direct product-category overlap.", url: "https://www.unox.com/en_ch/", verifiedAt: verified, confidence: "verified" },
        { label: "Official Swiss contact route", claim: "Country-specific contact path supports Swiss market activity.", url: "https://www.unox.com/en_ch/contact-us/", verifiedAt: verified, confidence: "verified" }
      ]
    },
    {
      id: "company-eloma",
      groupId: "group-competitors",
      name: "Eloma",
      kind: "company",
      relationship: "Direct competitor",
      score: 76,
      tier: "A",
      tierReason: "Close cooking-technology fit with a credible DACH sales story; Swiss status needs confirmation.",
      igehoStatus: "unverified",
      sector: "Kitchen Technology",
      geography: { country: "DE", region: "Bavaria", presence: "DACH manufacturer; Swiss route to verify" },
      scoreBreakdown: { competitorOverlap: 35, swissPresence: 8, sectorFit: 15, dachFairs: 8, capacity: 8, pastIgeho: 2 },
      contacts: [
        { name: "Eloma sales team", role: "Sales", email: "", phone: "", language: "DE", confidence: "not found", route: "Official contact page", sourceUrl: "https://www.eloma.com/en/contact/", verifiedAt: verified }
      ],
      evidence: [
        { label: "Official product portfolio", claim: "Combi-steamers and professional cooking systems establish category overlap.", url: "https://www.eloma.com/en/", verifiedAt: verified, confidence: "verified" },
        { label: "Official company contact", claim: "Public company-level contact route.", url: "https://www.eloma.com/en/contact/", verifiedAt: verified, confidence: "verified" }
      ]
    },
    {
      id: "company-gourmet-technik",
      groupId: "group-distributors",
      name: "Gourmet Technik",
      kind: "company",
      relationship: "Swiss distributor",
      score: 68,
      tier: "B",
      tierReason: "Swiss distribution relevance and sector fit; represented brands require manual confirmation.",
      igehoStatus: "unverified",
      sector: "Kitchen Technology",
      geography: { country: "CH", region: "German-speaking Switzerland", presence: "Swiss company-level route" },
      scoreBreakdown: { competitorOverlap: 20, swissPresence: 20, sectorFit: 13, dachFairs: 3, capacity: 7, pastIgeho: 5 },
      contacts: [
        { name: "General sales route", role: "Sales", email: "", phone: "", language: "DE", confidence: "not found", route: "Public company contact", sourceUrl: "https://www.gourmet-technik.ch/", verifiedAt: verified }
      ],
      evidence: [
        { label: "Company website", claim: "Public Swiss company route; portfolio and brand links need sales verification.", url: "https://www.gourmet-technik.ch/", verifiedAt: verified, confidence: "verified" }
      ]
    },
    {
      id: "company-salvis",
      groupId: "group-distributors",
      name: "Salvis",
      kind: "company",
      relationship: "Swiss market player",
      score: 54,
      tier: "B",
      tierReason: "Strong Swiss presence, but incumbent or represented-brand overlap must be cleared before outreach.",
      igehoStatus: "current exhibitor",
      sector: "Kitchen Technology",
      geography: { country: "CH", region: "Lucerne", presence: "Swiss headquarters" },
      scoreBreakdown: { competitorOverlap: 15, swissPresence: 20, sectorFit: 12, dachFairs: 3, capacity: 4, pastIgeho: 0 },
      contacts: [],
      evidence: [
        { label: "Official website", claim: "Swiss professional kitchen technology offering.", url: "https://www.salvis.ch/", verifiedAt: verified, confidence: "verified" }
      ]
    }
  ],
  supporting: [
    { id: "contact-sales", groupId: "group-contacts", kind: "evidence", name: "3 public routes", subtitle: "Sales first · no guessed emails" },
    { id: "draft-de", groupId: "group-drafts", kind: "draft", name: "DE sales draft", subtitle: "Human review required", draft: "Betreff: Küchenkompetenz an der igeho sichtbar machen\n\nGuten Tag\n\nIhre Lösungen für professionelle Küchen passen zum Fachpublikum der igeho. Relevante Anbieter aus der Küchentechnik sind bereits im Umfeld der Messe vertreten. Gerne prüfen wir mit Ihnen einen sachlichen Messeauftritt für den Schweizer Hospitality-Markt.\n\nFalls diese Kontaktaufnahme nicht erwünscht ist, genügt eine kurze Nachricht.\n\nFreundliche Grüsse\nigeho Sales" },
    { id: "signal-sector", groupId: "group-signals", kind: "evidence", name: "Automation demand", subtitle: "Signal · verification dated" },
    { id: "source-official", groupId: "group-sources", kind: "evidence", name: "7 cited sources", subtitle: `Checked ${verified}` }
  ]
};
