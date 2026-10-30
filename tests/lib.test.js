import test from "node:test";
import assert from "node:assert/strict";
import { demoResult } from "../src/data.js";
import { buildGraph, filterCompanies, loadResults, normalizeResult, resultToCsv, scoreTier } from "../src/lib.js";

test("normalizes a minimal API response", () => {
  const result = normalizeResult({ center: { name: "Test" }, companies: [{ name: "Acme", score: 78 }] });
  assert.equal(result.companies[0].tier, "A");
  assert.equal(result.sectors.length, 7);
  assert.deepEqual(result.companies[0].contacts, []);
});

test("rejects malformed API results", () => {
  assert.throws(() => normalizeResult({ companies: [] }), /missing the center/i);
});

test("hardens partial company fields from the API", () => {
  const result = normalizeResult({ center: { name: "Test" }, companies: [{ name: "Acme", score: "51", tier: "gold", contacts: null, igehoStatus: "probably" }] });
  assert.equal(result.companies[0].score, 51);
  assert.equal(result.companies[0].tier, "B");
  assert.equal(result.companies[0].igehoStatus, "unverified");
  assert.deepEqual(result.companies[0].contacts, []);
});

test("posts a structured request to a configured API", async () => {
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, ...init, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ center: { name: "UNOX" }, companies: [] }) };
  };
  const result = await loadResults({ term: " UNOX ", filters: { country: "CH" } }, { apiUrl: "https://example.test/results", fetchImpl });
  assert.equal(request.method, "POST");
  assert.deepEqual(request.body, { query: "UNOX", filters: { country: "CH" } });
  assert.equal(result.center.name, "UNOX");
});

test("turns transport failures into a configuration-safe error", async () => {
  await assert.rejects(
    loadResults({ term: "UNOX" }, { apiUrl: "https://example.test", fetchImpl: async () => { throw new Error("secret detail"); } }),
    /could not be reached/i
  );
});

test("filters by text, country, tier, and status", () => {
  const matches = filterCompanies(demoResult.companies, { search: "sales", country: "DE", tier: "A", status: "unverified" });
  assert.deepEqual(matches.map(company => company.name), ["Eloma"]);
});

test("exports contacts and evidence to quoted CSV", () => {
  const csv = resultToCsv(demoResult);
  assert.match(csv, /"UNOX"/);
  assert.match(csv, /"not found"/);
  assert.match(csv, /"2026-10-30"/);
  assert.equal(csv.split("\r\n").length, 5);
});

test("builds a seven-sector graph with company leaves", () => {
  const graph = buildGraph(demoResult);
  assert.equal(graph.filter(node => node.kind === "sector").length, 7);
  assert.equal(graph.find(node => node.name === "UNOX").parentId, "group-competitors");
});

test("uses the editable igeho tier thresholds", () => {
  assert.deepEqual([scoreTier(75), scoreTier(50), scoreTier(49)], ["A", "B", "C"]);
});
