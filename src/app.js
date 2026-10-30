import { demoResult, SECTORS } from "./data.js";
import { buildGraph, filterCompanies, loadResults, resultToCsv, slug } from "./lib.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const config = window.__IGEHO_CONFIG__ || {};
const elements = Object.fromEntries([
  "query-form", "query-input", "map-search", "sector-filter", "country-filter", "tier-filter", "status-filter",
  "reset-filters", "result-count", "freshness", "mindmap-svg", "viewport", "edges", "nodes", "state-panel",
  "legend-button", "legend-panel", "zoom-in", "zoom-out", "zoom-level", "fit-view", "expand-all", "collapse-all",
  "export-button", "inspector", "inspector-title", "inspector-type", "inspector-body", "close-inspector", "toast"
].map(id => [id, document.getElementById(id)]));

let result = structuredClone(demoResult);
let graph = buildGraph(result);
let collapsed = new Set(result.groups.filter(group => !["group-competitors", "group-distributors"].includes(group.id)).map(group => group.id));
let selectedId = null;
let keyboardId = result.center.id;
let view = { x: 0, y: 0, scale: 1 };
let drag = null;

for (const sector of SECTORS) {
  const option = document.createElement("option");
  option.value = option.textContent = sector;
  elements["sector-filter"].append(option);
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function textEl(text, x, y, className) {
  const el = svgEl("text", { x, y, class: className });
  el.textContent = text;
  return el;
}

function visibleNodes() {
  const byId = new Map(graph.map(node => [node.id, node]));
  return graph.filter(node => {
    let current = node;
    while (current.parentId) {
      if (collapsed.has(current.parentId)) return false;
      current = byId.get(current.parentId);
      if (!current) return false;
    }
    return true;
  });
}

function filters() {
  return {
    search: elements["map-search"].value,
    sector: elements["sector-filter"].value,
    country: elements["country-filter"].value,
    tier: elements["tier-filter"].value,
    status: elements["status-filter"].value
  };
}

function render() {
  const visible = visibleNodes();
  const visibleIds = new Set(visible.map(node => node.id));
  const matches = new Set(filterCompanies(result.companies, filters()).map(company => company.id));
  const filterActive = Object.values(filters()).some(value => value && value !== "all");
  elements.edges.replaceChildren();
  elements.nodes.replaceChildren();

  for (const node of visible) {
    if (!node.parentId || !visibleIds.has(node.parentId)) continue;
    const parent = graph.find(item => item.id === node.parentId);
    const startX = parent.x + Math.sign(node.x - parent.x) * parent.width / 2;
    const endX = node.x - Math.sign(node.x - parent.x) * node.width / 2;
    const midX = (startX + endX) / 2;
    const path = svgEl("path", {
      d: `M ${startX} ${parent.y} C ${midX} ${parent.y}, ${midX} ${node.y}, ${endX} ${node.y}`,
      class: `map-edge ${["evidence", "draft"].includes(node.kind) ? "supporting" : ""}`
    });
    elements.edges.append(path);
  }

  for (const node of visible) {
    const isFiltered = node.kind === "company" && filterActive && !matches.has(node.id);
    const g = svgEl("g", {
      class: `map-node ${node.kind} ${node.active ? "active" : ""} ${node.tier ? `tier-${node.tier}` : ""} ${selectedId === node.id ? "selected" : ""} ${isFiltered ? "filtered" : ""} ${filters().search && matches.has(node.id) ? "search-match" : ""}`,
      transform: `translate(${node.x - node.width / 2} ${node.y - node.height / 2})`,
      role: "treeitem",
      tabindex: node.id === keyboardId ? 0 : -1,
      "aria-label": nodeAria(node),
      "aria-expanded": node.expandable ? String(!collapsed.has(node.id)) : undefined,
      "data-id": node.id
    });
    g.append(svgEl("rect", { class: "node-shape", width: node.width, height: node.height, rx: 6 }));
    const padding = 15;
    const kicker = node.kind === "center" ? "SEARCHED PLAYER" : node.kind === "company" ? `${node.relationship || "PROSPECT"} · TIER ${node.tier}` : node.kind === "sector" ? "IGEHO SECTOR" : node.kind === "group" ? `${node.count || 0} RESULTS` : node.kind === "draft" ? "OUTREACH · REVIEW" : "SUPPORTING EVIDENCE";
    g.append(textEl(kicker, padding, node.kind === "company" ? 17 : 18, "node-kicker"));
    g.append(textEl(shorten(node.name, node.kind === "center" ? 27 : 24), padding, node.kind === "company" ? 38 : 40, "node-title"));
    const meta = node.kind === "company" ? `${node.score}/100 · ${node.geography?.country || "—"} · ${node.igehoStatus}` : node.subtitle || (node.kind === "center" ? node.subtitle : "");
    if (meta) g.append(textEl(shorten(meta, 36), padding, node.height - 10, "node-meta"));
    if (node.kind === "company") {
      g.append(svgEl("circle", { class: "score-disc", cx: node.width - 24, cy: 35, r: 16 }));
      g.append(textEl(node.score, node.width - 24, 39, "score-text"));
    }
    if (node.expandable) {
      g.append(svgEl("circle", { cx: node.width - 14, cy: 14, r: 10, fill: "#fff", stroke: "#c6d0ca" }));
      g.append(textEl(collapsed.has(node.id) ? "+" : "−", node.width - 14, 19, "node-expand"));
    }
    g.addEventListener("click", event => { event.stopPropagation(); activateNode(node); });
    g.addEventListener("focus", () => { keyboardId = node.id; });
    elements.nodes.append(g);
  }
  const filteredCount = matches.size;
  elements["result-count"].textContent = `${filteredCount} prospect${filteredCount === 1 ? "" : "s"}`;
  const date = result.meta.verificationDate || result.meta.generatedAt?.slice(0, 10);
  elements.freshness.textContent = `${result.meta.mode === "demo" ? "Demo" : "API"} · checked ${date || "date unavailable"}`;
  applyView();
}

function nodeAria(node) {
  if (node.kind === "company") return `${node.name}, tier ${node.tier}, score ${node.score}, ${node.igehoStatus}. Open details.`;
  return `${node.name}${node.expandable ? `, ${collapsed.has(node.id) ? "collapsed" : "expanded"}` : ""}`;
}

function shorten(value, max) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function activateNode(node) {
  selectedId = node.id;
  keyboardId = node.id;
  if (node.expandable) collapsed.has(node.id) ? collapsed.delete(node.id) : collapsed.add(node.id);
  if (["company", "evidence", "draft"].includes(node.kind)) openInspector(node);
  render();
  requestAnimationFrame(() => elements.nodes.querySelector(`[data-id="${CSS.escape(node.id)}"]`)?.focus());
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch { return "#"; }
}

function openInspector(node) {
  elements.inspector.hidden = false;
  elements["inspector-title"].textContent = node.name;
  elements["inspector-type"].textContent = node.kind === "company" ? node.relationship || "Prospect" : node.kind;
  const body = elements["inspector-body"];
  body.replaceChildren();
  if (node.kind === "company") body.append(companyDetails(node));
  else if (node.kind === "draft") body.append(draftDetails(node));
  else body.append(evidenceDetails(node));
}

function companyDetails(company) {
  const fragment = document.createDocumentFragment();
  const score = el("div", "score-row");
  const ring = el("div", "score-ring");
  ring.style.setProperty("--score-angle", `${Math.min(100, company.score) * 3.6}deg`);
  ring.append(el("strong", "", String(company.score)));
  score.append(ring, htmlBlock(`<div><span class="tier tier-${company.tier.toLowerCase()}">Tier ${escapeHtml(company.tier)}</span><p>${escapeHtml(company.tierReason || "Score explanation unavailable.")}</p></div>`));
  fragment.append(score);
  fragment.append(htmlBlock(`<div class="meta-grid">
    <div class="meta-item"><span>igeho status</span><strong>${escapeHtml(company.igehoStatus)}</strong></div>
    <div class="meta-item"><span>Sector</span><strong>${escapeHtml(company.sector)}</strong></div>
    <div class="meta-item"><span>Geography</span><strong>${escapeHtml(`${company.geography?.country || "—"} · ${company.geography?.region || "Not found"}`)}</strong></div>
    <div class="meta-item"><span>Presence</span><strong>${escapeHtml(company.geography?.presence || "Unverified")}</strong></div>
  </div>`));
  const scoreSection = detailSection("Score breakdown");
  scoreSection.append(htmlBlock(`<div class="meta-grid">${Object.entries(company.scoreBreakdown || {}).map(([key, value]) => `<div class="meta-item"><span>${escapeHtml(labelize(key))}</span><strong>${escapeHtml(value)} pts</strong></div>`).join("")}</div>`));
  fragment.append(scoreSection);
  const contacts = detailSection("Public business contacts");
  if (!company.contacts.length) contacts.append(el("p", "", "No verified public contact was found. Do not infer one."));
  for (const contact of company.contacts) {
    const item = el("div", "contact");
    item.append(htmlBlock(`<div class="contact-head"><strong>${escapeHtml(contact.name)}</strong><span class="confidence ${contact.confidence === "verified" ? "" : "unverified"}">${escapeHtml(contact.confidence)}</span></div><p>${escapeHtml(contact.role)} · ${escapeHtml(contact.language || "Language unverified")}</p>`));
    const link = document.createElement("a"); link.href = safeUrl(contact.sourceUrl); link.target = "_blank"; link.rel = "noreferrer"; link.textContent = contact.route || contact.email || "Open public source";
    item.append(link, el("p", "", `Verified ${contact.verifiedAt || "date unavailable"}`));
    contacts.append(item);
  }
  fragment.append(contacts);
  const evidence = detailSection("Evidence");
  for (const source of company.evidence || []) {
    const item = el("div", "evidence-link");
    const link = document.createElement("a"); link.href = safeUrl(source.url); link.target = "_blank"; link.rel = "noreferrer"; link.textContent = source.label;
    item.append(link, el("p", "", source.claim), el("p", "", `${source.confidence} · checked ${source.verifiedAt}`));
    evidence.append(item);
  }
  fragment.append(evidence);
  return fragment;
}

function draftDetails(node) {
  const section = detailSection("Draft for human review");
  section.append(el("div", "draft-box", node.draft || "Draft unavailable."));
  const button = el("button", "quiet-button copy-button", "Copy draft");
  button.type = "button";
  button.addEventListener("click", async () => { await navigator.clipboard.writeText(node.draft || ""); showToast("Draft copied for review"); });
  section.append(button, el("p", "", "No outreach is sent from this interface. Legal confirmation is required before first contact."));
  return section;
}

function evidenceDetails(node) {
  const section = detailSection("Result note");
  section.append(el("p", "", node.subtitle || "Supporting material for the selected prospecting result."));
  return section;
}

function detailSection(title) { const section = el("section", "detail-section"); section.append(el("h3", "", title)); return section; }
function el(tag, className = "", text = "") { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function htmlBlock(html) { const template = document.createElement("template"); template.innerHTML = html; return template.content; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function labelize(value) { return String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase()); }

function applyView() {
  elements.viewport.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.scale})`);
  elements["zoom-level"].value = `${Math.round(view.scale * 100)}%`;
  elements["zoom-level"].textContent = `${Math.round(view.scale * 100)}%`;
}

function setZoom(nextScale, clientX, clientY) {
  const rect = elements["mindmap-svg"].getBoundingClientRect();
  const pointX = (clientX ?? rect.left + rect.width / 2) - rect.left;
  const pointY = (clientY ?? rect.top + rect.height / 2) - rect.top;
  const scale = Math.max(.35, Math.min(2.2, nextScale));
  const worldX = (pointX - view.x) / view.scale;
  const worldY = (pointY - view.y) / view.scale;
  view.x = pointX - worldX * scale;
  view.y = pointY - worldY * scale;
  view.scale = scale;
  applyView();
}

function fitView() {
  const nodes = visibleNodes().filter(node => !elements.nodes.querySelector(`[data-id="${CSS.escape(node.id)}"]`)?.classList.contains("filtered"));
  if (!nodes.length) return;
  const rect = elements["mindmap-svg"].getBoundingClientRect();
  const bounds = nodes.reduce((acc, node) => ({
    minX: Math.min(acc.minX, node.x - node.width / 2), maxX: Math.max(acc.maxX, node.x + node.width / 2),
    minY: Math.min(acc.minY, node.y - node.height / 2), maxY: Math.max(acc.maxY, node.y + node.height / 2)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const width = Math.max(1, bounds.maxX - bounds.minX + 100);
  const height = Math.max(1, bounds.maxY - bounds.minY + 100);
  view.scale = Math.max(.35, Math.min(1.15, rect.width / width, rect.height / height));
  view.x = rect.width / 2 - (bounds.minX + bounds.maxX) / 2 * view.scale;
  view.y = rect.height / 2 - (bounds.minY + bounds.maxY) / 2 * view.scale;
  applyView();
}

function moveKeyboard(direction) {
  const current = graph.find(node => node.id === keyboardId) || visibleNodes()[0];
  const candidates = visibleNodes().filter(node => node.id !== current.id).map(node => ({ node, dx: node.x - current.x, dy: node.y - current.y }));
  const valid = candidates.filter(({ dx, dy }) => direction === "left" ? dx < -10 : direction === "right" ? dx > 10 : direction === "up" ? dy < -10 : dy > 10);
  valid.sort((a, b) => (Math.hypot(a.dx, a.dy) + (direction === "left" || direction === "right" ? Math.abs(a.dy) : Math.abs(a.dx))) - (Math.hypot(b.dx, b.dy) + (direction === "left" || direction === "right" ? Math.abs(b.dy) : Math.abs(b.dx))));
  if (valid[0]) { keyboardId = valid[0].node.id; render(); requestAnimationFrame(() => elements.nodes.querySelector(`[data-id="${CSS.escape(keyboardId)}"]`)?.focus()); }
}

function showState(type, message = "") {
  if (!type) { elements["state-panel"].hidden = true; return; }
  elements["state-panel"].hidden = false;
  elements["state-panel"].replaceChildren();
  const card = el("div", "state-card");
  if (type === "loading") card.append(el("div", "spinner"), el("h2", "", "Building the prospect map"), el("p", "", "Checking sectors, evidence, and public contact routes…"));
  else {
    card.append(el("div", "state-icon", "i"), el("h2", "", type === "empty" ? "No qualified prospects yet" : "Results could not be loaded"), el("p", "", message));
    if (type === "error") { const retry = el("button", "quiet-button", "Try again"); retry.type = "button"; retry.addEventListener("click", submitQuery); card.append(retry); }
  }
  elements["state-panel"].append(card);
}

async function submitQuery(event) {
  event?.preventDefault();
  showState("loading");
  try {
    result = await loadResults({ term: elements["query-input"].value, filters: filters() }, { apiUrl: config.apiUrl || "" });
    graph = buildGraph(result);
    collapsed = new Set(result.groups.filter(group => !["group-competitors", "group-distributors"].includes(group.id)).map(group => group.id));
    selectedId = null; keyboardId = result.center.id;
    elements.inspector.hidden = true;
    render();
    if (!result.companies.length) showState("empty", "No retained prospects matched this demo query. Connect the production API or try RATIONAL, UNOX, or Kitchen Technology.");
    else showState(null);
    requestAnimationFrame(fitView);
  } catch (error) { showState("error", error.message); }
}

function exportCsv() {
  const exported = { ...result, companies: filterCompanies(result.companies, filters()) };
  const blob = new Blob(["\ufeff", resultToCsv(exported)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `igeho-prospects-${slug(result.query.term)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`${exported.companies.length} prospects exported`);
}

