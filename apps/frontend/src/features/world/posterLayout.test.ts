import { describe, expect, it } from "vitest";
import type { Geometry } from "geojson";
import world from "../../../public/data/world-countries.json";
import {
  countryPosterCount,
  polygonBounds,
  posterGrid,
  coverCrop,
  unwrapLongitude,
} from "./posterLayout";

describe("geographic poster mosaic", () => {
  it.each([
    ["RU", 24],
    ["CA", 8],
    ["US", 8],
    ["CN", 8],
    ["AU", 8],
    ["BR", 8],
    ["IN", 6],
    ["UA", 3],
    ["JP", 2],
    ["CH", 1],
  ])("assigns %s its size tier", (code, count) => {
    const geometry = world.features.find(
      (feature) => feature.properties.code === code,
    )!.geometry as Geometry;
    expect(countryPosterCount(geometry)).toBe(count);
  });
  it("keeps an antimeridian country continuous rather than 358 degrees wide", () => {
    const bounds = polygonBounds([
      [179, 10],
      [-179, 10],
      [-179, 12],
      [179, 12],
      [179, 10],
    ]);
    expect(bounds.width).toBe(2);
    expect(unwrapLongitude(-179, bounds.west)).toBe(181);
  });
  it("uses several columns for wide countries and rows for long narrow ones", () => {
    expect(posterGrid(24, 4).columns).toBeGreaterThanOrEqual(8);
    expect(posterGrid(3, 0.2)).toEqual({ columns: 1, rows: 3 });
  });
  it("crops each tile without stretching the original poster", () => {
    const crop = coverCrop(342, 513, 1.5);
    expect(crop.width / crop.height).toBeCloseTo(1.5);
    expect(crop.x + crop.width).toBeLessThanOrEqual(342);
    expect(crop.y + crop.height).toBeLessThanOrEqual(513);
  });
});
