import { useEffect, type MutableRefObject } from "react";
import type { GeoJsonObject } from "geojson";
import type { Map as LeafletMap } from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { motion } from "motion/react";

import { Card, CardContent } from "@/components/ui/card";
import { TOTAL_QUESTIONS, cardMotion } from "@/game/constants";
import type { LocalityFeature, SessionState } from "@/game/types";

type MapSectionProps = {
  showStats: boolean;
  showHoverTooltips: boolean;
  session: SessionState;
  roundProgressPct: number;
  mapCenter: [number, number];
  mapZoom: number;
  onMapMove: (payload: { center: [number, number]; zoom: number }) => void;
  mapRef: MutableRefObject<LeafletMap | null>;
  showCityList: boolean;
  geoJsonKey: string;
  mapDataset: GeoJsonObject;
  styleFeature: (feature?: LocalityFeature) => Record<string, unknown>;
  onCityClick: (featureId: string) => void;
};

function MapEvents({
  onMove,
}: {
  onMove: (payload: { center: [number, number]; zoom: number }) => void;
}) {
  useMapEvents({
    moveend(e) {
      const center = e.target.getCenter();
      onMove({ center: [center.lat, center.lng], zoom: e.target.getZoom() });
    },
  });
  return null;
}

function MapResizeController({ trigger }: { trigger: unknown }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.invalidateSize();
  }, [map, trigger]);
  return null;
}

export function MapSection({
  showStats,
  showHoverTooltips,
  session,
  roundProgressPct,
  mapCenter,
  mapZoom,
  onMapMove,
  mapRef,
  showCityList,
  geoJsonKey,
  mapDataset,
  styleFeature,
  onCityClick,
}: MapSectionProps) {
  return (
    <motion.section variants={cardMotion} className="relative min-h-0 overflow-hidden rounded-3xl border border-transparent bg-transparent">
      {showStats ? (
        <div className="absolute right-3 top-3 z-[500] flex gap-2">
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="min-w-[88px] text-center">
              <CardContent className="p-2">
                <p className="text-xs text-ink/70">ניקוד</p>
                <p className="text-2xl font-bold text-primary">{session.score}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="min-w-[138px]">
              <CardContent className="p-2">
                <div className="flex items-center justify-between text-xs text-ink/70">
                  <span>התקדמות</span>
                  <span className="font-semibold text-primary">{roundProgressPct}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/20">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: `${roundProgressPct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="mt-1 text-center text-xs font-medium text-ink/80">
                  סיבוב {session.currentIndex} מתוך {TOTAL_QUESTIONS}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : null}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={6}
        maxZoom={13}
        className="h-full min-h-0"
        ref={mapRef}
      >
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onMove={onMapMove} />
        <MapResizeController trigger={showCityList} />
        <GeoJSON
          key={geoJsonKey}
          data={mapDataset}
          style={(feature) => styleFeature(feature as LocalityFeature)}
          onEachFeature={(feature, layer) => {
            const typedFeature = feature as LocalityFeature;
            const cityId = typedFeature.properties.id;
            layer.on("click", () => onCityClick(cityId));
            if (showHoverTooltips) {
              layer.bindTooltip(typedFeature.properties.name_he, {
                sticky: true,
                direction: "auto",
                offset: [16, 16],
                className: "city-hover-tooltip",
              });
            }

            const isWrongSelection =
              session.status === "locked" &&
              session.selectedFeatureId !== null &&
              session.currentTargetId !== null &&
              session.selectedFeatureId !== session.currentTargetId;

            if (isWrongSelection && (cityId === session.selectedFeatureId || cityId === session.currentTargetId)) {
              const isClickedCity = cityId === session.selectedFeatureId;
              const labelPrefix = isClickedCity ? "הבחירה שלכם" : "העיר הנכונה";
              layer.bindTooltip(`${labelPrefix}: ${typedFeature.properties.name_he}`, {
                permanent: true,
                direction: "top",
                sticky: false,
                offset: [0, -10],
                opacity: 1,
                className: isClickedCity ? "city-result-label-tooltip city-result-label-wrong" : "city-result-label-tooltip city-result-label-correct",
              });
              if ("getBounds" in layer && typeof layer.getBounds === "function") {
                const center = layer.getBounds().getCenter();
                layer.openTooltip(center);
              }
            }
          }}
        />
      </MapContainer>
    </motion.section>
  );
}
