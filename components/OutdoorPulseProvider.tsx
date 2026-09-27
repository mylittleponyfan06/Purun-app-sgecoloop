"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink, Map, MapPin } from "lucide-react";
import type { OutdoorPulse } from "@/lib/types";
import { locationMapUrls } from "@/lib/location-map";
import LeafLoader from "./LeafLoader";
import LocationMapFrame from "./LocationMapFrame";

type Coordinates = { latitude: number; longitude: number };
const OutdoorContext = createContext<{ pulse: OutdoorPulse | null | undefined; awaitingChoice: boolean }>({ pulse: undefined, awaitingChoice: true });
export const useOutdoorPulse = () => useContext(OutdoorContext);

export default function OutdoorPulseProvider({ children }: { children: ReactNode }) {
  // Keep the choice in memory for this visit, without saving device coordinates.
  const [coordinates, setCoordinates] = useState<Coordinates | null>();
  const [pulse, setPulse] = useState<OutdoorPulse | null>();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [showMap, setShowMap] = useState(false);
  const locationRequest = useRef(0);
  const mapSection = useRef<HTMLElement>(null);
  const map = coordinates ? locationMapUrls(coordinates.latitude, coordinates.longitude) : null;

  useEffect(() => {
    if (showMap) mapSection.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [showMap]);

  useEffect(() => {
    if (!locating) return;
    // Browser geolocation timeouts can exclude time spent waiting for permission.
    const timeout = window.setTimeout(() => useSingapore("Location is taking longer than expected. Using general Singapore context."), 20000);
    return () => window.clearTimeout(timeout);
  }, [locating]);

  useEffect(() => () => { locationRequest.current++; }, []);

  useEffect(() => {
    if (coordinates === undefined) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let ignore = false;
    const query = coordinates ? `?${new URLSearchParams({ latitude: String(coordinates.latitude), longitude: String(coordinates.longitude) })}` : "";
    fetch(`/api/outdoor-pulse${query}`, { signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as OutdoorPulse : null)
      .catch(() => null)
      .then((value) => { if (!ignore) setPulse(value); })
      .finally(() => window.clearTimeout(timeout));
    return () => { ignore = true; controller.abort(); window.clearTimeout(timeout); };
  }, [coordinates]);

  function useSingapore(message = "Using general Singapore context.") {
    locationRequest.current++;
    setShowMap(false);
    setLocating(false);
    setPulse(undefined);
    setNotice(message);
    setCoordinates(null);
  }

  function locate() {
    const request = ++locationRequest.current;
    setShowMap(false);
    setLocating(true);
    setNotice("");
    const fallback = () => {
      if (request === locationRequest.current) useSingapore("Location wasn’t available. Using general Singapore context.");
    };
    if (!window.isSecureContext || !navigator.geolocation) { fallback(); return; }
    try {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        if (request !== locationRequest.current) return;
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude) || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) { fallback(); return; }
        setCoordinates({ latitude: Number(coords.latitude.toFixed(2)), longitude: Number(coords.longitude.toFixed(2)) });
        setShowMap(true);
        setLocating(false);
        setNotice("Using your approximate location for outdoor context.");
      }, fallback, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    } catch { fallback(); }
  }

  function changeLocation() {
    locationRequest.current++;
    setShowMap(false);
    setCoordinates(undefined);
    setPulse(undefined);
    setNotice("");
    setLocating(false);
  }

  return (
    <OutdoorContext.Provider value={{ pulse, awaitingChoice: coordinates === undefined }}>
      <section className="location-choice" aria-label="Outdoor location preference">
        <MapPin size={21} aria-hidden="true" />
        <div className="location-copy">
          {locating ? <LeafLoader compact label="Finding your area…" detail="Allow location in your browser if prompted. We’re waiting for an approximate position; you can use Singapore instead." /> : coordinates === undefined ? <>
            <h2>Bring your local sky into Purun Loop</h2>
            <p>Allow your approximate location for nearby weather and Singapore regional air quality. Rounded coordinates are shared with Open-Meteo and OpenStreetMap to show your area. Or continue with general Singapore data.</p>
          </> : null}
          <p role="status">{notice}</p>
        </div>
        <div className="location-actions">
          {coordinates === undefined ? <>
            <button type="button" onClick={locate} disabled={locating} aria-busy={locating}>{locating ? "Locating…" : "Use my location"}</button>
            <button type="button" className="location-secondary" onClick={() => useSingapore()}>Use Singapore</button>
          </> : <>
            {map && <button type="button" aria-expanded={showMap} aria-controls="location-area-map" onClick={() => setShowMap((visible) => !visible)}><Map size={16} aria-hidden="true" /> {showMap ? "Hide area" : "View area"}</button>}
            <button type="button" className="location-secondary" onClick={changeLocation}>Location options</button>
          </>}
        </div>
      </section>
      {map && <section ref={mapSection} id="location-area-map" className="location-area-map" aria-labelledby="location-area-title" hidden={!showMap}>
        {showMap && <>
          <header><div><h2 id="location-area-title">Your patch of the world</h2><p>The pin marks your approximate location used for outdoor context.</p></div><span><MapPin size={14} aria-hidden="true" /> Approximate location</span></header>
          <LocationMapFrame key={map.embed} src={map.embed} />
          <footer>
            <p>The map opens around your detected area. Coordinates are rounded to two decimal places before sharing with OpenStreetMap, so the pin may be a few streets away from your exact position.</p>
            <a href={map.full} target="_blank" rel="noopener noreferrer">Map not loading? Open in OpenStreetMap <ExternalLink size={14} aria-hidden="true" /></a>
            <p>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></p>
          </footer>
        </>}
      </section>}
      {children}
    </OutdoorContext.Provider>
  );
}
