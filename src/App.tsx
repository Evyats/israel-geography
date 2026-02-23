import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { GeoJsonObject } from "geojson";
import { geoJSON as leafletGeoJson, type Map as LeafletMap } from "leaflet";
import { motion } from "motion/react";

import { MapSection } from "@/components/game/MapSection";
import { SidebarPanel } from "@/components/game/SidebarPanel";
import { INITIAL_CENTER, INITIAL_ZOOM, containerMotion } from "@/game/constants";
import { colorFromIndex } from "@/game/map-coloring";
import type { LocalityFeature } from "@/game/types";
import { useGameData } from "@/hooks/useGameData";
import { useGameSession } from "@/hooks/useGameSession";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute("lang", "he");
    document.documentElement.setAttribute("dir", "rtl");
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(INITIAL_CENTER);
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM);

  const mapRef = useRef<LeafletMap | null>(null);

  const {
    settings,
    setSettings,
    warningText,
    citySearch,
    setCitySearch,
    bestMatchedCityId,
    displayedCityEntries,
    cityEntriesForCurrentSettings,
    currentPool,
    startDisabled,
    visibleDataset,
    featureIndex,
    fullFeatureIndex,
    featureCenterById,
    runtimeColorById,
    activeDatasetKey,
    activeDataset,
  } = useGameData();

  const {
    session,
    feedbackText,
    feedbackTone,
    showContinueHint,
    questionText,
    leftScreen,
    currentTargetName,
    onStartGame,
    handleCityClick,
    continueAfterAnswer,
    onStopGame,
    goToHomeScreen,
    onReplayCurrentSettings,
  } = useGameSession({ currentPool, fullFeatureIndex, featureCenterById });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

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
  }, [showCityList]);

  useEffect(() => {
    mapRef.current?.invalidateSize();
  }, [showCityList]);

  useEffect(() => {
    if (leftScreen !== "home" || !showCityList || !bestMatchedCityId) return;
    const feature = featureIndex.get(bestMatchedCityId);
    if (!feature || !mapRef.current) return;

    const bounds = leafletGeoJson(feature as unknown as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds.pad(1.1), { animate: true, duration: 0.7 });
    }
  }, [bestMatchedCityId, featureIndex, leftScreen, showCityList]);

  useEffect(() => {
    window.render_game_to_text = () => {
      const target = session.currentTargetId ? fullFeatureIndex.get(session.currentTargetId) : null;
      return JSON.stringify({
        coordinate_system: "EPSG:4326, lat increases north, lon increases east",
        mode: session.status,
        screen: leftScreen,
        settings,
        session: {
          totalQuestions: session.totalQuestions,
          currentIndex: session.currentIndex,
          score: session.score,
          currentTargetId: session.currentTargetId,
          currentTargetName: target?.properties.name_he ?? null,
          askedIds: session.askedIds,
          selectedFeatureId: session.selectedFeatureId,
        },
        map: {
          zoom: mapZoom,
          center: { lat: mapCenter[0], lng: mapCenter[1] },
          visibleCount: featureIndex.size,
        },
      });
    };

    window.advanceTime = (ms: number) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, Math.max(0, ms));
      });

    return () => {
      window.render_game_to_text = undefined;
      window.advanceTime = undefined;
    };
  }, [featureIndex, fullFeatureIndex, leftScreen, mapCenter, mapZoom, session, settings]);

  const styleFeature = useCallback(
    (feature?: LocalityFeature) => {
      if (!feature) return {};
      const id = feature.properties.id;
      const runtimeColor = runtimeColorById.get(id);
      const colorSeed = typeof runtimeColor === "number" ? runtimeColor : Number(feature.properties.color_index ?? 0);

      const base = {
        color: "#2a2a2a",
        weight: 1.6,
        fillColor: colorFromIndex(colorSeed),
        fillOpacity: 0.82,
        className: "",
      };

      const isLocked = session.status === "locked";
      const isTarget = session.currentTargetId === id;
      const isSelected = session.selectedFeatureId === id;
      const isCorrectSelection = session.currentTargetId === session.selectedFeatureId;

      if (isLocked && isTarget && isCorrectSelection) {
        return { ...base, color: "#15b86a", weight: 2.6, fillOpacity: 0.97, className: "city-hit-correct" };
      }
      if (isLocked && isTarget && !isCorrectSelection) {
        return { ...base, color: "#16a34a", weight: 2.6, fillOpacity: 0.96, className: "city-target-correct" };
      }
      if (isLocked && isSelected && !isCorrectSelection) {
        return { ...base, color: "#e23b3b", weight: 2.6, fillOpacity: 0.96, className: "city-hit-wrong" };
      }
      if (leftScreen === "home" && showCityList && bestMatchedCityId === id) {
        return { ...base, color: "#f59e0b", weight: 3, fillOpacity: 0.96, className: "city-search-highlight" };
      }
      return base;
    },
    [bestMatchedCityId, leftScreen, runtimeColorById, session.currentTargetId, session.selectedFeatureId, session.status, showCityList]
  );

  const mapDataset = activeDataset
    ? (visibleDataset as unknown as GeoJsonObject)
    : ({ type: "FeatureCollection", features: [] } as GeoJsonObject);
  const roundProgressPct = Math.max(0, Math.min(100, Math.round((session.currentIndex / session.totalQuestions) * 100)));

  return (
    <motion.div
      dir="rtl"
      className="h-screen overflow-hidden border border-white/15 p-10 text-ink transition-colors duration-[2600ms]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClickCapture={(event: ReactMouseEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest("[data-no-continue='true']")) return;
        continueAfterAnswer();
      }}
    >
      <motion.main
        className="mx-auto grid h-full max-w-[1800px] grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-cols-[1.9fr_minmax(320px,420px)] lg:grid-rows-1"
        variants={containerMotion}
        initial="hidden"
        animate="show"
      >
        <MapSection
          showStats={leftScreen === "play"}
          showHoverTooltips={leftScreen === "home"}
          session={session}
          roundProgressPct={roundProgressPct}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          onMapMove={({ center, zoom }) => {
            setMapCenter(center);
            setMapZoom(zoom);
          }}
          mapRef={mapRef}
          showCityList={showCityList}
          geoJsonKey={`${activeDatasetKey}-${settings.difficulty}-${currentPool.length}-${session.currentIndex}-${session.selectedFeatureId ?? "none"}-${session.currentTargetId ?? "none"}`}
          mapDataset={mapDataset}
          styleFeature={styleFeature}
          onCityClick={handleCityClick}
        />

        <SidebarPanel
          leftScreen={leftScreen}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode((prev) => !prev)}
          settings={settings}
          currentPoolLength={currentPool.length}
          onDifficultyChange={(difficulty) => setSettings((prev) => ({ ...prev, difficulty }))}
          onToggleCityList={() => setShowCityList((prev) => !prev)}
          onToggleTerritories={(checked) => setSettings((prev) => ({ ...prev, includeTerritories: checked }))}
          startDisabled={startDisabled}
          warningText={warningText}
          onStartGame={() => {
            setShowCityList(false);
            setCitySearch("");
            onStartGame(startDisabled);
          }}
          currentTargetName={currentTargetName}
          questionText={questionText}
          feedbackText={feedbackText}
          feedbackTone={feedbackTone}
          showContinueHint={showContinueHint && session.status === "locked"}
          onStopGame={() => {
            setShowCityList(false);
            setCitySearch("");
            onStopGame();
          }}
          score={session.score}
          onGoHome={() => {
            setShowCityList(false);
            setCitySearch("");
            goToHomeScreen();
          }}
          onReplay={() => {
            setShowCityList(false);
            setCitySearch("");
            onReplayCurrentSettings(startDisabled);
          }}
          showCityList={showCityList}
          citySearch={citySearch}
          onCitySearchChange={setCitySearch}
          cityEntriesForCurrentSettingsCount={cityEntriesForCurrentSettings.length}
          displayedCityEntries={displayedCityEntries}
          bestMatchedCityId={bestMatchedCityId}
          onCloseCityList={() => setShowCityList(false)}
        />
      </motion.main>
    </motion.div>
  );
}
