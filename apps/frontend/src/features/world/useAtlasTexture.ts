"use client";
import { useEffect, useState } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import type { Feature, Geometry, Position } from "geojson";
import type { WorldItem } from "./types";
import tmdbImageLoader from "../../shared/lib/tmdbImageLoader";
import {
  countryPosterCount,
  coverCrop,
  polygonArea,
  polygonBounds,
  polygonRings,
  posterGrid,
  unwrapLongitude,
} from "./posterLayout";
type Shape = Feature<Geometry, { code: string }>;

function polygonPath(
  ctx: CanvasRenderingContext2D,
  rings: Position[][],
  width: number,
  height: number,
  west: number,
  shift: number,
) {
  ctx.beginPath();
  rings.forEach((ring) => {
    ring.forEach(([lng, lat], index) => {
      const x = ((unwrapLongitude(lng, west) + 180) / 360) * width + shift,
        y = ((90 - lat) / 180) * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  });
}
function paintCountry(
  ctx: CanvasRenderingContext2D,
  feature: Shape,
  images: HTMLImageElement[],
  width: number,
  height: number,
) {
  const parts = polygonRings(feature.geometry);
  const area = parts.reduce((sum, rings) => sum + polygonArea(rings), 0);
  const budget = Math.min(countryPosterCount(feature.geometry), images.length);
  let imageOffset = 0;
  for (const rings of parts) {
    const bounds = polygonBounds(rings[0]);
    const count = Math.max(
      1,
      Math.round((budget * polygonArea(rings)) / Math.max(1, area)),
    );
    const firstImage = imageOffset;
    imageOffset += count;
    const latitudeScale = Math.max(
      0.1,
      Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180),
    );
    const grid = posterGrid(
      count,
      (bounds.width * latitudeScale) / bounds.height,
    );
    const left = ((bounds.west + 180) / 360) * width,
      top = ((90 - bounds.north) / 180) * height;
    const boxWidth = (bounds.width / 360) * width,
      boxHeight = (bounds.height / 180) * height;
    for (const shift of [-width, 0, width]) {
      if (left + shift > width || left + boxWidth + shift < 0) continue;
      ctx.save();
      polygonPath(ctx, rings, width, height, bounds.west, shift);
      ctx.clip("evenodd");
      let index = 0;
      for (let row = 0; row < grid.rows; row++) {
        const columns = Math.min(grid.columns, count - index);
        for (let column = 0; column < columns; column++) {
          const image = images[(firstImage + index++) % images.length];
          const w = boxWidth / columns,
            h = boxHeight / grid.rows;
          const crop = coverCrop(
            image.naturalWidth,
            image.naturalHeight,
            (w / h) * latitudeScale,
          );
          ctx.drawImage(
            image,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            left + shift + column * w,
            top + row * h,
            w + 0.5,
            h + 0.5,
          );
        }
      }
      ctx.restore();
    }
  }
}
export function useAtlasTexture(
  features: Shape[],
  posters: Record<string, WorldItem[]>,
) {
  const [state, setState] = useState<{
    texture?: CanvasTexture;
    ready: Set<string>;
    counts: Record<string, number>;
  }>({ ready: new Set(), counts: {} });
  useEffect(() => {
    if (!features.length) return;
    const width = window.innerWidth <= 800 ? 2048 : 4096,
      height = width / 2;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#091f32";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#1b3749";
    features.forEach((feature) =>
      polygonRings(feature.geometry).forEach((rings) => {
        const { west } = polygonBounds(rings[0]);
        for (const shift of [-width, 0, width]) {
          polygonPath(ctx, rings, width, height, west, shift);
          ctx.fill("evenodd");
        }
      }),
    );
    // One shared GPU texture, no per-poster materials or mipmap overhead.
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    let stopped = false,
      pending = 0;
    const ready = new Set<string>(),
      counts: Record<string, number> = {};
    const controller = new AbortController();
    const publish = () => {
      pending = 0;
      if (stopped) return;
      texture.needsUpdate = true;
      setState({ texture, ready: new Set(ready), counts: { ...counts } });
    };
    publish();
    const queue = features.filter(
      (feature) => posters[feature.properties.code]?.length,
    );
    let cursor = 0;
    async function worker() {
      while (!stopped && cursor < queue.length) {
        const feature = queue[cursor++],
          code = feature.properties.code;
        const urls = [
          ...new Set(
            posters[code]
              .map((item) => item.posterUrl)
              .filter((url): url is string =>
                Boolean(url?.startsWith("https://image.tmdb.org/t/p/")),
              ),
          ),
        ].slice(0, countryPosterCount(feature.geometry));
        const images: HTMLImageElement[] = [];
        for (const src of urls) {
          if (stopped) break;
          const image = await new Promise<HTMLImageElement | null>(
            (resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              const finish = (value: HTMLImageElement | null) => {
                clearTimeout(timeout);
                controller.signal.removeEventListener("abort", abort);
                img.onload = img.onerror = null;
                resolve(value);
              };
              const abort = () => {
                img.src = "";
                finish(null);
              };
              const timeout = window.setTimeout(abort, 12_000);
              controller.signal.addEventListener("abort", abort, {
                once: true,
              });
              img.onload = () => finish(img);
              img.onerror = () => finish(null);
              const url = new URL(tmdbImageLoader({ src, width: 185 }));
              url.searchParams.set("atlas", "1");
              img.src = url.toString();
            },
          );
          if (image) images.push(image);
        }
        if (stopped) {
          images.forEach((image) => {
            image.src = "";
          });
          return;
        }
        if (images.length) {
          paintCountry(ctx!, feature, images, width, height);
          ready.add(code);
          counts[code] = Math.min(
            countryPosterCount(feature.geometry),
            images.length,
          );
          images.forEach((image) => {
            image.src = "";
          });
          if (!pending) pending = window.setTimeout(publish, 200);
        }
      }
    }
    void Promise.all(Array.from({ length: 6 }, worker)).then(() => {
      if (pending) clearTimeout(pending);
      publish();
    });
    return () => {
      stopped = true;
      controller.abort();
      if (pending) clearTimeout(pending);
      texture.dispose();
    };
  }, [features, posters]);
  return state;
}
