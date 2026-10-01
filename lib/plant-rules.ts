import type { CareAction, PlantAssessment, SensorReading } from "./types";

type Condition = "good" | "watch" | "danger";

export function getSensorConditions(reading: SensorReading): { water: Condition; temperature: Condition; light: Condition; air: Condition } {
  return {
    water: reading.waterLevelPct < 30 ? "danger" : reading.waterLevelPct < 50 ? "watch" : "good",
    temperature: reading.waterTempC < 18 || reading.waterTempC > 35 ? "danger" : reading.waterTempC < 22 || reading.waterTempC > 32 ? "watch" : "good",
    light: reading.lightLux < 30000 || reading.lightLux > 80000 ? "danger" : reading.lightLux < 40000 || reading.lightLux > 70000 ? "watch" : "good",
    air: reading.pm25UgM3 > 55 ? "danger" : reading.pm25UgM3 >= 35 ? "watch" : "good",
  };
}

/** Label for a light reading that is not in the optimal band: "High light" above it, "Low light" below it. */
export function getLightProblemLabel(lightLux: number): "High light" | "Low light" {
  return lightLux > 70000 ? "High light" : "Low light";
}

/** Prototype experience-design rules for simulated readings, not a scientific diagnosis.
 * Good deducts zero; watch deducts half the maximum, rounded up; danger deducts the maximum.
 * Decimal readings use continuous bands (e.g. 49.9% is watch, 21.9°C is watch).
 * A single non-water danger condition is watch unless the score falls below 45.
 * Invalid numbers/ranges/timestamps throw RangeError rather than report false health.
 */
export function assessPlant(reading: SensorReading): PlantAssessment {
  const { waterLevelPct: water, waterTempC: temperature, lightLux: light, pm25UgM3: particles } = reading;
  if (![water, temperature, light, particles].every(Number.isFinite) || water < 0 || water > 100 || light < 0 || particles < 0 || !Number.isFinite(Date.parse(reading.timestamp))) {
    throw new RangeError("Plant assessment needs valid sensor values and a timestamp.");
  }

  const { water: waterCondition, temperature: temperatureCondition, light: lightCondition, air: airCondition } = getSensorConditions(reading);

  const tooBright = light > 70000; // light advice depends on which side of the optimal band the reading is on
  // Equal-priority actions follow impact: water, light, water temperature, air.
  const conditions: { condition: Condition; maximum: number; reason: string; action: Omit<CareAction, "priority"> }[] = [
    { condition: waterCondition, maximum: 45,
      reason: waterCondition === "good" ? "The reservoir has a comfortable water level." : waterCondition === "danger" ? "The reservoir is very low and needs water now." : "The reservoir is getting low and will need a refill soon.",
      action: { id: "refill-reservoir", title: "Refill reservoir", description: "Top up the reservoir to the 50–100% prototype range, without overflowing it.", icon: "droplet" } },
    { condition: lightCondition, maximum: 25,
      reason: lightCondition === "good" ? "Purun has plenty of bright daylight." : tooBright ? (lightCondition === "danger" ? "The light is much too intense for Purun." : "The light is a little stronger than Purun's comfortable range.") : lightCondition === "danger" ? "Purun is receiving very little light." : "Purun could use brighter daylight.",
      action: { id: "move-to-brighter-daylight", title: tooBright ? "Reduce strong light" : "Move to brighter daylight", description: tooBright ? "Move Purun out of harsh direct light and aim for a simulated light reading of 40,000–70,000 lux." : "Move Purun to a brighter spot and aim for a simulated light reading of 40,000–70,000 lux.", icon: "sun" } },
    { condition: temperatureCondition, maximum: 15,
      reason: temperatureCondition === "good" ? "The water temperature is in a comfortable range." : temperature < 22 ? "The water is cooler than Purun's comfortable range." : "The water is warmer than Purun's comfortable range.",
      action: { id: "check-water-temperature", title: "Check water temperature", description: temperature < 22 ? "Move the reservoir away from cold drafts and let the water return gradually to 22–32°C." : "Move the reservoir away from excess heat and let the water return gradually to 22–32°C.", icon: "droplet" } },
    { condition: airCondition, maximum: 10,
      reason: airCondition === "good" ? "Particle levels are low in this simulated reading." : airCondition === "danger" ? "Particle levels are high around Purun." : "Particle levels are higher than the prototype's clean range.",
      action: { id: "reduce-haze-exposure", title: "Reduce haze exposure", description: "Move Purun away from open windows while particle levels are elevated.", icon: "wind" } },
  ];

  const deduction = conditions.reduce((total, { condition, maximum }) => total + (condition === "danger" ? maximum : condition === "watch" ? Math.ceil(maximum / 2) : 0), 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));
  const dangerCount = conditions.filter(({ condition }) => condition === "danger").length;
  const status = score < 45 || waterCondition === "danger" || dangerCount >= 2 ? "danger" : score >= 75 && dangerCount === 0 ? "thriving" : "watch";
  const issues = conditions.filter(({ condition }) => condition !== "good")
    .sort((a, b) => Number(b.condition === "danger") - Number(a.condition === "danger") || b.maximum - a.maximum);

  return {
    score,
    status,
    headline: { thriving: "Thriving", watch: "A little care needed", danger: "Care needed now" }[status],
    summary: status === "danger" ? "Purun needs some attention now. Start with the first care step below."
      : status === "watch" ? "A few conditions need attention. A small change can help Purun feel more comfortable."
        : issues.length ? "Purun is doing well overall. A small care step will help keep it comfortable."
          : "Purun is doing well. Water, daylight and air are all in the prototype's comfortable ranges.",
    reasons: [...issues, ...conditions.filter(({ condition }) => condition === "good")].map(({ reason }) => reason),
    actions: issues.map(({ condition, action }) => ({ ...action, priority: condition === "danger" ? "now" : "soon" })),
    updatedAt: reading.timestamp,
  };
}