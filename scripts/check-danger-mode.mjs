import assert from "node:assert/strict";
import { getDangerAdvice, prioritizeCareActions } from "../lib/care-actions.ts";
import { assessPlant } from "../lib/plant-rules.ts";
import { currentReading } from "../lib/mock-data.ts";

const assess = (changes) => assessPlant({ ...currentReading, ...changes });
const lowWater = assess({ waterLevelPct: 20 });
assert.equal(getDangerAdvice(lowWater).headline, "Water low — refill today");
assert.equal(getDangerAdvice(lowWater).href, "/care#care-refill-reservoir");
assert.match(getDangerAdvice(lowWater).explanation, /reservoir is very low/);
const lowLight = assess({ lightLux: 3000, waterTempC: 36 });
assert.equal(getDangerAdvice(lowLight).actionLabel, "Move to brighter daylight");
const haze = assess({ pm25UgM3: 80, waterTempC: 36 });
assert.match(getDangerAdvice(haze).explanation, /Particle levels are high/);
assert.equal(getDangerAdvice(haze).actionLabel, "Check water temperature", "Highest-impact urgent action stays first");
const multiple = assess({ waterLevelPct: 20, lightLux: 3000, pm25UgM3: 80 });
assert.equal(getDangerAdvice(multiple).actionId, "refill-reservoir");

for (const status of ["thriving", "watch"]) {
  assert.equal(getDangerAdvice({ ...multiple, status, score: 0 }), null, "Status alone gates danger UI");
}
assert.equal(getDangerAdvice(assess({ lightLux: 3000 })), null, "A single low-light condition remains watch under the existing rules");
assert.equal(getDangerAdvice(assess({ pm25UgM3: 80 })), null, "A single haze condition remains watch under the existing rules");
assert.equal(getDangerAdvice(assess({})), null, "Healthy recovery removes the alert");

// The presentation supports any danger assessment, including a haze-first assessment.
const hazeOnly = assess({ pm25UgM3: 80 });
assert.equal(getDangerAdvice({ ...hazeOnly, status: "danger" }).headline, "Haze nearby — reduce exposure");
const actions = Object.freeze([
  { ...multiple.actions[0], priority: "monitor" },
  { ...multiple.actions[1], priority: "now" },
  { ...multiple.actions[2], priority: "soon" },
]);
assert.deepEqual(prioritizeCareActions(actions).map(({ priority }) => priority), ["now", "soon", "monitor"]);
assert.equal(actions[0].priority, "monitor", "Sorting never mutates the assessment");
assert.equal(getDangerAdvice({ ...multiple, actions }).actionId, multiple.actions[1].id);
assert.equal(getDangerAdvice({ ...multiple, actions: [], reasons: [] }).href, "/care#care-actions");
assert.equal(getDangerAdvice({ ...multiple, actions: [], reasons: [] }).explanation, multiple.summary);
console.log("Danger-mode checks passed: status-only gating, water/light/haze/multiple issues, action priority, fallbacks and recovery.");
