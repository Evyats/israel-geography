import type { DatasetKey, Difficulty, SessionState } from "./types";

export const TOTAL_QUESTIONS = 10;
export const FEEDBACK_DELAY_MS = 1200;
export const INITIAL_CENTER: [number, number] = [31.45, 34.85];
export const INITIAL_ZOOM = 8;

export const DATA_FILES: Record<DatasetKey, string> = {
  include: "/data/localities_all.geojson",
  exclude: "/data/localities_no_wb_gaza.geojson",
};

export const HEBREW_DIFFICULTY: Record<Difficulty, string> = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
};

export const containerMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export const cardMotion = {
  hidden: { opacity: 0, y: 14, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28 } },
};

export function createIdleSessionState(): SessionState {
  return {
    totalQuestions: TOTAL_QUESTIONS,
    currentIndex: 0,
    score: 0,
    askedIds: [],
    currentTargetId: null,
    status: "idle",
    selectedFeatureId: null,
  };
}
