import { useEffect, type MutableRefObject } from "react";
import type { GeoJsonObject } from "geojson";
import { geoJSON as leafletGeoJson, type Map as LeafletMap } from "leaflet";

import type { LocalityFeature } from "@/game/types";

type Args = {
  showCityList: boolean;
  setShowCityList: (value: boolean) => void;
  setCitySearch: (value: string) => void;
  mapRef: MutableRefObject<LeafletMap | null>;
  leftScreen: "home" | "play" | "end";
  bestMatchedCityId: string | null;
  featureIndex: Map<string, LocalityFeature>;
};

export function useCityListMapEffects({
  showCityList,
  setShowCityList,
  setCitySearch,
  mapRef,
  leftScreen,
  bestMatchedCityId,
  featureIndex,
}: Args) {
  useEffect(() => {
    if (!showCityList) {
      setCitySearch("");
    }
  }, [setCitySearch, showCityList]);

  useEffect(() => {
    if (!showCityList) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCityList(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setShowCityList, showCityList]);

  useEffect(() => {
    mapRef.current?.invalidateSize();
  }, [mapRef, showCityList]);

  useEffect(() => {
    if (leftScreen !== "home" || !showCityList || !bestMatchedCityId) return;
    const feature = featureIndex.get(bestMatchedCityId);
    if (!feature || !mapRef.current) return;

    const bounds = leafletGeoJson(feature as unknown as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds.pad(1.1), { animate: true, duration: 0.7 });
    }
  }, [bestMatchedCityId, featureIndex, leftScreen, mapRef, showCityList]);
}

