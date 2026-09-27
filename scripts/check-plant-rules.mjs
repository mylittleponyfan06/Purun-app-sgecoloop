import assert from "node:assert/strict";
import { assessPlant } from "../lib/plant-rules.ts";
import { currentReading, plantAssessment } from "../lib/mock-data.ts";

const healthy = Object.freeze({ ...currentReading, timestamp: "2026-09-27T01:00:00.000Z" });
const assess = (changes = {}) => assessPlant({ ...healthy, ...changes });
assert.equal(assess().score, 100);
assert.equal(assess().status, "thriving");
assert.deepEqual(assess().actions, []);
assert.equal(assess().updatedAt, healthy.timestamp);
assert.deepEqual(assessPlant(healthy), assessPlant(healthy), "Deterministic, without mutating input");
assert.equal(plantAssessment.score, 82, "Existing UI assessment stays unchanged");

for (const [field, cases, title] of [
  ["waterLevelPct", [[0, 55, "danger"], [29.9, 55, "danger"], [30, 77, "thriving"], [49.9, 77, "thriving"], [50, 100, "thriving"], [100, 100, "thriving"]], "Refill reservoir"],
  ["waterTempC", [[17.9, 85, "watch"], [18, 92, "thriving"], [21.9, 92, "thriving"], [22, 100, "thriving"], [32, 100, "thriving"], [32.1, 92, "thriving"], [35, 92, "thriving"], [35.1, 85, "watch"]], "Check water temperature"],
  ["lightLux", [[0, 75, "watch"], [5999, 75, "watch"], [6000, 87, "thriving"], [11999.9, 87, "thriving"], [12000, 100, "thriving"]], "Move to brighter daylight"],
  ["pm25UgM3", [[0, 100, "thriving"], [34.9, 100, "thriving"], [35, 95, "thriving"], [55, 95, "thriving"], [55.1, 90, "watch"]], "Reduce haze exposure"],
]) {
  for (const [value, score, status] of cases) {
    const result = assess({ [field]: value });
    assert.equal(result.score, score, `${field}=${value}`);
    assert.equal(result.status, status, `${field}=${value}`);
    if (score < 100) assert.equal(result.actions[0].title, title);
    assert.equal(result.reasons.length, 4);
    assert.ok(result.headline && result.summary);
  }
}

const mixed = assess({ waterLevelPct: 40, lightLux: 1000, waterTempC: 36, pm25UgM3: 60 });
assert.equal(mixed.status, "danger");
assert.deepEqual(mixed.actions.map(({ title }) => title), ["Move to brighter daylight", "Check water temperature", "Reduce haze exposure", "Refill reservoir"]);
assert.deepEqual(mixed.actions.map(({ priority }) => priority), ["now", "now", "now", "soon"]);
assert.equal(assess({ waterTempC: 36, pm25UgM3: 60 }).status, "danger", "Two dangers override a score of 75");
assert.equal(assess({ waterLevelPct: 40, lightLux: 8000 }).status, "watch", "Watch scores without dangers");
assert.equal(assess({ lightLux: 8000, waterTempC: 34, pm25UgM3: 40 }).score, 74);
assert.equal(assess({ lightLux: 8000, waterTempC: 34, pm25UgM3: 40 }).status, "watch");
assert.equal(assess({ waterLevelPct: 40, lightLux: 1000, waterTempC: 34, pm25UgM3: 40 }).status, "danger", "Score below 45 overrides a single non-water danger");
const worst = assess({ waterLevelPct: 0, lightLux: 0, waterTempC: 40, pm25UgM3: 100 });
assert.equal(worst.score, 5, "Maximum deductions total 95");
assert.equal(worst.status, "danger");
assert.equal(worst.actions[0].title, "Refill reservoir");
assert.deepEqual(assess({ airTempC: 5, humidityPct: 0 }), assess(), "Unspecified sensors do not affect scoring");
for (const changes of [{ waterLevelPct: -1 }, { waterLevelPct: 101 }, { lightLux: -1 }, { pm25UgM3: -1 }, { waterTempC: NaN }, { waterTempC: Infinity }, { timestamp: "invalid" }]) {
  assert.throws(() => assess(changes), RangeError);
}
console.log("Plant rules checks passed: healthy baseline, thresholds, decimals, danger overrides, action priority, determinism and invalid inputs.");
