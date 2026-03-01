import { useEffect } from "react";

import type { SessionState, SettingsState } from "@/game/types";

type Args = {
  session: SessionState;
  settings: SettingsState;
  leftScreen: "home" | "play" | "end";
  fullFeatureIndex: Map<string, { properties: { name_he: string } }>;
  mapZoom: number;
  mapCenter: [number, number];
  visibleCount: number;
};

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

export function useDebugBridge({
  session,
  settings,
  leftScreen,
  fullFeatureIndex,
  mapZoom,
  mapCenter,
  visibleCount,
}: Args) {
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
          visibleCount,
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
  }, [fullFeatureIndex, leftScreen, mapCenter, mapZoom, session, settings, visibleCount]);
}

