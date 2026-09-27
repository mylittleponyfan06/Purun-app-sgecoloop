import assert from "node:assert/strict";
import { locationMapUrls } from "../lib/location-map.ts";

const map = locationMapUrls(1.35212345, 103.81987654);
const url = new URL(map.embed);
assert.equal(url.origin, "https://www.openstreetmap.org");
assert.equal(url.searchParams.get("bbox"), "103.80,1.33,103.84,1.37");
assert.equal(url.searchParams.get("marker"), "1.35,103.82");
assert.equal(map.full, "https://www.openstreetmap.org/?mlat=1.35&mlon=103.82#map=13/1.35/103.82");
assert.ok(!JSON.stringify(map).includes("35212345"), "Raw GPS precision never reaches map URLs");
for (const [lat, lon] of [[90, 180], [-90, -180], [0, 0]]) {
  const query = new URL(locationMapUrls(lat, lon).embed).searchParams;
  const bounds = query.get("bbox").split(",").map(Number);
  const [markerLat, markerLon] = query.get("marker").split(",").map(Number);
  assert.ok(bounds[0] >= -180 && bounds[2] <= 180 && bounds[0] < bounds[2]);
  assert.ok(bounds[1] >= -85.05 && bounds[3] <= 85.05 && bounds[1] < bounds[3]);
  assert.ok(markerLon >= bounds[0] && markerLon <= bounds[2] && markerLat >= bounds[1] && markerLat <= bounds[3], "Pin stays inside the displayed area");
}
for (const [lat, lon] of [[NaN, 0], [0, Infinity], [91, 0], [0, -181]]) assert.throws(() => locationMapUrls(lat, lon), RangeError);
console.log("Location map checks passed: rounded location pin, matching external link, valid world edges and rejected invalid input.");