function showToast(message) { elements.toast.textContent = message; elements.toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { elements.toast.hidden = true; }, 2600); }

elements["query-form"].addEventListener("submit", submitQuery);
for (const id of ["map-search", "sector-filter", "country-filter", "tier-filter", "status-filter"]) elements[id].addEventListener("input", () => { render(); });
elements["reset-filters"].addEventListener("click", () => { elements["map-search"].value = ""; for (const id of ["sector-filter", "country-filter", "tier-filter", "status-filter"]) elements[id].value = "all"; render(); fitView(); });
elements["legend-button"].addEventListener("click", () => { const open = elements["legend-panel"].hidden; elements["legend-panel"].hidden = !open; elements["legend-button"].setAttribute("aria-expanded", String(open)); });
document.querySelector(".close-legend").addEventListener("click", () => { elements["legend-panel"].hidden = true; elements["legend-button"].setAttribute("aria-expanded", "false"); });
elements["close-inspector"].addEventListener("click", () => { elements.inspector.hidden = true; selectedId = null; render(); });
elements["zoom-in"].addEventListener("click", () => setZoom(view.scale * 1.18));
elements["zoom-out"].addEventListener("click", () => setZoom(view.scale / 1.18));
elements["fit-view"].addEventListener("click", fitView);
elements["expand-all"].addEventListener("click", () => { collapsed.clear(); render(); fitView(); });
elements["collapse-all"].addEventListener("click", () => { collapsed = new Set(graph.filter(node => node.expandable && node.kind !== "center").map(node => node.id)); render(); fitView(); });
elements["export-button"].addEventListener("click", exportCsv);

