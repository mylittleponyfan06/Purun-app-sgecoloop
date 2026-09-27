import assert from "node:assert/strict";
import { currentReading, healthTrend, historicalReadings, plantAssessment, reservoirTrend, sunlightTrend, sunlightWindow } from "../lib/mock-data.ts";

const readings = [...historicalReadings, currentReading];
assert.equal(healthTrend.length, readings.length);
assert.equal(healthTrend.at(-1).value, plantAssessment.score);
assert.equal(healthTrend.at(-1).timestamp - healthTrend[0].timestamp, 24 * 3600000);
assert.equal(reservoirTrend.at(-1).value, currentReading.waterLevelPct);
assert.ok(sunlightTrend.length > 0);

for (const [index, point] of healthTrend.entries()) {
  assert.equal(point.timestamp, Date.parse(readings[index].timestamp));
  assert.ok(Number.isFinite(point.value) && point.value >= 0 && point.value <= 100);
  assert.equal(reservoirTrend[index].value, readings[index].waterLevelPct);
  if (index > 0) {
    assert.ok(point.timestamp > healthTrend[index - 1].timestamp);
    assert.ok(reservoirTrend[index].value <= reservoirTrend[index - 1].value);
  }
}

for (const point of sunlightTrend) {
  assert.ok(point.timestamp >= sunlightWindow[0] && point.timestamp <= sunlightWindow[1]);
  assert.equal(point.value, readings.find(reading => Date.parse(reading.timestamp) === point.timestamp).lightLux);
}
assert.equal(sunlightWindow[1] - sunlightWindow[0], 13 * 3600000);
console.log("Trend checks passed: 24-hour alignment, score range, declining water, and unaltered daylight readings.");
