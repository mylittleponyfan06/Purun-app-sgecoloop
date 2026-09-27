import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { POST } = await import("../app/api/ai-summary/route.ts");
const { assessPlant } = await import("../lib/plant-rules.ts");
const { generateCareSummary } = await import("../lib/care-summary.ts");
const { getCarePayload } = await import("../lib/get-care-payload.ts");
const { validateCarePayload } = await import("../lib/care-payload-schema.ts");
const { aiModels, getAIConfiguration } = await import("../lib/ai-config.ts");
const reading = { id: "ai-test", timestamp: "2026-09-27T12:00:00.000Z", source: "simulation", waterLevelPct: 20, waterTempC: 26, lightLux: 18000, pm25UgM3: 12, airTempC: 29, humidityPct: 72 };
const assessment = assessPlant(reading);
const fallback = generateCareSummary(assessment);
const enhanced = { ...fallback, source: "ai-enhanced", headline: "A little care for Purun today", summary: "Purun needs attention today. Start by refilling the reservoir." };
const realFetch = globalThis.fetch;
const realNow = Date.now;
const realTimeout = AbortSignal.timeout;
const realSetTimeout = globalThis.setTimeout;
const previousEnabled = process.env.AI_ENABLED;
const previousKey = process.env.AI_API_KEY;
const previousBaseURL = process.env.AI_BASE_URL;
let now = Date.now();
let calls = 0;
let mode = "ok";
let output = enhanced;
let expectedModel = "gpt-5.6-luna";
const request = (body = { reading }) => new Request("http://localhost/api/ai-summary", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" }, body: JSON.stringify(body) });
const read = async () => { now += 6000; return (await POST(request())).json(); };
Date.now = () => now;

try {
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://gateway.example/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(options.cache, "no-store");
    const body = JSON.parse(options.body);
    assert.equal(body.model, expectedModel);
    assert.equal(body.reasoning.effort, "low");
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(JSON.parse(body.input), { reading, assessment, fallback }, "Only deterministic input goes to the provider");
    assert.ok(!body.input.includes("test-key"));
    if (mode === "network") throw new Error("Offline");
    if (mode === "http") return new Response("Error", { status: 503 });
    if (mode === "json") return new Response("not JSON");
    if (mode === "timeout") {
      return new Promise((_, reject) => {
        if (options.signal.aborted) reject(options.signal.reason);
        else options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
    }
    return Response.json({ status: mode === "incomplete" ? "incomplete" : "completed", output: [
      { type: "reasoning", summary: [] },
      { type: "message", content: [mode === "refusal" ? { type: "refusal", refusal: "No" } : { type: "output_text", text: mode === "bad-text" ? "not JSON" : JSON.stringify(output) }] },
    ] });
  };
  process.env.AI_ENABLED = "false";
  process.env.AI_BASE_URL = "https://gateway.example/v1";
  process.env.AI_API_KEY = "test-key";
  assert.ok(aiModels.some((model) => model.id === "gpt-6-sol" && model.selectable));
  assert.ok(!JSON.stringify(getAIConfiguration()).includes("test-key"), "Configuration never exposes the key");
  assert.ok(!JSON.stringify(getAIConfiguration()).includes("instructions_template"), "Catalog instructions stay out of client configuration");
  assert.deepEqual(await read(), fallback);
  process.env.AI_ENABLED = "true";
  delete process.env.AI_API_KEY;
  assert.deepEqual(await read(), fallback);
  assert.equal(calls, 0, "Disabled or missing key never contacts the provider");
  process.env.AI_API_KEY = "test-key";
  delete process.env.AI_BASE_URL;
  assert.equal((await POST(request())).headers.get("X-Care-AI-Status"), "missing-url");
  process.env.AI_BASE_URL = "https://gateway.example/v1";
  assert.equal((await POST(request({ reading, model: "not-in-catalog" }))).headers.get("X-Care-AI-Status"), "unsupported-model");
  assert.equal((await POST(request({ reading, model: "gpt-4o-realtime-preview" }))).headers.get("X-Care-AI-Status"), "unsupported-model");
  assert.equal((await POST(request({ reading, assessment: { score: 100 } }))).status, 400, "Reject forged assessment fields");
  assert.equal((await POST(request({ reading: { ...reading, waterLevelPct: -1 } }))).status, 400);
  assert.equal((await POST(new Request("http://localhost/api/ai-summary", { method: "POST", headers: { Origin: "https://other.example" } }))).status, 403);
  assert.deepEqual(await read(), enhanced);
  const beforeCooldown = calls;
  assert.deepEqual(await (await POST(request())).json(), fallback);
  assert.equal(calls, beforeCooldown, "Cooldown falls back without spending another request");
  now += 6000;
  expectedModel = "gpt-6-sol";
  assert.equal((await POST(request({ reading, model: expectedModel }))).headers.get("X-Care-AI-Status"), "enhanced", "Selected model reaches the provider");
  expectedModel = "gpt-5.6-luna";
  for (mode of ["network", "http", "json", "incomplete", "refusal", "bad-text"]) assert.deepEqual(await read(), fallback, mode);
  mode = "timeout";
  AbortSignal.timeout = () => AbortSignal.abort(new DOMException("Timed out", "TimeoutError"));
  assert.deepEqual(await read(), fallback, "Provider timeout");
  AbortSignal.timeout = realTimeout;
  mode = "ok";
  for (output of [
    { ...enhanced, score: 100 }, { ...enhanced, status: "thriving" }, { ...enhanced, source: "unknown" },
    { ...enhanced, reasons: [] }, { ...enhanced, nextCheckSuggestion: "Wait a week." },
    { ...enhanced, actions: [] }, { ...enhanced, headline: " " },
    { ...enhanced, summary: "Water level is 80%." }, { ...enhanced, summary: "Buy a nutrient supplement." },
    { ...enhanced, summary: "Visit https://shop.example" }, { ...enhanced, summary: "This cures disease." },
    { ...enhanced, actions: [{ ...enhanced.actions[0], priority: "monitor" }] },
    { ...enhanced, actions: [{ ...enhanced.actions[0], detail: "Refill to 90%." }] },
    { ...enhanced, actions: [{ ...enhanced.actions[0], detail: enhanced.actions[0].detail.replace("%", "°C") }] },
  ]) {
    assert.throws(() => validateCarePayload(output, fallback));
    assert.deepEqual(await read(), fallback, "Invalid model output falls back");
  }

  let clientCalls = 0;
  globalThis.fetch = async () => { clientCalls++; return Response.json(enhanced); };
  assert.deepEqual(await getCarePayload(reading, assessment, false), fallback);
  assert.equal(clientCalls, 0, "Disabled client performs no request");
  assert.deepEqual(await getCarePayload(reading, assessment, true), enhanced);
  let reported;
  globalThis.fetch = async () => Response.json(fallback, { headers: { "X-Care-AI-Status": "auth-error" } });
  assert.deepEqual(await getCarePayload(reading, assessment, true, undefined, { onStatus: (value) => { reported = value; } }), fallback);
  assert.equal(reported, "auth-error", "Safe fallback reason reaches the UI");
  globalThis.fetch = async () => Response.json({ ...enhanced, status: "thriving" });
  assert.deepEqual(await getCarePayload(reading, assessment, true), fallback, "Validate route responses too");
  globalThis.fetch = async () => { throw new Error("Offline"); };
  assert.deepEqual(await getCarePayload(reading, assessment, true), fallback);
  globalThis.fetch = async (_url, options) => new Promise((_, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true }));
  globalThis.setTimeout = (callback, delay, ...args) => realSetTimeout(callback, delay === 25000 ? 5 : delay, ...args);
  assert.deepEqual(await getCarePayload(reading, assessment, true), fallback, "Client timeout");
  globalThis.setTimeout = realSetTimeout;

  const storage = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } });
  const { usePurunStore: store, scenarios } = await import("../store/usePurunStore.ts");
  store.getState().setAIModel("gpt-5.6-luna");
  store.getState().applySimulatedReading(scenarios["Low reservoir"]);
  globalThis.fetch = async () => Response.json(enhanced);
  const before = store.getState();
  await store.getState().enhanceCareSummary(true);
  assert.deepEqual(store.getState().carePayload, enhanced);
  assert.equal(store.getState().aiCheck.status, "enhanced");
  assert.equal(store.getState().aiCheck.model, "gpt-5.6-luna");
  assert.equal(store.getState().currentAssessment, before.currentAssessment, "AI never changes health");
  assert.equal(store.getState().currentReading, before.currentReading);
  assert.equal(store.getState().history, before.history);
  assert.equal(JSON.parse(storage.get("purun-demo-state")).state.carePayload, undefined, "AI text is not persisted");
  assert.equal(JSON.parse(storage.get("purun-demo-state")).state.selectedAIModel, "gpt-5.6-luna", "Model choice persists");
  let resolveOld;
  let requestSignal;
  globalThis.fetch = async (_url, options) => { requestSignal = options.signal; return new Promise((resolve) => { resolveOld = resolve; }); };
  const pending = store.getState().enhanceCareSummary(true);
  store.getState().applySimulatedReading(scenarios["Thriving wetland"]);
  assert.equal(requestSignal.aborted, true, "New readings cancel old requests");
  resolveOld(Response.json(enhanced));
  await pending;
  assert.equal(store.getState().carePayload, null, "Stale explanations cannot overwrite newer readings");
  assert.equal(store.getState().currentAssessment.status, "thriving");
  store.getState().applySimulatedReading(scenarios["Low reservoir"]);
  const pendingModel = store.getState().enhanceCareSummary(true);
  store.getState().setAIModel("gpt-6-sol");
  assert.equal(requestSignal.aborted, true, "Changing model cancels the pending request");
  resolveOld(Response.json(enhanced));
  await pendingModel;
  assert.equal(store.getState().carePayload, null);
  assert.equal(store.getState().aiCheck, null, "Old model cannot claim success for the new selection");
  console.log("AI checks passed: strict JSON, deterministic invariants, disabled/missing key, refusal/errors/timeouts, content guards, cooldown, local fallback and stale-response protection. No external calls made.");
} finally {
  globalThis.fetch = realFetch;
  Date.now = realNow;
  AbortSignal.timeout = realTimeout;
  globalThis.setTimeout = realSetTimeout;
  if (previousEnabled === undefined) delete process.env.AI_ENABLED; else process.env.AI_ENABLED = previousEnabled;
  if (previousKey === undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY = previousKey;
  if (previousBaseURL === undefined) delete process.env.AI_BASE_URL; else process.env.AI_BASE_URL = previousBaseURL;
}
