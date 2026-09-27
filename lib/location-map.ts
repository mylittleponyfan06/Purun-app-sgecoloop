/** Centre the neighbourhood view and pin on the same rounded location, never raw GPS coordinates. */
export function locationMapUrls(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new RangeError("Invalid map location");
  }
  // Keep within the map's Mercator coverage, including locations near the poles.
  const lat = Math.max(-85, Math.min(85, Number(latitude.toFixed(2))));
  const lon = Number(longitude.toFixed(2));
  const bbox = [Math.max(-180, lon - 0.02), lat - 0.02, Math.min(180, lon + 0.02), lat + 0.02]
    .map((value) => value.toFixed(2)).join(",");
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({ bbox, layer: "mapnik", marker: `${lat.toFixed(2)},${lon.toFixed(2)}` })}`,
    full: `https://www.openstreetmap.org/?${new URLSearchParams({ mlat: lat.toFixed(2), mlon: lon.toFixed(2) })}#map=13/${lat.toFixed(2)}/${lon.toFixed(2)}`,
  };
}
