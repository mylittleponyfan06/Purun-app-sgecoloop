import type { OutdoorPulse } from "@/lib/types";

export const dynamic = "force-dynamic";

const TTL = 30 * 60 * 1000;
// ponytail: cache is per server instance; use a shared cache only if traffic warrants it.
const cache = new Map<string, { value: Promise<OutdoorPulse>; expiresAt: number }>();
type Coordinates = { latitude: number; longitude: number };
const singapore = { latitude: 1.3521, longitude: 103.8198 };

function coordinatesFrom(request: Request): Coordinates | null {
  const params = new URL(request.url).searchParams;
  const latitude = params.get("latitude");
  const longitude = params.get("longitude");
  if (!latitude?.trim() || !longitude?.trim()) return null;
  try {
    return { latitude: Number(number(Number(latitude), -90, 90).toFixed(2)), longitude: Number(number(Number(longitude), -180, 180).toFixed(2)) };
  } catch { return null; }
}

function nearestRegion(data: Record<string, unknown>, coordinates: Coordinates | null): string | null {
  if (!coordinates) return "central";
  const { latitude, longitude } = coordinates;
  // Approximate Singapore service area, not an exact national boundary.
  if (latitude < 1.16 || latitude > 1.48 || longitude < 103.59 || longitude > 104.1) return null;
  if (!Array.isArray(data.regionMetadata) || !data.regionMetadata.length) throw new Error("Missing regions");
  const regions = data.regionMetadata.map((value: unknown) => {
    const region = record(value);
    if (typeof region.name !== "string" || !["north", "south", "east", "west", "central"].includes(region.name)) throw new Error("Invalid region");
    const point = record(region.labelLocation);
    const distance = (number(point.latitude, -90, 90) - latitude) ** 2 + ((number(point.longitude, -180, 180) - longitude) * Math.cos(latitude * Math.PI / 180)) ** 2;
    return { name: region.name, distance };
  });
  return regions.reduce((closest, region) => region.distance < closest.distance ? region : closest).name;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid data");
  return value as Record<string, unknown>;
}

function number(value: unknown, min: number, max = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Invalid number");
  return value;
}

function series(value: unknown, length: number, min: number, max = Infinity): number[] {
  if (!Array.isArray(value) || value.length !== length) throw new Error("Incomplete forecast");
  return value.map((item: unknown) => number(item, min, max));
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Upstream unavailable");
  return response.json();
}

function weatherLabel(code: number): string {
  if (code === 0) return "Clear skies";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Cloudy skies";
  if ([45, 48].includes(code)) return "Misty skies";
  if ([51, 53, 55, 56, 57].includes(code)) return "Light drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain showers";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowy conditions";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  throw new Error("Unknown weather code");
}

function unavailable(local: boolean): OutdoorPulse {
  return {
    available: false, location: local ? "Your area" : "Singapore", timeZone: "Asia/Singapore", updatedAt: new Date().toISOString(),
    pm25: { value: null, status: "unavailable", label: "Unavailable" },
    weather: { label: "Weather unavailable", temperatureC: null, rainProbabilityPct: null },
    sunlight: { label: "Sunlight unavailable", bestWindow: "Try again later", shortwaveRadiationWm2: null },
    careCue: { title: "Taking a sun break", message: "Outdoor context is taking a sun break. Your local simulated care data is still available.", tone: "watch" },
    attribution: "PM2.5: NEA via data.gov.sg · Weather: Open-Meteo",
  };
}

