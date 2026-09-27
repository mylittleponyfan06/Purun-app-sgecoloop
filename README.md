# Purun Loop

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

After location access succeeds, a neighbourhood-scale [OpenStreetMap embed](https://wiki.openstreetmap.org/wiki/Export) opens automatically and scrolls into view. Its initial area and visible pin use the same coordinates rounded to two decimal places. The pin is approximate and can sit a few streets away from the actual position; exact GPS coordinates are not sent to the map service. Map data attribution and a link to open the same pinned location in OpenStreetMap remain visible if the embed does not load. **Hide area** removes the embed and **View area** reopens it centred on the pin; **Location options** clears it. Denied permission and Use Singapore do not show a personal-area map. No map API key, new dependency, reverse geocoding or saved location is needed.

Only the server route contacts weather and air-quality services; the optional map embed loads in the browser. No API keys or extra dependencies are required.

- [Singapore PM2.5 API](https://api-open.data.gov.sg/v2/real-time/api/pm25): NEA's hourly particle reading via data.gov.sg. Defaults to the **central region**; with permission, selects the nearest regional label location inside an approximate Singapore service area (1.16–1.48 latitude, 103.59–104.10 longitude). Outside that area, PM2.5 is labelled unavailable while local weather still works. The app sends no user coordinates to NEA. Prototype labels: below 35 µg/m³ is clean, 35–55 is moderate, above 55 is elevated; these are app cues, not official health advice.
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): current weather and today's hourly forecast at the chosen coordinates, using their local timezone. Without permission, uses latitude 1.3521, longitude 103.8198, timezone Asia/Singapore. Requests temperature, humidity, rain probability, weather codes, shortwave radiation and UV index, plus daylight flags.

Successful normalized responses are cached **in memory for 30 minutes per server instance and approximate location**, with at most 50 entries. Concurrent requests for a location share the same upstream fetch. The cache resets on restart or serverless cold start; it is not shared across instances. There is no scheduler or background polling. Home and Care reuse the result for this visit; reopening and choosing a location requests the server's current cached result.

Each upstream request has an 8-second timeout. Failed, malformed or stale source data returns `available: false` with a friendly message and null readings. Failures are not cached, so another visit can retry. Observations older than six hours (PM2.5) or two hours (weather) are treated as unavailable. The displayed timestamp is the older source observation, in the forecast location's timezone.

The sunlight window spans up to two hours on either side of today's strongest daylight radiation hour, bounded by daylight hours. Past windows are labelled “earlier today.” The prototype calls a peak of at least 400 W/m² strong sunlight while its window is still ahead or in progress. Rain probability is the highest hourly probability remaining today. Cues prioritize elevated particles, then rain at 60% or more, then strong sunlight, otherwise softer daylight.

**Outdoor Pulse is informational context only.** It is not a direct reading at the planter and never changes simulated sensor readings, Plant Health scores, trends, danger mode or care assessments. No AI calls are made.

## Presenter simulation controls

**CHECK NOW** on Home runs a local care check using the currently applied simulation values. A 700 ms animation says “Checking local values…” before the existing store action creates a fresh ID/timestamp, runs the plant rules, persists a new history entry and updates the pages. “Care check updated just now” appears for five seconds. Repeated clicks during a check are ignored. Navigating away cancels a pending local check; an open demo modal or a newer applied reading also prevents that pending check from overwriting state. Unsaved slider drafts and Outdoor Pulse are never used. After the local result is visible, an optional enabled cloud rewrite can improve its wording as described below.

On Home, select **Demo controls** to open the Simulation Controls modal. Choose Thriving wetland, Low reservoir, Low light, Haze event or Multiple issues, then adjust the five sliders if needed. Scenario buttons change only the draft; **Apply simulated reading** timestamps it, runs the deterministic rules engine, updates Home/Health/Care/Trends and closes the modal. Cancel or Escape discards the draft.

The Zustand store in `store/usePurunStore.ts` persists the current reading, assessment, simulation flag, auto-read settings, and up to 120 history entries in `localStorage` under `purun-demo-state`. Applied history is limited to the last 24 hours. The seed history remains illustrative; newly applied scores come from the rules engine. Simulation charts include applied light readings at any time of day. The modal's open state and unsaved sliders are not persisted.

## Local auto-read

In **Settings → Auto-read schedule**, select Manual, 15/30/60 seconds (demo), or 1 hour (final-product setting), then enable the Auto-read switch. Auto-read defaults OFF; the selected interval defaults to one hour. Manual turns it off. Settings are saved locally, retaining the existing interval units of minutes and treating older saves as OFF.

One timer in the shared app layout checks the deadline each second, survives page navigation, and is cleared on unmount. Enabling auto-read, changing its interval, reopening the app, or applying any reading starts a fresh countdown. Home and Settings show the countdown and elapsed time since the last reading; the shared header reflects ON/OFF. Auto-read waits while Demo controls is open and uses only the applied environment values, never slider drafts or Outdoor Pulse. Each read runs the same rules, history persistence and UI updates as CHECK NOW.

This is a browser-only simulation schedule, including the hourly option. Closing the app stops it; device sleep or browser throttling may delay it. Returning after a delay produces at most one fresh reading, with no backfilled samples. Each open browser tab runs its own local demo. No server cron, notifications, cloud AI or additional external requests are involved.

To test, enable 15 seconds, navigate Home → Trends, and verify a single new history point per interval. Refresh to check settings persist, switch intervals, and turn it OFF or select Manual to stop reads. Open Demo controls across a deadline to verify the draft stays untouched; close it to resume. `node scripts/check-simulation.mjs` also checks deadlines, duplicate ticks, settings persistence, Manual/OFF, hydration, and delayed reads.

**SIMULATION MODE** appears in the shared header on every page after applying a reading. On refresh, saved values are validated and the active assessment is recomputed. Invalid saved data falls back to the healthy preview. If browser storage is blocked or full, an explicit notice appears and the demo continues in memory. Clear the `purun-demo-state` key in browser developer tools and reload to restore the original preview. Outdoor Pulse remains independent and never enters this store or scoring flow.

## Offline care summaries

`generateCareSummary(assessment)` in `lib/care-summary.ts` returns a typed `CarePayload` with `source: "local-rules"`. Home's AI Care Check and the Care page use this same deterministic, offline function. It uses only the assessment status and actions for short wording, copies the reasons, preserves action details, and selects up to three actions in priority order. It does not invent measurements, predict reservoir depletion, recalculate health, read the clock, or call a model/API. The existing AI Care Check title is a prototype label; the card explicitly identifies local rules as its source.

`PlantAssessment` has no simulation-mode field, so each page adds **Advice based on a simulated reading** using the existing store flag. The generator itself stays independent of the store. When there are no assessed actions, the Care page keeps its existing general guides under **Routine care guides**, separate from generated advice.

Run `node scripts/check-care-summary.mjs` for complete thriving, watch and danger payload examples and assertions. Example summaries:

- Thriving: “Purun is doing well overall. Keep up your usual care rhythm.”
- Watch (low light and warm water): “A little care will help Purun feel more comfortable. Next step: Move to brighter daylight.”
- Danger (low reservoir): “Purun needs some attention today. Next step: Refill reservoir.”

To test the UI, apply Thriving wetland, Low light, then Low reservoir in Demo controls. Home and Care should agree on wording, show the simulated-reading label, and update immediately. Multiple issues shows at most three prioritized actions; existing danger links still open the first Care guide. The generator and care text work without network access after the app has loaded; this does not add offline installation or service-worker caching.

## Optional cloud explanation and model selection

Cloud AI is disabled by default. Configure `.env` or `.env.local` using `.env.example`: set `AI_API_KEY`, `AI_ENABLED=true`, and `AI_BASE_URL` to the Responses-compatible base URL supplied with that key (including `/v1` when required). For this project's supplied Sub2API catalog, the provided gateway is `https://tokens.zmtest.net:52080/v1`. OpenCode Zen users can instead configure `https://opencode.ai/zen/v1` with a Zen key. Keys and URLs must belong to the same provider. The server appends `/responses`. HTTPS is required except for localhost development. Never use a `NEXT_PUBLIC_` key or commit your private `.env` files.

Restart `npm run dev` and reload after changing environment configuration. The app shell reads configuration at request time, so a production server can also change providers on restart without rebuilding. It exposes only the enable/configuration status, provider hostname and sanitized model options. The key stays on the server. Model options come from `codex-models.json`; rebuild production after editing that catalog. Only IDs, display names, API support and reasoning metadata are read. The catalog's agent instruction templates are neither browser data nor model instructions.

In **Settings → Care explanation model**, select one of the catalog's text models. The choice persists in localStorage. The default is `gpt-5.6-luna` when present. Audio/realtime models remain visible but disabled because this feature needs a text response. The server rejects unknown or unsupported model IDs and uses each model's supported low reasoning level, or its declared default if low is absent. Being listed is not proof of provider access or structured-output support.

Go Home and press **CHECK NOW**. **Requesting an AI explanation…** means a request is pending. **AI-enhanced explanation**, together with **AI replied and its explanation passed validation**, confirms a usable response. Home, Care and Settings show the attempted model, provider and local time of the attempt. Otherwise a specific message explains disabled AI, missing configuration, rejected credentials, unavailable model/endpoint, rate limiting, timeout, networking problems or failed output validation. These messages never include raw provider errors or credentials. Changing model or applying a new reading clears the previous result and cancels pending work so an old model cannot claim success for a new selection.

The server requests strict JSON output with `store: false`. Provider usage may be charged. Only the current simulated reading, its server-recomputed assessment, the local fallback and rewriting instructions are sent. No Outdoor Pulse data, location, history or catalog instruction templates are sent. Zod is the only added dependency; there is no provider SDK.

`getCarePayload()` returns the deterministic fallback without making a request when disabled. When enabled, it calls `/api/ai-summary` after CHECK NOW has already updated readings, scoring, history and danger mode. The route validates the input and recomputes the assessment, requests [strict structured JSON](https://developers.openai.com/api/docs/guides/structured-outputs), then validates the response with Zod. Invalid requests return a generic 4xx response; provider failures return a local CarePayload with a safe diagnostic code in the `X-Care-AI-Status` header. Missing configuration, timeouts (20 seconds upstream / 25 seconds client), refusals, incomplete responses and invalid output all fall back locally. The longer deadline allows the catalog's reasoning models to respond. A simple five-second per-instance cooldown also falls back locally for rapid requests; it is not a distributed rate limit.

`CarePayload.source` is now `"local-rules" | "ai-enhanced"`. Home and Care show **Local care logic** or **AI-enhanced explanation**, retaining the simulated-reading label. AI can rephrase only the headline, summary and action details. Status, reasons, action titles/order/priorities/count and next-check advice must match the fallback. Extra properties such as a score are rejected; numerical values and measurement units in action details must remain unchanged. Prompts prohibit added claims, links, shopping, medical advice and nutrients; deterministic checks reject numeric drift and common prohibited content. These checks constrain wording but do not prove semantic equivalence of arbitrary prose. The deterministic assessment always remains the source of truth.

AI wording stays in memory only, shared across Home and Care. New readings cancel pending rewrites, clear old explanations and reject late results by reading ID. Refresh restores local logic. Auto-read and scenario Apply never call the cloud service. CHECK NOW's reading update and success message never wait for AI.

Test without credentials using `node scripts/check-ai-summary.mjs`; it mocks the provider and checks success, configuration errors, model validation, invalid inputs/outputs, timeouts, fallback, model persistence, preserved scoring/history and stale responses after reading/model changes. For a live test, configure your provider, choose a model, restart, click CHECK NOW and watch the status. Block `/api/ai-summary` in browser tools to verify local advice still updates. With `AI_ENABLED=false`, CHECK NOW must make no AI-summary request. Actual provider access requires a valid key; mock tests do not verify account/model availability.

## Ask Purun: contextual plant chat

Use **Ask Purun** in the shared header on any page. The panel shows the current simulated conditions, starter questions, a text box for follow-ups, and the same persisted model choice as Settings. Each reply names its source and the reading timestamp/score it used. **Purun · AI reply · [model]** confirms a validated response from that model; **Local care logic** is a limited deterministic recap, with the reason AI was unavailable. Stop cancels an in-progress request. Clear chat starts over.

`POST /api/plant-chat` accepts the current simulated reading and up to 11 recent conversation messages, validates them with Zod, recomputes the assessment server-side and sends that context plus deterministic care guidance to the configured Responses gateway. The unchanged static preview retains its curated score of 82; applied readings use the rules engine. No location, Outdoor Pulse data or sensor history is sent. Chat text and simulated context are shared with the configured provider only when sending a question; `store: false` is requested and provider policies still apply. Keys remain server-only. Chat shares the existing 20-second provider deadline and five-second per-instance cooldown with care explanations.

Conversation remains in memory across navigation (up to 40 displayed messages; the last 10 plus the new question are sent), and clears on reload. A reading or model change cancels a pending reply; each subsequent question uses fresh context. AI-disabled, offline, timeout and invalid-output paths show a local recap without changing readings, health scores, care actions, trends or controls. Chat has no tools that can operate the app. Its output is schema-validated, rendered as plain text and prompted to stick to supplied facts, but wording can still be mistaken; the deterministic assessment remains authoritative.

Test with `node scripts/check-plant-chat.mjs`. In the browser, apply **Low reservoir**, open Ask Purun and ask what to do first: context should show water 20%, score 55 and danger, with refill guidance. Ask a follow-up, switch models, and verify subsequent replies use the selection. Block `/api/plant-chat` to check the labeled local recap. Close/reopen or navigate to Care to retain the conversation; reload to clear it. No new packages or environment variables are required.

## Shared loading UI

`LeafLoader` uses three inline SVG leaves and CSS animation for page/shell loading, Outdoor Pulse (including Care's compact cue), map embedding, CHECK NOW, AI explanations, chat replies, and restoring local reading/history data. It needs no downloaded image or animation package. Status text is announced accessibly; reduced-motion preferences replace movement with still leaves. Existing inline plant illustrations and icons render immediately, with no artificial loading delay.

Choosing **Use my location** shows **Finding your area…**, permission guidance and an enabled **Use Singapore** escape. A 20-second overall wait limit covers unanswered browser permission prompts; denial or failure still falls back to Singapore. Cancelled and late location callbacks cannot replace a newer choice. Timers are cleared on completion/unmount. **View area** shows the same leaf loader until the map frame loads, with a 12-second slow-map message and the existing external map link. A cross-origin iframe's load event cannot confirm individual map tiles; OpenStreetMap manages those internally.

Test using browser network throttling: choose a location, open View area, send a chat message, and press CHECK NOW. The corresponding leaf loader should disappear when the operation settles. Try reduced-motion mode, decline location, or leave permission unanswered to verify recovery. Run `node scripts/check-leaf-loader.mjs` for the dependency-free component render check.

## Checks

Danger UI is driven only by `currentAssessment.status === "danger"`. Home shows an amber/terracotta orb, a calm explanation and a primary link to the highest-priority Care guide. Health, Trends and Care show a compact banner. The matching first guide opens automatically, and applying a thriving or watch assessment removes danger alerts without a separate dismissal state. Outdoor Pulse cannot trigger these alerts.

The existing rules still classify **Low light alone** and **Haze event alone** as watch, so those presets do not display danger UI. To test danger involving light or haze, add a second danger condition (for example water temperature 36°C), or use Multiple issues. The highest-priority action remains first even when several conditions need attention.

`lib/plant-rules.ts` exports the pure `assessPlant(reading)` prototype rules engine, used when applying a simulated reading, and shared condition labels for Home and Health. It is not connected to Outdoor Pulse. Good conditions deduct zero; watch conditions deduct half their maximum penalty rounded up (water 23, light 13, water temperature 8, particles 5); danger conditions deduct the full maximum (45, 25, 15, 10). Thriving wetland scores 100; the untouched preview still shows 82. One non-water danger condition is classified as watch unless the score is below 45; low water or two danger conditions always produce danger. Danger actions precede watch actions, with ties ordered by maximum score impact. `updatedAt` copies the input timestamp. Invalid numbers, negative water/light/particles, water above 100%, or invalid timestamps throw `RangeError`. Humidity is displayed but does not affect the score.

```sh
npm run typecheck
npm run build
node scripts/check-outdoor-pulse.mjs
node scripts/check-location-map.mjs
node scripts/check-leaf-loader.mjs
node scripts/check-plant-rules.mjs
node scripts/check-simulation.mjs
node scripts/check-danger-mode.mjs
node scripts/check-care-summary.mjs
node scripts/check-ai-summary.mjs
node scripts/check-plant-chat.mjs
```

The standalone check uses Node.js 22.18+ native TypeScript support and mocked upstream responses; it checks thresholds, cue priority, Singapore time windows, cache expiry, simultaneous requests, failures and recovery without contacting external services.

For the presenter flow, apply **Multiple issues** and verify score 5, danger status, water 20%, light 3,000 lux, PM2.5 80 µg/m³, water temperature 37°C and humidity 50%. Check Health, Care and Trends; the first care action should be Refill reservoir. Refresh and verify the same state returns with the modal closed. Load Thriving wetland and cancel to confirm nothing changes, then apply it to get score 100. The simulation check covers scenarios, draft cancellation, persistence validation, history bounds and blocked storage without a browser or external calls.

Visit `/` and `/care` at desktop, iPad landscape and mobile widths. Try both location choices and browser permission denial; denial must request `/api/outdoor-pulse` without coordinates. Allowing a Singapore location should use rounded coordinates and the nearest NEA region. Navigate between pages to verify the choice stays in effect. Use Location options to switch back to Singapore. Block `/api/outdoor-pulse` in browser developer tools, reload and choose Singapore to check the unavailable state; throttle the request to see the falling-leaf loader. Simulated readings and navigation should still work.
