"use client";

import { CloudRain, Leaf, Sparkles, Sun, Wind } from "lucide-react";
import { useOutdoorPulse } from "./OutdoorPulseProvider";

const unavailableMessage = "Outdoor context is taking a sun break. Your local simulated care data is still available.";
export default function OutdoorPulseCard({ compact = false }: { compact?: boolean }) {
  const { pulse, awaitingChoice } = useOutdoorPulse();
  const loading = pulse === undefined && !awaitingChoice;
  const available = pulse?.available === true;
  const local = pulse?.location === "Your area";
  const honesty = `${local ? "Outdoor context for your area" : "Outdoor Singapore context"} · not a direct reading at the planter`;
  const waitingMessage = "Choose a location option above to see outdoor context.";

  if (compact) {
    return (
      <aside className="outdoor-compact" aria-label="Outdoor cue" aria-live="polite" aria-busy={loading}>
        <Leaf size={18} aria-hidden="true" />
        <div>
          <p><strong>Outdoor cue</strong> · {awaitingChoice ? waitingMessage : loading ? "Checking the sky…" : available ? `${pulse.careCue.title}. ${pulse.careCue.message}` : unavailableMessage}</p>
          <p className="outdoor-honesty">{honesty}</p>
        </div>
      </aside>
    );
  }

  return (
    <section className="outdoor-pulse" aria-labelledby="outdoor-heading" aria-busy={loading}>
      <header className="outdoor-heading">
        <span className="outdoor-sun"><Sun size={25} strokeWidth={1.6} aria-hidden="true" /></span>
        <div><h2 id="outdoor-heading">Outdoor Pulse</h2><p>{local ? "Your local sky" : "Singapore’s sky"}, translated for your Purun</p></div>
        <span className="outdoor-chip"><Leaf size={13} aria-hidden="true" /> {pulse?.location ?? "Singapore"}</span>
      </header>
      <div aria-live="polite">
        {awaitingChoice ? <p className="outdoor-unavailable">{waitingMessage}</p> : loading ? (
          <div className="outdoor-loading" role="status">
            <span className="sr-only">Checking the sky…</span>
            <div className="outdoor-skeleton-grid" aria-hidden="true"><span /><span /><span /></div>
            <div className="outdoor-skeleton-cue" aria-hidden="true" />
          </div>
        ) : available ? (
          <>
            <dl className="outdoor-facts">
              <div><dt><CloudRain size={17} aria-hidden="true" /> Sky</dt><dd>{pulse.weather.temperatureC}°C <span>{pulse.weather.label}</span></dd></div>
              <div><dt><Wind size={17} aria-hidden="true" /> Outdoor PM2.5</dt><dd>{pulse.pm25.value === null ? "—" : <>{pulse.pm25.value} <small>µg/m³</small></>}<span>{pulse.pm25.label}</span></dd></div>
              <div><dt><Sun size={17} aria-hidden="true" /> Sunlight</dt><dd className="outdoor-window">{pulse.sunlight.bestWindow}<span>{pulse.sunlight.label}</span></dd></div>
            </dl>
            <div className={`outdoor-cue outdoor-cue-${pulse.careCue.tone}`}>
              <Sparkles size={18} aria-hidden="true" />
              <div><h3>{pulse.careCue.title}</h3><p>{pulse.careCue.message}</p></div>
            </div>
          </>
        ) : <p className="outdoor-unavailable"><Sun size={22} aria-hidden="true" />{unavailableMessage}</p>}
      </div>
      <p className="outdoor-honesty">{honesty}</p>
      {available && <footer className="outdoor-attribution">
        <p>{pulse.attribution}</p>
        <p>As of <time dateTime={pulse.updatedAt}>{new Intl.DateTimeFormat("en-SG", { timeZone: pulse.timeZone, timeZoneName: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(pulse.updatedAt))}</time> · <a href="https://api-open.data.gov.sg/v2/real-time/api/pm25">NEA data</a> · <a href="https://open-meteo.com/">Open-Meteo</a></p>
      </footer>}
    </section>
  );
}
