import assert from "node:assert/strict";
import { GET } from "../app/api/outdoor-pulse/route.ts";

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let now = Date.parse("2026-09-27T09:00:00+08:00");
let calls = 0;
let pm25 = 12;
let rain = 20;
let peak = 600;
let failure = "";
let lastForecastQuery;

Date.now = () => now;
globalThis.fetch = async (url, options) => {
  calls++;
  assert.equal(options.cache, "no-store");
  assert.ok(options.signal instanceof AbortSignal);
  const air = String(url).includes("data.gov.sg");
  if (failure === "network") throw new Error("Offline");
  if (failure === (air ? "air" : "weather")) return new Response("Unavailable", { status: 503 });
  if (failure === "json") return new Response("not json");
  if (air) return Response.json({ code: 0, data: { regionMetadata: [
    { name: "central", labelLocation: { latitude: 1.35735, longitude: 103.82 } },
    { name: "east", labelLocation: { latitude: 1.35735, longitude: 103.94 } },
  ], items: [{
    timestamp: new Date(now - (failure === "stale" ? 86400000 : 0)).toISOString(),
    readings: { pm25_one_hourly: { central: failure === "invalid" ? null : pm25, east: 60 } },
  }] } });
  const query = new URL(String(url)).searchParams;
  lastForecastQuery = query;
  assert.ok(["Asia/Singapore", "auto"].includes(query.get("timezone")));
  assert.equal(query.get("forecast_days"), "1");
  assert.ok(query.get("hourly").includes("uv_index"));
  const midnight = Date.parse(new Date(now + 8 * 3600000).toISOString().slice(0, 10) + "T00:00:00+08:00") / 1000;
  return Response.json({
    timezone: Number(query.get("latitude")) > 40 ? "Europe/London" : "Asia/Singapore",
    current: { time: now / 1000, temperature_2m: 29, weather_code: 2 },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => midnight + i * 3600),
      precipitation_probability: Array(24).fill(rain),
      shortwave_radiation: Array.from({ length: 24 }, (_, i) => i === 12 ? peak : i >= 7 && i <= 18 ? 100 : 0),
      is_day: Array.from({ length: failure === "incomplete" ? 23 : 24 }, (_, i) => i >= 7 && i <= 18 ? 1 : 0),
    },
  });
};

const read = async (query = "") => {
  const response = await GET(new Request(`http://localhost/api/outdoor-pulse${query}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response.json();
};
const expire = () => { now += 86400000; };

try {
  const [first, concurrent] = await Promise.all([read(), read()]);
  assert.deepEqual(first, concurrent);
  assert.equal(calls, 2, "Concurrent requests share upstream fetches");
  assert.equal(first.available, true);
  assert.equal(first.careCue.title, "Good sun window");
  assert.equal(first.sunlight.bestWindow, "10 AM–2 PM");
  assert.equal(first.pm25.status, "clean");
  now += 30 * 60000 - 1;
  await read();
  assert.equal(calls, 2, "Cache is valid until its 30-minute expiry");
  now++;
  await read();
  assert.equal(calls, 4, "Cache refreshes at expiry");

  for (const [value, status] of [[34.9, "clean"], [35, "moderate"], [55, "moderate"], [55.1, "elevated"]]) {
    expire(); pm25 = value;
    const result = await read();
    assert.equal(result.pm25.status, status);
    if (status === "elevated") assert.equal(result.careCue.title, "Haze watch");
  }
  expire(); rain = 90;
  assert.equal((await read()).careCue.title, "Haze watch", "Haze takes priority over rain");
  expire(); pm25 = 12; rain = 60;
  assert.equal((await read()).careCue.title, "Rain likely");
  expire(); rain = 59; peak = 399;
  assert.equal((await read()).careCue.title, "Gentle daylight");
  expire(); peak = 400;
  assert.equal((await read()).careCue.title, "Good sun window");
  expire(); now += 10 * 3600000;
  assert.match((await read()).sunlight.label, /earlier today/);

  for (const mode of ["air", "weather", "network", "json", "invalid", "incomplete", "stale"]) {
    expire(); failure = mode;
    const result = await read();
    assert.equal(result.available, false, mode);
    assert.equal(result.pm25.value, null);
    assert.equal(result.pm25.status, "unavailable");
    assert.match(result.careCue.message, /sun break/);
  }
  failure = "";
  assert.equal((await read()).available, true, "Failures are not cached; the next request can recover");
  expire();
  const central = await read();
  assert.equal(lastForecastQuery.get("latitude"), "1.3521");
  assert.equal(lastForecastQuery.get("longitude"), "103.8198");
  const east = await read("?latitude=1.35735&longitude=103.94");
  assert.equal(east.location, "Your area");
  assert.equal(east.pm25.value, 60);
  assert.match(east.attribution, /east region/);
  assert.equal(lastForecastQuery.get("latitude"), "1.36", "Only rounded coordinates reach upstream");
  assert.equal(lastForecastQuery.get("timezone"), "auto");
  const cachedCalls = calls;
  assert.deepEqual(await read(), central, "Location results do not overwrite Singapore fallback");
  assert.deepEqual(await read("?latitude=1.36&longitude=103.94"), east);
  for (const query of ["?latitude=1.2", "?latitude=&longitude=103.9", "?latitude=NaN&longitude=10", "?latitude=91&longitude=10", "?latitude=10&longitude=181"]) {
    assert.deepEqual(await read(query), central, "Invalid coordinates safely use Singapore");
  }
  assert.equal(calls, cachedCalls);
  const overseas = await read("?latitude=51.5&longitude=-0.12");
  assert.equal(overseas.available, true);
  assert.equal(overseas.timeZone, "Europe/London");
  assert.equal(overseas.pm25.value, null);
  assert.equal(overseas.pm25.status, "unavailable");
  assert.notEqual(overseas.careCue.title, "Haze watch", "Singapore haze must not describe overseas conditions");
  console.log("Outdoor Pulse checks passed: thresholds, priority, time windows, cache, concurrency, fallback and recovery.");
} finally {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
}
