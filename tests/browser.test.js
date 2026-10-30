import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
let browser;
let context;
let page;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
beforeEach(async () => {
  await context?.close();
  context = await browser.newContext({ acceptDownloads: true });
  page = await context.newPage();
  await page.goto(baseUrl);
  await page.locator(".map-node.center").waitFor();
});

test("submits a search and renders the new center", async () => {
  await page.locator("#query-input").fill("UNOX");
  await page.locator("#query-form button[type=submit]").click();
  await page.locator("#state-panel").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".map-node.center .node-title").textContent(), "UNOX");
});

test("applies and resets prospect filters", async () => {
  await page.locator("#country-filter").selectOption("DE");
  assert.equal(await page.locator("#result-count").textContent(), "1 prospect");
  await page.locator("#map-search").fill("Eloma");
  await page.locator(".map-node[data-id='company-eloma']").waitFor();
  assert.ok(await page.locator(".map-node[data-id='company-unox']").evaluate(node => node.classList.contains("filtered")));
  await page.locator("#reset-filters").click();
  assert.equal(await page.locator("#result-count").textContent(), "4 prospects");
});

test("selects nodes and expands or collapses branches", async () => {
  const group = page.locator(".map-node[data-id='group-competitors']");
  assert.equal(await group.getAttribute("aria-expanded"), "true");
  await group.click();
  assert.equal(await group.getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator(".map-node[data-id='company-unox']").count(), 0);
  await group.click();
  assert.equal(await group.getAttribute("aria-expanded"), "true");
  await page.locator("#collapse-all").click();
  assert.equal(await page.locator(".map-node[data-id='company-unox']").count(), 0);
  await page.locator("#expand-all").click();
  await page.locator(".map-node[data-id='company-unox']").waitFor();
});

test("supports directional keyboard navigation and zoom or fit controls", async () => {
  const center = page.locator(".map-node.center");
  await center.focus();
  await center.press("ArrowRight");
  await page.waitForFunction(() => document.activeElement?.classList.contains("map-node") && document.activeElement?.dataset.id !== "center-rational");
  assert.notEqual(await page.locator(".map-node:focus").getAttribute("data-id"), "center-rational");
  const initialZoom = await page.locator("#zoom-level").textContent();
  await page.locator("#zoom-in").click();
  assert.notEqual(await page.locator("#zoom-level").textContent(), initialZoom);
  await page.locator("#zoom-out").click();
  await page.locator("#fit-view").click();
  assert.match(await page.locator("#zoom-level").textContent(), /^\d+%$/);
});

test("moves focus into the inspector and restores it on close or Escape", async () => {
  const company = page.locator(".map-node[data-id='company-unox']");
  await company.click();
  await page.locator("#inspector").waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "close-inspector");
  assert.equal(await page.locator(":focus").getAttribute("id"), "close-inspector");
  assert.equal(await page.locator("#inspector-title").textContent(), "UNOX");
  await page.locator("#close-inspector").click();
  await page.waitForFunction(() => document.activeElement?.dataset.id === "company-unox");
  assert.equal(await page.locator(":focus").getAttribute("data-id"), "company-unox");

  await company.click();
  await page.keyboard.press("Escape");
  assert.ok(await page.locator("#inspector").isHidden());
  await page.waitForFunction(() => document.activeElement?.dataset.id === "company-unox");
  assert.equal(await page.locator(":focus").getAttribute("data-id"), "company-unox");

  await page.locator("#legend-button").click();
  await page.keyboard.press("Escape");
  assert.ok(await page.locator("#legend-panel").isHidden());
  assert.equal(await page.locator(":focus").getAttribute("id"), "legend-button");
});

test("exports the active result set as CSV", async () => {
  await page.locator("#country-filter").selectOption("DE");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-button").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "igeho-prospects-rational.csv");
  const csv = await readFile(await download.path(), "utf8");
  assert.match(csv, /"Eloma"/);
  assert.doesNotMatch(csv, /"UNOX"/);
});
