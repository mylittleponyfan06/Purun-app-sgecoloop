"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import type { OutdoorPulse } from "@/lib/types";

type Coordinates = { latitude: number; longitude: number };
const OutdoorContext = createContext<{ pulse: OutdoorPulse | null | undefined; awaitingChoice: boolean }>({ pulse: undefined, awaitingChoice: true });
export const useOutdoorPulse = () => useContext(OutdoorContext);

export default function OutdoorPulseProvider({ children }: { children: ReactNode }) {
  // Keep the choice in memory for this visit, without saving device coordinates.
  const [coordinates, setCoordinates] = useState<Coordinates | null>();
  const [pulse, setPulse] = useState<OutdoorPulse | null>();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const locationRequest = useRef(0);

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
    setLocating(false);
    setPulse(undefined);
    setNotice(message);
    setCoordinates(null);
  }

  function locate() {
    const request = ++locationRequest.current;
    setLocating(true);
    setNotice("Waiting for location permission…");
    const fallback = () => {
      if (request === locationRequest.current) useSingapore("Location wasn’t available. Using general Singapore context.");
    };
    if (!window.isSecureContext || !navigator.geolocation) { fallback(); return; }
    try {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        if (request !== locationRequest.current) return;
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) { fallback(); return; }
        setCoordinates({ latitude: Number(coords.latitude.toFixed(2)), longitude: Number(coords.longitude.toFixed(2)) });
        setLocating(false);
        setNotice("Using your approximate location for outdoor context.");
      }, fallback, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    } catch { fallback(); }
  }

  function changeLocation() {
    locationRequest.current++;
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
          {coordinates === undefined ? <>
            <h2>Bring your local sky into Purun Care</h2>
            <p>Allow your approximate location for nearby weather and Singapore regional air quality. Weather coordinates are shared with Open-Meteo. Or continue with general Singapore data.</p>
          </> : null}
          <p role="status">{notice}</p>
        </div>
        <div className="location-actions">
          {coordinates === undefined ? <>
            <button type="button" onClick={locate} disabled={locating}>Use my location</button>
            <button type="button" className="location-secondary" onClick={() => useSingapore()}>Use Singapore</button>
          </> : <button type="button" className="location-secondary" onClick={changeLocation}>Location options</button>}
        </div>
      </section>
      {children}
    </OutdoorContext.Provider>
  );
}
