# Purun Care

An iPad-first Next.js prototype for a Purun wetland-care station.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Home, Health, Trends, Care and Settings use local mock plant data.

## Outdoor Pulse

On each app opening, a banner offers **Use my location** or **Use Singapore**. Location is requested only after the user presses the first button. Declining either in the app or browser, a timeout, an unsupported browser, or an insecure connection uses the original Singapore defaults (1.3521, 103.8198). The choice and shared Outdoor Pulse result persist across tabs for this visit; reloading asks again. **Location options** lets the user change their choice.

Home and Care share `/api/outdoor-pulse` data fetched after the location choice. Coordinates are rounded to two decimal places before leaving the browser, passed through the server to Open-Meteo, and kept only in memory by the app. No location is saved to browser storage or a database. The server cache uses separate location keys, so one user's result cannot overwrite the Singapore default. Standard hosting request logs may include the rounded query coordinates. Geolocation needs HTTPS on a deployed iPad site (localhost works for development).

Only the server route contacts upstream services; no API keys or extra dependencies are required.

- [Singapore PM2.5 API](https://api-open.data.gov.sg/v2/real-time/api/pm25): NEA's hourly particle reading via data.gov.sg. Defaults to the **central region**; with permission, selects the nearest regional label location inside an approximate Singapore service area (1.16–1.48 latitude, 103.59–104.10 longitude). Outside that area, PM2.5 is labelled unavailable while local weather still works. The app sends no user coordinates to NEA. Prototype labels: below 35 µg/m³ is clean, 35–55 is moderate, above 55 is elevated; these are app cues, not official health advice.
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): current weather and today's hourly forecast at the chosen coordinates, using their local timezone. Without permission, uses latitude 1.3521, longitude 103.8198, timezone Asia/Singapore. Requests temperature, humidity, rain probability, weather codes, shortwave radiation and UV index, plus daylight flags.

Successful normalized responses are cached **in memory for 30 minutes per server instance and approximate location**, with at most 50 entries. Concurrent requests for a location share the same upstream fetch. The cache resets on restart or serverless cold start; it is not shared across instances. There is no scheduler or background polling. Home and Care reuse the result for this visit; reopening and choosing a location requests the server's current cached result.

Each upstream request has an 8-second timeout. Failed, malformed or stale source data returns `available: false` with a friendly message and null readings. Failures are not cached, so another visit can retry. Observations older than six hours (PM2.5) or two hours (weather) are treated as unavailable. The displayed timestamp is the older source observation, in the forecast location's timezone.

The sunlight window spans up to two hours on either side of today's strongest daylight radiation hour, bounded by daylight hours. Past windows are labelled “earlier today.” The prototype calls a peak of at least 400 W/m² strong sunlight while its window is still ahead or in progress. Rain probability is the highest hourly probability remaining today. Cues prioritize elevated particles, then rain at 60% or more, then strong sunlight, otherwise softer daylight.

**Outdoor Pulse is informational context only.** It is not a direct reading at the planter and never changes simulated sensor readings, Plant Health scores, trends, danger mode or care assessments. No AI calls are made.

## Presenter simulation controls

**CHECK NOW** on Home runs a local care check using the currently applied simulation values. A 700 ms animation says “Checking local values…” before the existing store action creates a fresh ID/timestamp, runs the plant rules, persists a new history entry and updates the pages. “Care check updated just now” appears for five seconds. Repeated clicks during a check are ignored. Navigating away cancels a pending check; an open demo modal or a newer applied reading also prevents that pending check from overwriting state. Unsaved slider drafts and Outdoor Pulse are never used. No external request, AI call or scheduler is involved.

On Home, select **Demo controls** to open the Simulation Controls modal. Choose Thriving wetland, Low reservoir, Low light, Haze event or Multiple issues, then adjust the five sliders if needed. Scenario buttons change only the draft; **Apply simulated reading** timestamps it, runs the deterministic rules engine, updates Home/Health/Care/Trends and closes the modal. Cancel or Escape discards the draft. No readings are scheduled automatically.

The Zustand store in `store/usePurunStore.ts` persists the current reading, assessment, simulation flag, auto-read interval (60 minutes, inactive), and up to 120 history entries in `localStorage` under `purun-demo-state`. Applied history is limited to the last 24 hours. The seed history remains illustrative; newly applied scores come from the rules engine. Simulation charts include applied light readings at any time of day. The modal's open state and unsaved sliders are not persisted.

**SIMULATION MODE** appears in the shared header on every page after applying a reading. On refresh, saved values are validated and the active assessment is recomputed. Invalid saved data falls back to the healthy preview. If browser storage is blocked or full, an explicit notice appears and the demo continues in memory. Clear the `purun-demo-state` key in browser developer tools and reload to restore the original preview. Outdoor Pulse remains independent and never enters this store or scoring flow.

## Checks

Danger UI is driven only by `currentAssessment.status === "danger"`. Home shows an amber/terracotta orb, a calm explanation and a primary link to the highest-priority Care guide. Health, Trends and Care show a compact banner. The matching first guide opens automatically, and applying a thriving or watch assessment removes danger alerts without a separate dismissal state. Outdoor Pulse cannot trigger these alerts.

The existing rules still classify **Low light alone** and **Haze event alone** as watch, so those presets do not display danger UI. To test danger involving light or haze, add a second danger condition (for example water temperature 36°C), or use Multiple issues. The highest-priority action remains first even when several conditions need attention.

`lib/plant-rules.ts` exports the pure `assessPlant(reading)` prototype rules engine, used when applying a simulated reading, and shared condition labels for Home and Health. It is not connected to Outdoor Pulse. Good conditions deduct zero; watch conditions deduct half their maximum penalty rounded up (water 23, light 13, water temperature 8, particles 5); danger conditions deduct the full maximum (45, 25, 15, 10). Thriving wetland scores 100; the untouched preview still shows 82. One non-water danger condition is classified as watch unless the score is below 45; low water or two danger conditions always produce danger. Danger actions precede watch actions, with ties ordered by maximum score impact. `updatedAt` copies the input timestamp. Invalid numbers, negative water/light/particles, water above 100%, or invalid timestamps throw `RangeError`. Humidity is displayed but does not affect the score.

```sh
npm run typecheck
npm run build
node scripts/check-outdoor-pulse.mjs
node scripts/check-plant-rules.mjs
node scripts/check-simulation.mjs
node scripts/check-danger-mode.mjs
```

The standalone check uses Node.js 22.18+ native TypeScript support and mocked upstream responses; it checks thresholds, cue priority, Singapore time windows, cache expiry, simultaneous requests, failures and recovery without contacting external services.

For the presenter flow, apply **Multiple issues** and verify score 5, danger status, water 20%, light 3,000 lux, PM2.5 80 µg/m³, water temperature 37°C and humidity 50%. Check Health, Care and Trends; the first care action should be Refill reservoir. Refresh and verify the same state returns with the modal closed. Load Thriving wetland and cancel to confirm nothing changes, then apply it to get score 100. The simulation check covers scenarios, draft cancellation, persistence validation, history bounds and blocked storage without a browser or external calls.

Visit `/` and `/care` at desktop, iPad landscape and mobile widths. Try both location choices and browser permission denial; denial must request `/api/outdoor-pulse` without coordinates. Allowing a Singapore location should use rounded coordinates and the nearest NEA region. Navigate between pages to verify the choice stays in effect. Use Location options to switch back to Singapore. Block `/api/outdoor-pulse` in browser developer tools, reload and choose Singapore to check the unavailable state; throttle the request to see the loading skeleton. Simulated readings and navigation should still work.
