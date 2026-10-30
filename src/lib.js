import { demoResult, SECTORS } from "./data.js";

const csvCell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function normalizeResult(payload) {
  if (!payload || typeof payload !== "object") throw new Error("The API returned an invalid result.");
  if (!payload.center?.name || !Array.isArray(payload.companies)) throw new Error("The API result is missing the center or company list.");
  const sectors = Array.isArray(payload.sectors) && payload.sectors.length
    ? payload.sectors
    : SECTORS.map((name, index) => ({ id: `sector-${index + 1}`, name, kind: "sector", count: 0 }));
  return {
    ...payload,
    meta: { mode: "api", generatedAt: new Date().toISOString(), verificationDate: null, ...payload.meta },
    query: { term: payload.center.name, kind: "player", geography: ["CH", "DE", "AT"], primarySector: sectors[0]?.name, ...payload.query },
    sectors,
    groups: Array.isArray(payload.groups) ? payload.groups : [],
    supporting: Array.isArray(payload.supporting) ? payload.supporting : [],
    companies: payload.companies.map((company, index) => ({
      ...company,
      id: company.id || `company-${index + 1}`,
      kind: "company",
      score: Number.isFinite(Number(company.score)) ? Number(company.score) : 0,
      contacts: Array.isArray(company.contacts) ? company.contacts : [],
      evidence: Array.isArray(company.evidence) ? company.evidence : [],
      scoreBreakdown: company.scoreBreakdown && typeof company.scoreBreakdown === "object" ? company.scoreBreakdown : {},
      geography: company.geography && typeof company.geography === "object" ? company.geography : {},
      tier: ["A", "B", "C"].includes(company.tier) ? company.tier : scoreTier(company.score),
      igehoStatus: ["current exhibitor", "past exhibitor", "new prospect", "unverified"].includes(company.igehoStatus) ? company.igehoStatus : "unverified"
    }))
  };
}

export function scoreTier(score = 0) {
  return Number(score) >= 75 ? "A" : Number(score) >= 50 ? "B" : "C";
}

export async function loadResults({ term, filters = {} }, { apiUrl = "", fetchImpl = globalThis.fetch } = {}) {
  const cleanedTerm = String(term || "").trim();
  if (!cleanedTerm) throw new Error("Enter a player, competitor, distributor, or sector.");
  if (!apiUrl) {
    await new Promise(resolve => setTimeout(resolve, 180));
    const known = ["rational", "kitchen", "kitchen technology", "unox", "eloma", "salvis"];
    if (!known.some(value => cleanedTerm.toLowerCase().includes(value))) return normalizeResult({
      ...structuredClone(demoResult),
      query: { ...demoResult.query, term: cleanedTerm },
      center: { ...demoResult.center, id: `center-${slug(cleanedTerm)}`, name: cleanedTerm },
      companies: [],
      groups: [],
      supporting: [],
      meta: { ...demoResult.meta, empty: true }
    });
    const result = structuredClone(demoResult);
    result.query.term = cleanedTerm;
    result.center.name = cleanedTerm;
    return normalizeResult(result);
  }
  let response;
  try {
    response = await fetchImpl(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: cleanedTerm, filters })
    });
  } catch {
    throw new Error("The prospecting service could not be reached. Check the API URL and network configuration.");
  }
  if (!response.ok) throw new Error(`The prospecting service returned ${response.status}. Try again or contact an administrator.`);
  return normalizeResult(await response.json());
}

export function filterCompanies(companies, filters = {}) {
  const text = String(filters.search || "").trim().toLowerCase();
  return companies.filter(company => {
    const haystack = [company.name, company.relationship, company.sector, company.geography?.region, ...company.contacts.map(c => `${c.name} ${c.role}`)].join(" ").toLowerCase();
    return (!text || haystack.includes(text))
      && (!filters.sector || filters.sector === "all" || company.sector === filters.sector)
      && (!filters.country || filters.country === "all" || company.geography?.country === filters.country)
      && (!filters.tier || filters.tier === "all" || company.tier === filters.tier)
      && (!filters.status || filters.status === "all" || company.igehoStatus === filters.status);
  });
}

export function resultToCsv(result) {
  const headers = ["Company", "Relationship", "Score", "Tier", "Tier reason", "igeho status", "Sector", "Country", "Region", "Contact", "Role", "Public route", "Email confidence", "Source URL", "Verification date"];
  const rows = [];
  for (const company of result.companies) {
    const contacts = company.contacts.length ? company.contacts : [{}];
    for (const contact of contacts) {
      rows.push([
        company.name, company.relationship, company.score, company.tier, company.tierReason,
        company.igehoStatus, company.sector, company.geography?.country, company.geography?.region,
        contact.name, contact.role, contact.route || contact.email || contact.phone,
        contact.confidence, contact.sourceUrl || company.evidence?.[0]?.url, contact.verifiedAt || company.evidence?.[0]?.verifiedAt
      ]);
    }
  }
  return [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
}

export function slug(value) {
  return String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "result";
}

export function buildGraph(result) {
  const activeSector = result.query.primarySector || result.sectors.find(s => s.active)?.name;
  const center = { ...result.center, kind: "center", x: 0, y: 0, width: 230, height: 88, parentId: null, expandable: true };
  const left = result.sectors.filter((_, i) => i % 2 === 0);
  const right = result.sectors.filter((_, i) => i % 2 === 1);
  const positionSide = (items, side) => items.map((sector, index) => ({
    ...sector,
    x: side === "left" ? -390 : 390,
    y: (index - (items.length - 1) / 2) * 160,
    width: 190,
    height: 66,
    parentId: center.id,
    side,
    active: sector.name === activeSector,
    expandable: sector.name === activeSector && result.groups.length > 0
  }));
  const sectors = [...positionSide(left, "left"), ...positionSide(right, "right")];
  const active = sectors.find(s => s.active);
  const branchSide = active?.side || "right";
  const groupX = branchSide === "left" ? -690 : 690;
  const groups = result.groups.map((group, index) => ({
    ...group,
    x: groupX,
    y: (index - (result.groups.length - 1) / 2) * 112,
    width: 178,
    height: 58,
    parentId: active?.id,
    side: branchSide,
    expandable: result.companies.some(c => c.groupId === group.id) || result.supporting.some(s => s.groupId === group.id)
  }));
  const items = [...result.companies, ...result.supporting];
  const leafX = branchSide === "left" ? -980 : 980;
  const leaves = [];
  for (const group of groups) {
    const children = items.filter(item => item.groupId === group.id);
    children.forEach((item, index) => leaves.push({
      ...item,
      x: leafX,
      y: group.y + (index - (children.length - 1) / 2) * 80,
      width: item.kind === "company" ? 210 : 190,
      height: item.kind === "company" ? 68 : 58,
      parentId: group.id,
      side: branchSide,
      expandable: false
    }));
  }
  return [center, ...sectors, ...groups, ...leaves];
}