elements["mindmap-svg"].addEventListener("wheel", event => { event.preventDefault(); setZoom(view.scale * (event.deltaY > 0 ? .9 : 1.1), event.clientX, event.clientY); }, { passive: false });
elements["mindmap-svg"].addEventListener("pointerdown", event => { if (event.target.closest?.(".map-node")) return; elements["mindmap-svg"].setPointerCapture(event.pointerId); drag = { id: event.pointerId, x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }; elements["mindmap-svg"].classList.add("dragging"); });
elements["mindmap-svg"].addEventListener("pointermove", event => { if (!drag || drag.id !== event.pointerId) return; view.x = drag.viewX + event.clientX - drag.x; view.y = drag.viewY + event.clientY - drag.y; applyView(); });
elements["mindmap-svg"].addEventListener("pointerup", () => { drag = null; elements["mindmap-svg"].classList.remove("dragging"); });
elements["mindmap-svg"].addEventListener("keydown", event => {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
  if (map[event.key]) { event.preventDefault(); moveKeyboard(map[event.key]); }
  if (["Enter", " "].includes(event.key)) { event.preventDefault(); const node = graph.find(item => item.id === keyboardId); if (node) activateNode(node); }
  if (["+", "="].includes(event.key)) setZoom(view.scale * 1.18);
  if (event.key === "-") setZoom(view.scale / 1.18);
  if (event.key === "0") fitView();
});
window.addEventListener("resize", () => requestAnimationFrame(fitView));

render();
requestAnimationFrame(fitView);
