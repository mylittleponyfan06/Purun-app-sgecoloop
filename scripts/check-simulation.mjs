import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Resolve the app's extensionless relative TS imports in Node's standalone runner.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });

const storage = new Map();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
} });
const { usePurunStore: store, scenarios } = await import("../store/usePurunStore.ts");
await store.persist.rehydrate();
const initial = store.getState();
assert.equal(initial.currentAssessment.score, 82);
assert.equal(initial.isSimulationMode, false);
assert.equal(initial.autoReadInterval, 60);

for (const [name, score, status] of [["Thriving wetland", 100, "thriving"], ["Low reservoir", 55, "danger"], ["Low light", 75, "watch"], ["Haze event", 90, "watch"], ["Multiple issues", 5, "danger"]]) {
  store.getState().setSimulationModalOpen(true);
  const before = store.getState().currentReading;
  store.getState().loadScenario(name);
  assert.equal(store.getState().currentReading, before, "Loading a scenario only changes the draft");
  store.getState().applySimulatedReading(store.getState().draftReading);
  const state = store.getState();
  assert.equal(state.currentAssessment.score, score, name);
  assert.equal(state.currentAssessment.status, status, name);
  assert.equal(state.currentAssessment.updatedAt, state.currentReading.timestamp);
  assert.equal(state.currentReading.source, "simulation");
  assert.equal(state.currentReading.airTempC, initial.currentReading.airTempC);
  assert.notEqual(state.currentReading.id, before.id);
  assert.equal(state.isSimulationModalOpen, false);
  assert.equal(state.isSimulationMode, true);
  assert.equal(state.history.at(-1).score, score);
  assert.deepEqual(state.history.at(-1).reading, state.currentReading);
}

const applied = store.getState().currentReading;
// CHECK NOW reuses this action with current values, never an unapplied draft.
store.getState().loadScenario("Thriving wetland");
const beforeCheck = store.getState();
const checkStart = Date.now();
store.getState().applySimulatedReading(beforeCheck.currentReading);
const checked = store.getState();
assert.equal(checked.currentAssessment.score, 5);
assert.equal(checked.history.length, beforeCheck.history.length + 1);
assert.notEqual(checked.currentReading.id, beforeCheck.currentReading.id);
assert.ok(Date.parse(checked.currentReading.timestamp) >= checkStart && Date.parse(checked.currentReading.timestamp) <= Date.now());
for (const key of ["waterLevelPct", "lightLux", "waterTempC", "pm25UgM3", "humidityPct", "airTempC"]) assert.equal(checked.currentReading[key], beforeCheck.currentReading[key]);
assert.equal(checked.currentAssessment.updatedAt, checked.currentReading.timestamp);
assert.deepEqual(JSON.parse(storage.get("purun-demo-state")).state.history.at(-1).reading, checked.currentReading);
const checkedReading = checked.currentReading;
store.getState().setSimulationModalOpen(true);
store.getState().loadScenario("Thriving wetland");
store.getState().setSimulationModalOpen(false);
assert.equal(store.getState().currentReading, checkedReading, "Cancel does not apply the draft");
store.getState().setSimulationModalOpen(true);
assert.equal(store.getState().draftReading.waterLevelPct, applied.waterLevelPct, "Reopening discards cancelled changes");

const saved = JSON.parse(storage.get("purun-demo-state"));
assert.equal(saved.state.currentAssessment.score, 5);
assert.equal(saved.state.isSimulationMode, true);
assert.equal(saved.state.isSimulationModalOpen, undefined);
assert.equal(saved.state.draftReading, undefined);
assert.equal(saved.state.hasHydrated, undefined);
assert.equal(saved.state.autoReadInterval, 60);
const merge = store.persist.getOptions().merge;
const restored = merge(saved.state, initial);
assert.deepEqual(restored.currentReading, checkedReading);
assert.equal(restored.currentAssessment.score, 5);
assert.equal(restored.isSimulationModalOpen, false);
assert.deepEqual(merge({ ...saved.state, currentAssessment: { score: 100 } }, initial).currentAssessment, restored.currentAssessment, "Recompute persisted assessment");
assert.equal(merge({ ...saved.state, currentReading: { ...applied, humidityPct: 101 } }, initial), initial);
assert.equal(merge({ ...saved.state, currentReading: null }, initial), initial);
assert.equal(merge({ ...saved.state, history: [] }, initial).history.length, 1, "Always retain the current trend point");

for (let index = 0; index < 125; index++) store.getState().applySimulatedReading(scenarios["Thriving wetland"]);
assert.equal(store.getState().history.length, 120, "History is bounded");
const beforeInvalid = store.getState();
assert.throws(() => store.getState().applySimulatedReading({ ...scenarios["Thriving wetland"], waterLevelPct: 101 }), RangeError);
assert.equal(store.getState(), beforeInvalid, "Invalid readings do not mutate state");
Object.defineProperty(globalThis, "localStorage", { get: () => { throw new Error("Blocked storage"); } });
store.getState().applySimulatedReading(scenarios["Low reservoir"]);
await new Promise((resolve) => queueMicrotask(resolve));
assert.equal(store.getState().storageWarning, true);
assert.equal(store.getState().currentAssessment.score, 55, "Blocked storage still allows an in-memory demo");
console.log("Simulation checks passed: scenarios, drafts, assessment updates, persistence validation, history bounds and blocked storage.");
