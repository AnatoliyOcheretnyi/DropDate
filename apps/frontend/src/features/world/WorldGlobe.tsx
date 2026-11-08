"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial, type PerspectiveCamera } from "three";
import type { Feature, Geometry } from "geojson";
import type { Country } from "./types";
import catalog from "./countries.json";

type Shape = Feature<Geometry, { code: string; name: string }>;
type Props = {
  active: boolean;
  country: Country;
  visited: Record<string, number>;
  onSelect: (code: string) => void;
  onUnavailable: () => void;
};
const smallCountries = catalog.filter((c) => c.mapped && !c.polygon);
// A new framing baseline; subsequent visits still preserve manual camera changes.
const CAMERA_KEY = "dropdate:world-camera:full-height";

function WorldGlobe({
  active,
  country,
  visited,
  onSelect,
  onUnavailable,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 700, height: 570 });
  const [features, setFeatures] = useState<Shape[]>([]);
  const borders = useMemo(
    () =>
      features.flatMap((feature) => {
        const geometry = feature.geometry;
        const polygons =
          geometry.type === "Polygon"
            ? [geometry.coordinates]
            : geometry.type === "MultiPolygon"
              ? geometry.coordinates
              : [];
        return polygons.flatMap((rings) =>
          rings.map((points) => ({ code: feature.properties.code, points })),
        );
      }),
    [features],
  );
  const [hover, setHover] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const lastCountry = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const view = useRef<{ lat: number; lng: number; altitude: number } | null>(
    null,
  );
  const material = useMemo(
    () => new MeshPhongMaterial({ color: "#091f32", shininess: 8 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/world-countries.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setFeatures(data.features))
      .catch((e) => {
        if (e.name !== "AbortError") onUnavailable();
      });
    return () => controller.abort();
  }, [onUnavailable]);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    const node = host.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.max(1, Math.floor(entry.contentRect.height)),
      }),
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);
  const setup = useCallback(() => {
    const g = globe.current;
    if (!g) return;
    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const controls = g.controls();
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.enablePan = false;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.7;
    controls.minDistance = 130;
    controls.maxDistance = 550;
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !globe.current) return;
    if (lastCountry.current === null) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(CAMERA_KEY) || "null");
        if (
          saved?.country === country.code &&
          ["lat", "lng", "altitude"].every((key) =>
            Number.isFinite(saved.view?.[key]),
          )
        ) {
          globe.current.pointOfView(saved.view, 0);
          lastCountry.current = country.code;
          return;
        }
      } catch {}
    }
    if (lastCountry.current === country.code) return;
    lastCountry.current = country.code;
    const camera = globe.current.camera() as PerspectiveCamera;
    const width = host.current?.clientWidth || 700;
    const height = host.current?.clientHeight || 570;
    // Fit the sphere itself to 99% of the available height, limited by width
    // on narrow screens. Perspective projection otherwise leaves large gaps.
    const fill = 0.99 * Math.min(1, width / height);
    const halfFov = (camera.fov * Math.PI) / 360;
    const altitude = Math.sqrt(1 + (1 / (fill * Math.tan(halfFov))) ** 2) - 1;
    globe.current.pointOfView(
      { lat: country.lat, lng: country.lng, altitude },
      reduceMotion ? 0 : 850,
    );
  }, [country, ready, reduceMotion]);
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (view.current) {
        try {
          sessionStorage.setItem(
            CAMERA_KEY,
            JSON.stringify({
              country: lastCountry.current,
              view: view.current,
            }),
          );
        } catch {}
      }
    },
    [],
  );
  useEffect(() => {
    if (!ready) return;
    const g = globe.current,
      node = host.current;
    if (!g || !node) return;
    let visible = true;
    const update = () => {
      if (active && visible && !document.hidden) g.resumeAnimation();
      else g.pauseAnimation();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(node);
    update();
    document.addEventListener("visibilitychange", update);
    const canvas = g.renderer().domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      canvas.removeEventListener("webglcontextlost", lost);
    };
  }, [ready, active, onUnavailable]);
  const code = (obj: object) => (obj as Shape).properties.code;
  return (
    <div
      className="world-globe"
      ref={host}
      role="group"
      aria-label="Інтерактивний глобус. Обери країну на карті або в списку поруч."
    >
      <Globe
        ref={globe}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        showAtmosphere
        atmosphereColor="#5bdcbd"
        atmosphereAltitude={0.12}
        globeCurvatureResolution={6}
        showGraticules
        polygonsData={features}
        polygonCapColor={(obj) =>
          code(obj) === country.code
            ? "#73f0c1"
            : code(obj) === hover
              ? "#478d90"
              : visited[code(obj)]
                ? "#255e5d"
                : "#1b3749"
        }
        polygonSideColor={() => "#102a38"}
        polygonAltitude={0.005}
        polygonCapCurvatureResolution={6}
        polygonsTransitionDuration={0}
        polygonLabel={(obj) => (obj as Shape).properties.name}
        onPolygonHover={(obj) => setHover(obj ? code(obj) : null)}
        onPolygonClick={(obj) => onSelect(code(obj))}
        pathsData={borders}
        pathPoints="points"
        pathPointLat={(point: number[]) => point[1]}
        pathPointLng={(point: number[]) => point[0]}
        // Borders sit above both normal and selected fills, so changes to the
        // passport colours cannot obscure the country boundaries.
        pathPointAlt={0.007}
        pathColor={(border: object) =>
          (border as { code: string }).code === country.code
            ? "#194b50"
            : "#83a9b5"
        }
        pathStroke={1.2}
        pathResolution={1}
        pathTransitionDuration={0}
        onPathClick={(border) => onSelect((border as { code: string }).code)}
        pointsData={smallCountries}
        pointLat="lat"
        pointLng="lng"
        pointRadius={0.25}
        pointAltitude={0.02}
        pointColor={() => "#73f0c1"}
        pointLabel="name"
        onPointClick={(obj) => onSelect((obj as Country).code)}
        animateIn={false}
        onGlobeReady={setup}
        onZoom={(pov) => {
          view.current = pov;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            try {
              sessionStorage.setItem(
                CAMERA_KEY,
                JSON.stringify({ country: lastCountry.current, view: pov }),
              );
            } catch {}
          }, 200);
        }}
      />
      <div className="world-globe__hint">
        Тягни, щоб обертати · Збільшуй колесом або двома пальцями
      </div>
      <div className="world-globe__zoom">
        <button
          aria-label="Наблизити глобус"
          onClick={() => {
            const g = globe.current;
            if (g) {
              const p = g.pointOfView();
              g.pointOfView(
                { ...p, altitude: Math.max(0.35, p.altitude * 0.75) },
                reduceMotion ? 0 : 250,
              );
            }
          }}
        >
          ＋
        </button>
        <button
          aria-label="Віддалити глобус"
          onClick={() => {
            const g = globe.current;
            if (g) {
              const p = g.pointOfView();
              g.pointOfView(
                { ...p, altitude: Math.min(4, p.altitude * 1.3) },
                reduceMotion ? 0 : 250,
              );
            }
          }}
        >
          −
        </button>
      </div>
    </div>
  );
}
export default memo(WorldGlobe);
