import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import axe from "axe-core";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
let browser;
let context;
let page;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
beforeEach(async () => {
  await context?.close();
  context = await browser.newContext();
  page = await context.newPage();
  await page.goto(baseUrl);
  await page.locator(".map-node.center").waitFor();
});

async function axeViolations() {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const results = await globalThis.axe.run(document, { resultTypes: ["violations"] });
    return results.violations;
  });
}

function summarize(violations) {
  return violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.map(node => node.target)
  }));
}

test("has no detectable axe violations in the primary workspace", async () => {
  assert.deepEqual(summarize(await axeViolations()), []);
});

test("has no detectable axe violations with company details open", async () => {
  await page.locator(".map-node[data-id='company-unox']").click();
  await page.locator("#inspector").waitFor();
  assert.deepEqual(summarize(await axeViolations()), []);
});
