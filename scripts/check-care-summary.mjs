import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });

globalThis.fetch = () => { throw new Error("Care summaries must work offline"); };
const { generateCareSummary } = await import("../lib/care-summary.ts");
const { assessPlant } = await import("../lib/plant-rules.ts");
const healthy = {
  id: "summary-example", timestamp: "2026-09-27T12:00:00.000Z", source: "simulation",
  waterLevelPct: 72, waterTempC: 26, lightLux: 18000, pm25UgM3: 12, airTempC: 29, humidityPct: 72,
};

// Runnable examples for all three states, also printed for reviewing the wording.
for (const [status, changes, title] of [
  ["thriving", {}, undefined],
  ["watch", { lightLux: 3000, waterTempC: 34 }, "Move to brighter daylight"],
  ["danger", { waterLevelPct: 20 }, "Refill reservoir"],
]) {
  const assessment = assessPlant({ ...healthy, ...changes });
  const before = structuredClone(assessment);
  Object.freeze(assessment.actions);
  Object.freeze(assessment.reasons);
  Object.freeze(assessment);
  const result = generateCareSummary(assessment);
  assert.equal(result.status, status);
  assert.equal(result.source, "local-rules");
  assert.equal(result.actions[0]?.title, title);
  assert.deepEqual(result.reasons, assessment.reasons);
  assert.deepEqual(result, generateCareSummary({ ...assessment, updatedAt: "2000-01-01T00:00:00.000Z" }), "No dependence on current time");
  assert.deepEqual(assessment, before, "Do not mutate input");
  assert.ok(result.summary.length < 180);
  assert.match(result.summary, /Purun/);
  assert.doesNotMatch(result.summary, /\d/, "No invented sensor values or refill predictions");
  for (const action of result.actions) {
    assert.ok(assessment.actions.some((original) => original.title === action.title && original.description === action.detail && original.priority === action.priority));
  }
  console.log(`${status.toUpperCase()} EXAMPLE\n${JSON.stringify(result, null, 2)}\n`);
}

const multiple = assessPlant({ ...healthy, waterLevelPct: 40, lightLux: 3000, waterTempC: 37, pm25UgM3: 80 });
multiple.actions.reverse();
const inputOrder = multiple.actions.map((action) => action.id);
const result = generateCareSummary(multiple);
assert.equal(result.actions.length, 3, "At most three actions");
assert.ok(result.actions.every((action) => action.priority === "now"), "Urgent actions precede soon actions");
assert.deepEqual(multiple.actions.map((action) => action.id), inputOrder, "Sorting does not mutate input");
assert.deepEqual(result.reasons, multiple.reasons, "Reasons remain intact even when actions are shortened");
const emptyDanger = generateCareSummary({ ...multiple, actions: [], reasons: [] });
assert.equal(emptyDanger.status, "danger", "Never change the assessment status");
assert.deepEqual(emptyDanger.actions, [], "Never invent actions");
assert.match(emptyDanger.summary, /Review the assessment reasons/);
const minorIssue = generateCareSummary(assessPlant({ ...healthy, pm25UgM3: 40 }));
assert.equal(minorIssue.status, "thriving");
assert.equal(minorIssue.actions[0].title, "Reduce haze exposure", "Thriving can still have a care action");
assert.match(minorIssue.nextCheckSuggestion, /after your next care step/);
console.log("Care-summary checks passed: offline examples, determinism, provenance, priorities, brevity and no input mutation.");
