import type { Geometry, Position } from "geojson";
const RAD = Math.PI / 180;
const wrap = (value: number) => ((value % 360) + 360) % 360;
export function polygonRings(geometry: Geometry): Position[][][] {
  return geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];
}
function ringArea(ring: Position[]) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i],
      b = ring[i + 1];
    sum +=
      (wrap(b[0] - a[0] + 180) - 180) *
      RAD *
      (2 + Math.sin(a[1] * RAD) + Math.sin(b[1] * RAD));
  }
  return Math.abs((sum * 6371.0088 ** 2) / 2);
}
export function polygonArea(rings: Position[][]) {
  return Math.max(
    0,
    ringArea(rings[0]) -
      rings.slice(1).reduce((sum, ring) => sum + ringArea(ring), 0),
  );
}
export function countryPosterCount(geometry: Geometry) {
  const area = polygonRings(geometry).reduce(
    (sum, rings) => sum + polygonArea(rings),
    0,
  );
  if (area < 100_000) return 1;
  if (area < 500_000) return 2;
  if (area < 1_500_000) return 3;
  if (area < 3_000_000) return 4;
  if (area < 6_000_000) return 6;
  if (area < 10_000_000) return 8;
  return 24;
}
// Shortest circular interval, so crossing ±180° does not stretch Russia/Fiji.
export function polygonBounds(ring: Position[]) {
  const longitudes = [...new Set(ring.map(([lng]) => wrap(lng)))].sort(
    (a, b) => a - b,
  );
  let gap = -1,
    start = 0;
  longitudes.forEach((lng, index) => {
    const next =
      longitudes[(index + 1) % longitudes.length] +
      (index === longitudes.length - 1 ? 360 : 0);
    if (next - lng > gap) {
      gap = next - lng;
      start = next % 360;
    }
  });
  const south = Math.min(...ring.map((p) => p[1])),
    north = Math.max(...ring.map((p) => p[1]));
  return {
    west: start > 180 ? start - 360 : start,
    south,
    north,
    width: Math.max(0.001, 360 - gap),
    height: Math.max(0.001, north - south),
  };
}
export function unwrapLongitude(lng: number, west: number) {
  const offset = wrap(lng - west);
  // Bounds normalization can move the western edge a few floating-point bits
  // east. Do not turn that tiny negative delta into a full trip around Earth:
  // it would make the texture clipping path cut across land and spill into sea.
  return west + (360 - offset < 1e-9 ? 0 : offset);
}
export function posterGrid(count: number, aspect: number) {
  let best = { columns: 1, rows: count },
    score = Infinity;
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const cost =
      Math.abs(Math.log((aspect * rows) / columns / (2 / 3))) +
      (columns * rows - count) / count;
    if (cost < score) {
      score = cost;
      best = { columns, rows };
    }
  }
  return best;
}
export function coverCrop(width: number, height: number, aspect: number) {
  const cropWidth = width / height > aspect ? height * aspect : width;
  const cropHeight = width / height > aspect ? height : width / aspect;
  return {
    x: (width - cropWidth) / 2,
    y: (height - cropHeight) * 0.4,
    width: cropWidth,
    height: cropHeight,
  };
}
