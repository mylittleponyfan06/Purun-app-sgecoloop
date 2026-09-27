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

// Auto-read uses the same reading path and a single deadline, including delayed ticks.
store.setState({ hasHydrated: true, isSimulationModalOpen: false });
assert.equal(initial.autoReadEnabled, false);
assert.equal(merge(saved.state, initial).autoReadEnabled, false, "Legacy saves stay manual");
for (const minutes of [0.25, 0.5, 1, 60]) {
  store.getState().setAutoReadInterval(minutes);
  const start = Date.now();
  store.getState().setAutoReadEnabled(true);
  const state = store.getState();
  assert.ok(state.nextReadAt >= start + minutes * 60000 && state.nextReadAt <= Date.now() + minutes * 60000);
  const settings = JSON.parse(storage.get("purun-demo-state")).state;
  assert.equal(settings.nextReadAt, undefined, "Deadlines are not persisted");
  assert.equal(merge(settings, initial).autoReadInterval, minutes);
  assert.equal(merge(settings, initial).autoReadEnabled, true);
}
store.getState().setAutoReadInterval(0.25);
const beforeAuto = store.getState();
store.getState().runAutoRead(beforeAuto.nextReadAt - 1);
assert.equal(store.getState().currentReading, beforeAuto.currentReading, "No early read");
// Make the deadline overdue without waiting or inventing future observation timestamps.
store.setState({ nextReadAt: Date.now() - 90000 });
store.getState().setSimulationModalOpen(true);
store.getState().runAutoRead(Date.now());
assert.equal(store.getState().currentReading, beforeAuto.currentReading, "Do not close an open modal");
store.getState().setSimulationModalOpen(false);
store.setState({ hasHydrated: false });
store.getState().runAutoRead(Date.now());
assert.equal(store.getState().currentReading, beforeAuto.currentReading, "Wait for hydration");
store.setState({ hasHydrated: true });
store.getState().runAutoRead(Date.now());
const automatic = store.getState();
assert.notEqual(automatic.currentReading.id, beforeAuto.currentReading.id);
assert.equal(automatic.history.length, beforeAuto.history.length + 1, "Only one reading after a delay");
assert.equal(automatic.currentAssessment.status, "danger");
assert.equal(automatic.currentReading.waterLevelPct, beforeAuto.currentReading.waterLevelPct, "Ignore healthy slider draft");
assert.equal(automatic.nextReadAt, Date.parse(automatic.currentReading.timestamp) + 15000);
assert.equal(JSON.parse(storage.get("purun-demo-state")).state.history.at(-1).reading.id, automatic.currentReading.id);
store.getState().runAutoRead(Date.now());
assert.equal(store.getState().currentReading, automatic.currentReading, "Duplicate ticks do not duplicate readings");
store.getState().setAutoReadEnabled(false);
store.getState().runAutoRead(Date.now() + 3600000);
assert.equal(store.getState().currentReading, automatic.currentReading, "Off disables reads");
store.getState().setAutoReadInterval(0);
store.getState().setAutoReadEnabled(true);
assert.equal(store.getState().autoReadEnabled, false, "Manual cannot auto-read");
assert.equal(store.getState().nextReadAt, null);
assert.throws(() => store.getState().setAutoReadInterval(2), RangeError);
assert.equal(merge({ ...saved.state, autoReadInterval: 2, autoReadEnabled: true }, initial).autoReadEnabled, false);
assert.equal(merge({ ...saved.state, autoReadInterval: 0, autoReadEnabled: true }, initial).autoReadEnabled, false);

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
