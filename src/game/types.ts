import type { Feature, FeatureCollection, Geometry } from "geojson";

export type Difficulty = "easy" | "medium" | "hard";
export type DatasetKey = "include" | "exclude";
export type SessionStatus = "idle" | "awaiting_answer" | "locked" | "finished";

export type LocalityProps = {
  id: string;
  name_he: string;
  population: number | null;
  difficulty_bucket: Difficulty;
  in_wb_gaza: boolean;
  color_index: number;
  neighbors: string[];
};

export type LocalityFeature = Feature<Geometry, LocalityProps>;
export type LocalityCollection = FeatureCollection<Geometry, LocalityProps>;

export type Levels = {
  easy: string[];
  medium: string[];
  hard: string[];
};

export type LevelCatalogEntry = {
  id: string;
  name_he: string;
  population: number | null;
};

export type LevelsCatalog = {
  easy: LevelCatalogEntry[];
  medium: LevelCatalogEntry[];
  hard: LevelCatalogEntry[];
};

export type SettingsState = {
  difficulty: Difficulty;
  includeTerritories: boolean;
};

export type SessionState = {
  totalQuestions: number;
  currentIndex: number;
  score: number;
  askedIds: string[];
  currentTargetId: string | null;
  status: SessionStatus;
  selectedFeatureId: string | null;
};

export type FeedbackTone = "ok" | "bad" | "";
