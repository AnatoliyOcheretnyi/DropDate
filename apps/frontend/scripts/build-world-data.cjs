// Regenerate with node scripts/build-world-data.cjs from apps/frontend.
// Natural Earth 4.1.0 public-domain geometry, redistributed by world-atlas 2.
const fs = require("node:fs");
const path = require("node:path");
const { feature } = require("topojson-client");
const iso = require("i18n-iso-countries");
const root = path.resolve(__dirname, "..");
const names = new Intl.DisplayNames(["uk"], { type: "region" });
const overrides = {
  France: "FR",
  Norway: "NO",
  Kosovo: "XK",
  Somaliland: "SO",
  "N. Cyprus": "CY",
};
function countries(scale) {
  const topology = require("world-atlas/countries-" + scale + "m.json");
  return feature(topology, topology.objects.countries)
    .features.map((f) => {
      const code = iso.numericToAlpha2(f.id) || overrides[f.properties.name];
      return {
        ...f,
        properties: { code, name: code ? names.of(code) : f.properties.name },
      };
    })
    .filter((f) => f.properties.code);
}
// The upstream de-facto map assigns Crimea to Russia. Display it as part of
// Ukraine: transfer the existing peninsula polygon without redrawing coasts.
function internationalBorders(features) {
  const ru = features.find((f) => f.properties.code === "RU"),
    ua = features.find((f) => f.properties.code === "UA");
  if (ru?.geometry.type === "MultiPolygon" && ua) {
    const crimea = ru.geometry.coordinates.filter((p) =>
      p[0].every(([lng, lat]) => lng > 32 && lng < 37 && lat > 44 && lat < 47),
    );
    ru.geometry.coordinates = ru.geometry.coordinates.filter(
      (p) => !crimea.includes(p),
    );
    const ukrainian =
      ua.geometry.type === "Polygon"
        ? [ua.geometry.coordinates]
        : ua.geometry.coordinates;
    ua.geometry = {
      type: "MultiPolygon",
      coordinates: [...ukrainian, ...crimea],
    };
  }
  return features;
}
const low = internationalBorders(countries(110)),
  high = internationalBorders(countries(50));
const focus = {
  US: [39, -99],
  FR: [47, 2],
  RU: [60, 95],
  NO: [62, 9],
  NZ: [-41, 173],
  CA: [57, -105],
  AU: [-25, 134],
  UA: [49, 32],
  JP: [37, 138],
  KR: [36, 128],
};
const catalog = Array.from(
  new Set(Object.keys(iso.getAlpha2Codes()).concat("XK")),
)
  .map((code) => {
    const f =
      high.find((f) => f.properties.code === code) ||
      low.find((f) => f.properties.code === code);
    let lat = 0,
      lng = 0;
    if (f) {
      const polygons =
        f.geometry.type === "Polygon"
          ? [f.geometry.coordinates]
          : f.geometry.coordinates;
      const ring = polygons
        .map((p) => p[0])
        .sort((a, b) => b.length - a.length)[0];
      let x = 0,
        y = 0,
        z = 0;
      for (const [lon, latitude] of ring) {
        const a = (latitude * Math.PI) / 180,
          b = (lon * Math.PI) / 180;
        x += Math.cos(a) * Math.cos(b);
        y += Math.cos(a) * Math.sin(b);
        z += Math.sin(a);
      }
      lng = (Math.atan2(y, x) * 180) / Math.PI;
      lat = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
    }
    if (focus[code]) [lat, lng] = focus[code];
    return {
      code,
      name: names.of(code),
      lat: +lat.toFixed(3),
      lng: +lng.toFixed(3),
      mapped: !!f,
      polygon: low.some((f) => f.properties.code === code),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "uk"));
fs.mkdirSync(path.join(root, "public/data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "public/data/world-countries.json"),
  JSON.stringify({ type: "FeatureCollection", features: low }),
);
fs.writeFileSync(
  path.join(root, "src/features/world/countries.json"),
  JSON.stringify(catalog, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(root, "../backend/internal/discoverydata/countries.json"),
  JSON.stringify(catalog) + "\n",
);
console.log(
  "Generated",
  low.length,
  "polygons and",
  catalog.length,
  "country entries",
);
