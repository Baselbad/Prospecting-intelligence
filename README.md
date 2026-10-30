# igeho Prospecting Intelligence

An accessible, responsive mindmap for reviewing evidence-backed igeho prospecting results. The searched player, competitor, distributor, or sector sits at the center; the seven igeho sectors form the first branch level; the active sector expands into competitors, distributors, contacts, outreach drafts, market signals, and sources.

The repository contains no contact dataset, API credential, or secret. With no API configured, it runs against a clearly labelled demo fixture so the complete review workflow can be evaluated.

## Local setup

Requirements: Node.js 20 or newer. The production interface has no third-party runtime packages; development dependencies provide browser and accessibility testing.

```bash
cp .env.example .env
set -a && . ./.env && set +a
npm run dev
```

Open `http://localhost:4173`. Set `PORT` to use a different local port.

Run the complete local check:

```bash
npm run check
```

`npm test` uses Node's built-in test runner. `npm run build` writes a deployment-ready static bundle to `dist/`.

Browser checks require the pinned Playwright browser:

```bash
npx playwright install chromium
npm run test:browser
npm run test:a11y
```

## API configuration

Set `PROSPECTING_API_URL` to a public browser path. For an authenticated upstream, use a relative same-origin path such as `/api/prospecting`; never put bearer tokens or other secrets in this value, generated `config.js`, frontend code, logs, fixtures, or browser storage. The proxy keeps `PROSPECTING_AGENT_API_URL` and `PROSPECTING_AGENT_API_TOKEN` server-side in the hosting platform's secret manager.

See [Secure same-origin API proxy](docs/secure-api-proxy.md) for a Node handler pattern, environment separation, request validation, error handling, and CORS guidance.

The browser sends:

```json
{
  "query": "RATIONAL",
  "filters": {
    "search": "",
    "sector": "all",
    "country": "all",
    "tier": "all",
    "status": "all"
  }
}
```

The endpoint should return this shape (fields not shown may be omitted):

```json
{
  "meta": {
    "generatedAt": "2026-10-30T08:24:00Z",
    "verificationDate": "2026-10-30",
    "sourceCount": 7,
    "unresolvedGaps": []
  },
  "query": {
    "term": "RATIONAL",
    "kind": "player",
    "primarySector": "Kitchen Technology"
  },
  "center": {
    "id": "center-rational",
    "name": "RATIONAL",
    "subtitle": "Kitchen Technology"
  },
  "sectors": [
    { "id": "sector-2", "name": "Kitchen Technology", "kind": "sector", "active": true }
  ],
  "groups": [
    { "id": "group-competitors", "name": "Competitors", "kind": "group", "sector": "Kitchen Technology", "count": 1 }
  ],
  "companies": [
    {
      "id": "company-unox",
      "groupId": "group-competitors",
      "name": "UNOX",
      "relationship": "Direct competitor",
      "score": 87,
      "tier": "A",
      "tierReason": "One-line evidence-backed reason",
      "igehoStatus": "unverified",
      "sector": "Kitchen Technology",
      "geography": { "country": "CH", "region": "Switzerland", "presence": "Verified market route" },
      "scoreBreakdown": { "competitorOverlap": 35, "swissPresence": 16 },
      "contacts": [
        {
          "name": "Public sales route",
          "role": "Sales",
          "route": "Official contact form",
          "language": "DE",
          "confidence": "not found",
          "sourceUrl": "https://example.com/contact",
          "verifiedAt": "2026-10-30"
        }
      ],
      "evidence": [
        {
          "label": "Official product page",
          "claim": "Direct category overlap",
          "url": "https://example.com/products",
          "verifiedAt": "2026-10-30",
          "confidence": "verified"
        }
      ]
    }
  ],
  "supporting": []
}
```

Every material claim should include a public source URL and verification date. Email confidence must be `verified`, `pattern-guessed`, or `not found`; inferred data must never be presented as verified. The interface never sends outreach or writes to a CRM.

## Interaction and accessibility

- Drag or use a pointer to pan; scroll or pinch to zoom; use Fit to view to reset framing.
- Use arrow keys to move between visible nodes, Enter or Space to open/toggle, `+`/`-` to zoom, and `0` to fit.
- Filters dim non-matching company nodes without removing the sector context.
- Selecting a company opens its score, tier reason, igeho status, geography, public contacts, confidence labels, and dated evidence.
- CSV export respects the active filters and preserves public contact routes and evidence dates.
- Reduced-motion preferences, visible focus states, minimum touch targets, semantic labels, and responsive tablet layouts are included.

## Deployment

This repository does not provide hosting. A deployment requires an explicitly approved target, `PROSPECTING_API_URL` configuration, and verification of both the public URL and deployed commit. A merged source commit alone is not proof of deployment.

