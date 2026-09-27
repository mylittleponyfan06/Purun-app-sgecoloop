"use client";

import { useEffect, useState } from "react";
import LeafLoader from "./LeafLoader";

export default function LocationMapFrame({ src }: { src: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "slow">("loading");
  useEffect(() => {
    if (status !== "loading") return;
    const timeout = window.setTimeout(() => setStatus("slow"), 12000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  return <>
    <div className="location-map-frame" aria-busy={status === "loading"}>
      <iframe src={src} title="Map of your approximate area from OpenStreetMap" referrerPolicy="no-referrer" onLoad={() => setStatus("ready")} onError={() => setStatus("slow")} />
      {status === "loading" && <div className="location-map-loading"><LeafLoader label="Unfolding your area…" detail="Loading the neighbourhood map." /></div>}
    </div>
    {status === "slow" && <p className="location-map-slow" role="status">The map is taking a little longer. You can keep using Purun Loop or open the map using the link below.</p>}
  </>;
}
