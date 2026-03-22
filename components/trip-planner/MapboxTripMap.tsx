"use client";

import { useEffect, useRef } from "react";
import { AirplaneTilt, HouseLine, MapPin } from "@phosphor-icons/react";
import type { TripArtifact } from "@/lib/trip-artifact";

interface MapboxTripMapProps {
  artifact: TripArtifact;
}

export function MapboxTripMap({ artifact }: MapboxTripMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: import("mapbox-gl").Map | null = null;
    let mounted = true;

    async function setup() {
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!token || !containerRef.current || artifact.routeCoordinates.length < 2) return;

      containerRef.current.innerHTML = "";

      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = token;

      const bounds = new mapboxgl.LngLatBounds();
      artifact.mapPoints.forEach((point) => bounds.extend([point.longitude, point.latitude]));

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: artifact.routeCoordinates[0],
        zoom: 4.6,
        pitch: 58,
        bearing: 16,
        antialias: true,
      });

      map.on("load", () => {
        if (!mounted || !map) return;

        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.45 });
        map.setFog({
          color: "#141414",
          "high-color": "#1f1f1f",
          "space-color": "#0a0a0a",
          "horizon-blend": 0.08,
        });

        map.addSource("trip-route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: artifact.routeCoordinates,
            },
            properties: {},
          },
        });

        map.addLayer({
          id: "trip-route-glow",
          type: "line",
          source: "trip-route",
          paint: {
            "line-color": "#a3a3a3",
            "line-width": 14,
            "line-opacity": 0.28,
            "line-blur": 1.1,
          },
        });

        map.addLayer({
          id: "trip-route-line",
          type: "line",
          source: "trip-route",
          paint: {
            "line-color": "#d4d4d4",
            "line-width": 5,
          },
        });

        const labelLayerId = (map.getStyle().layers ?? []).find(
          (layer) => layer.type === "symbol" && typeof layer.layout?.["text-field"] !== "undefined"
        )?.id;

        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 11,
            paint: {
              "fill-extrusion-color": "#3a3a3a",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                11,
                0,
                11.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                11,
                0,
                11.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.36,
            },
          },
          labelLayerId
        );

        const mapboxglMap = map;

        artifact.mapPoints.forEach((point, index) => {
          const el = document.createElement("div");
          el.style.width = "44px";
          el.style.height = "44px";
          el.style.borderRadius = "999px";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.color = "#241b32";
          el.style.fontSize = "18px";
          el.style.fontWeight = "700";
          el.style.background = "#ffffff";
          el.style.border = "3px solid #241b32";
          el.style.boxShadow = "0 16px 30px rgba(31,23,44,0.18)";
          el.textContent = String(index + 1);
          el.title = point.label;

          new mapboxgl.Marker(el)
            .setLngLat([point.longitude, point.latitude])
            .addTo(mapboxglMap);
        });

        const syncMapSize = () => {
          mapboxglMap.resize();
          mapboxglMap.fitBounds(bounds, { padding: 72, duration: 0 });
        };

        syncMapSize();
        window.setTimeout(syncMapSize, 180);
        window.setTimeout(syncMapSize, 520);
      });
    }

    void setup();

    return () => {
      mounted = false;
      map?.remove();
    };
  }, [artifact]);

  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
  const showFallback = !hasToken || artifact.routeCoordinates.length < 2;

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#161616]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 pb-3 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">Route map</p>
          <p className="mt-1 text-sm text-white/65">{artifact.originLabel ?? "Origin"} to {artifact.destination}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <AirplaneTilt weight="fill" className="h-4 w-4 text-white/55" />
            Airport
          </span>
          <span className="inline-flex items-center gap-1.5">
            <HouseLine weight="fill" className="h-4 w-4 text-white/55" />
            Stay
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin weight="fill" className="h-4 w-4 text-white/55" />
            Route
          </span>
        </div>
      </div>

      {showFallback ? (
        <div className="flex h-[320px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_50%),linear-gradient(180deg,#1a1a1a,#111)] px-6 text-center text-sm text-white/65">
          Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` and confirm transport + stay selections to unlock the 3D trip map.
        </div>
      ) : (
        <div ref={containerRef} className="h-[320px] w-full" />
      )}
    </div>
  );
}