async function loadPulse(coordinates: Coordinates | null): Promise<OutdoorPulse> {
  try {
    const query = new URLSearchParams({
      latitude: String((coordinates ?? singapore).latitude), longitude: String((coordinates ?? singapore).longitude), timezone: coordinates ? "auto" : "Asia/Singapore", forecast_days: "1", timeformat: "unixtime",
      current: "temperature_2m,relative_humidity_2m,weather_code",
      hourly: "temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,shortwave_radiation,uv_index,is_day",
    });
    const [airJson, forecastJson] = await Promise.all([
      fetchJson("https://api-open.data.gov.sg/v2/real-time/api/pm25"),
      fetchJson(`https://api.open-meteo.com/v1/forecast?${query}`),
    ]);
    const air = record(airJson);
    if (air.code !== 0) throw new Error("Air data unavailable");
    const airData = record(air.data);
    const region = nearestRegion(airData, coordinates);
    const items = airData.items;
    if (!Array.isArray(items) || !items.length) throw new Error("Missing air reading");
    const latest = items.map(record).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))[0];
    const pm25 = region ? number(record(record(latest.readings).pm25_one_hourly)[region], 0) : null;
    const airTime = typeof latest.timestamp === "string" ? Date.parse(latest.timestamp) : NaN;
    const forecast = record(forecastJson);
    const timeZone = coordinates ? forecast.timezone : "Asia/Singapore";
    if (typeof timeZone !== "string") throw new Error("Missing timezone");
    const hourFormatter = new Intl.DateTimeFormat("en-SG", { timeZone, hour: "numeric", hour12: true });
    const current = record(forecast.current);
    const currentTime = number(current.time, 0) * 1000;
    // Do not present stale observations as current outdoor conditions.
    if (!Number.isFinite(airTime) || Math.abs(Date.now() - airTime) > 6 * 3600000 || Math.abs(Date.now() - currentTime) > 2 * 3600000) throw new Error("Stale observations");
    const temperatureC = number(current.temperature_2m, -90, 60);
    const condition = weatherLabel(number(current.weather_code, 0, 99));
    const hourly = record(forecast.hourly);
    if (!Array.isArray(hourly.time) || hourly.time.length < 23 || hourly.time.length > 25) throw new Error("Incomplete forecast");
    const times = series(hourly.time, hourly.time.length, 0);
    const rain = series(hourly.precipitation_probability, times.length, 0, 100);
    const radiation = series(hourly.shortwave_radiation, times.length, 0);
    const daylight = series(hourly.is_day, times.length, 0, 1);
    if (times.some((time, i) => i > 0 && time - times[i - 1] !== 3600)) throw new Error("Invalid forecast hours");
    const remaining = times.map((time, i) => ({ time, i })).filter(({ time }) => time + 3600 > currentTime / 1000);
    if (!remaining.length) throw new Error("Outdated forecast");
    const rainProbabilityPct = Math.max(...remaining.map(({ i }) => rain[i]));
    const day = times.map((time, i) => ({ time, radiation: radiation[i], daylight: daylight[i] })).filter((hour) => hour.daylight === 1 && hour.radiation > 0);
    const peak = day.length ? day.reduce((best, hour) => hour.radiation > best.radiation ? hour : best) : null;
    const start = peak ? Math.max(day[0].time, peak.time - 7200) : 0;
    const end = peak ? Math.min(day[day.length - 1].time + 3600, peak.time + 7200) : 0;
    const formatHour = (time: number) => hourFormatter.format(time * 1000).toUpperCase();
    const passed = end * 1000 <= currentTime;
    // Prototype sunlight cue threshold, not a plant-health calculation.
    const strongSun = peak !== null && peak.radiation >= 400 && !passed;
    const status = pm25 === null ? "unavailable" : pm25 < 35 ? "clean" : pm25 <= 55 ? "moderate" : "elevated";
    const careCue: OutdoorPulse["careCue"] = status === "elevated"
      ? { title: "Haze watch", message: "Outdoor particles are elevated. Keep Purun away from open windows if possible.", tone: "caution" }
      : rainProbabilityPct >= 60
        ? { title: "Rain likely", message: "Rain is likely later. Avoid overfilling the reservoir before moving Purun outdoors.", tone: "watch" }
        : strongSun
          ? { title: "Good sun window", message: "Bright conditions are expected. A good time for Purun to enjoy daylight.", tone: "good" }
          : { title: "Gentle daylight", message: "Light looks softer today. Place Purun near the brightest available daylight.", tone: "watch" };
    return {
      available: true, location: coordinates ? "Your area" : "Singapore", timeZone, updatedAt: new Date(region ? Math.min(airTime, currentTime) : currentTime).toISOString(),
      pm25: { value: pm25, status, label: { clean: "Clean", moderate: "Moderate", elevated: "Elevated", unavailable: "Outside Singapore coverage" }[status] },
      weather: { label: condition, temperatureC, rainProbabilityPct },
      sunlight: { label: !peak ? "No bright daylight forecast" : passed ? "Today's sun window · earlier today" : "Today's best sunlight", bestWindow: peak ? `${formatHour(start)}–${formatHour(end)}` : "No window today", shortwaveRadiationWm2: peak?.radiation ?? 0 },
      careCue, attribution: `PM2.5: ${region ? `NEA via data.gov.sg (${region} region)` : "unavailable outside Singapore coverage"} · Weather: Open-Meteo`,
    };
  } catch {
    return unavailable(coordinates !== null);
  }
}

export async function GET(request: Request): Promise<Response> {
  const coordinates = coordinatesFrom(request);
  const key = coordinates ? `${coordinates.latitude},${coordinates.longitude}` : "singapore";
  for (const [key, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(key);
  let entry = cache.get(key);
  if (!entry) {
    // Bound memory while keeping different users' location results separate.
    if (cache.size >= 50) cache.delete(cache.keys().next().value!);
    entry = { value: loadPulse(coordinates), expiresAt: Date.now() + TTL };
    cache.set(key, entry);
  }
  const value = await entry.value;
  if (!value.available && cache.get(key) === entry) cache.delete(key);
  return Response.json(value, { headers: { "Cache-Control": "no-store" } });
}
