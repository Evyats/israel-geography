import { useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { geoJSON as leafletGeoJson } from "leaflet";

import { DATA_FILES, LEVELS_FILES, USE_SEGMENTED_DIFFICULTY } from "@/game/constants";
import { buildRuntimeColoring } from "@/game/map-coloring";
import type {
  DatasetKey,
  LevelsSegmentsCatalog,
  LocalityCollection,
  LocalityFeature,
  SettingsState,
} from "@/game/types";
import { normalizeIdList, normalizeSearchText, similarityScore } from "@/game/utils";

export function useGameData() {
  const [segmentsCatalog, setSegmentsCatalog] = useState<LevelsSegmentsCatalog | null>(null);
  const [datasets, setDatasets] = useState<Record<DatasetKey, LocalityCollection | null>>({
    include: null,
    exclude: null,
  });
  const [settings, setSettings] = useState<SettingsState>({
    includeTerritories: false,
    difficultySegmentIndex: 0,
  });
  const [warningText, setWarningText] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [displayedCityEntries, setDisplayedCityEntries] = useState<Array<{ id: string; name: string; score?: number }>>([]);
  const [bestMatchedCityId, setBestMatchedCityId] = useState<string | null>(null);

  const activeDatasetKey: DatasetKey = settings.includeTerritories ? "include" : "exclude";
  const activeDataset = datasets[activeDatasetKey];

  const fullFeatureIndex = useMemo(() => {
    const map = new Map<string, LocalityFeature>();
    activeDataset?.features.forEach((feature) => {
      map.set(feature.properties.id, feature as LocalityFeature);
    });
    return map;
  }, [activeDataset]);

  const runtimeColorById = useMemo(() => {
    const masterDataset = datasets.include ?? datasets.exclude ?? activeDataset;
    if (!masterDataset) return new Map<string, number>();
    return buildRuntimeColoring(masterDataset.features as LocalityFeature[]);
  }, [activeDataset, datasets.exclude, datasets.include]);

  const segmentOptions = useMemo(() => {
    if (!segmentsCatalog) return [] as Array<{ index: number; label: string; targetCount: number }>;
    let running = 0;
    return segmentsCatalog.segments.map((segment, index) => {
      running += segment.increment_count;
      return { index, label: segment.label, targetCount: running };
    });
  }, [segmentsCatalog]);

  const segmentedPools = useMemo(() => {
    if (!segmentsCatalog) return [] as string[][];
    const poolsBySegment: string[][] = [];
    const running: string[] = [];

    segmentsCatalog.segments.forEach((segment) => {
      running.push(...segment.cities.map((entry) => entry.id));
      const normalized = normalizeIdList(running, fullFeatureIndex);
      poolsBySegment.push(normalized);
    });

    return poolsBySegment;
  }, [fullFeatureIndex, segmentsCatalog]);

  const clampedSegmentIndex = useMemo(() => {
    if (segmentedPools.length === 0) return 0;
    return Math.max(0, Math.min(settings.difficultySegmentIndex, segmentedPools.length - 1));
  }, [segmentedPools.length, settings.difficultySegmentIndex]);

  const currentPool = useMemo(() => {
    if (USE_SEGMENTED_DIFFICULTY && segmentedPools.length > 0) {
      return segmentedPools[clampedSegmentIndex] ?? [];
    }
    return [];
  }, [clampedSegmentIndex, segmentedPools]);
  const segmentMinCount = segmentedPools[0]?.length ?? 0;
  const segmentMaxCount = segmentedPools[segmentedPools.length - 1]?.length ?? 0;

  const startDisabled = currentPool.length === 0;

  const visibleFeatures = useMemo(
    () =>
      currentPool
        .map((id) => fullFeatureIndex.get(id))
        .filter((feature): feature is LocalityFeature => Boolean(feature)),
    [currentPool, fullFeatureIndex]
  );

  const visibleDataset = useMemo<LocalityCollection>(
    () => ({
      type: "FeatureCollection",
      features: visibleFeatures,
    }),
    [visibleFeatures]
  );

  const featureIndex = useMemo(() => {
    const map = new Map<string, LocalityFeature>();
    visibleFeatures.forEach((feature) => {
      map.set(feature.properties.id, feature);
    });
    return map;
  }, [visibleFeatures]);

  const featureCenterById = useMemo(() => {
    const map = new Map<string, [number, number]>();
    visibleFeatures.forEach((feature) => {
      const bounds = leafletGeoJson(feature as unknown as GeoJsonObject).getBounds();
      const center = bounds.getCenter();
      map.set(feature.properties.id, [center.lat, center.lng]);
    });
    return map;
  }, [visibleFeatures]);

  const cityEntriesForCurrentSettings = useMemo(
    () =>
      currentPool
        .map((id) => {
          const feature = fullFeatureIndex.get(id);
          if (!feature) return null;
          return { id, name: feature.properties.name_he };
        })
        .filter((entry): entry is { id: string; name: string } => Boolean(entry))
        .sort((a, b) => a.name.localeCompare(b.name, "he")),
    [currentPool, fullFeatureIndex]
  );

  const searchedCityEntries = useMemo(() => {
    const query = citySearch.trim();
    if (!query) {
      return cityEntriesForCurrentSettings.map((entry) => ({ ...entry, score: 0 }));
    }

    const normalizedQuery = normalizeSearchText(query);
    const strictMatches = cityEntriesForCurrentSettings
      .map((entry) => {
        const normalizedName = normalizeSearchText(entry.name);
        const includeIndex = normalizedName.indexOf(normalizedQuery);
        if (includeIndex < 0) return null;
        return { ...entry, score: 2000 - includeIndex };
      })
      .filter((entry): entry is { id: string; name: string; score: number } => Boolean(entry))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "he"));

    if (strictMatches.length > 0) {
      return strictMatches;
    }

    return cityEntriesForCurrentSettings
      .map((entry) => {
        const baseScore = similarityScore(query, entry.name);
        const normalizedName = normalizeSearchText(entry.name);
        const words = normalizedName.split(" ").filter(Boolean);
        const containsWholeQuery = normalizedName.includes(normalizedQuery);
        const wordPrefixHit = words.some((word) => word.startsWith(normalizedQuery));
        const relaxedScore =
          baseScore > 0
            ? baseScore
            : containsWholeQuery
              ? 300 - Math.max(0, normalizedName.indexOf(normalizedQuery))
              : wordPrefixHit
                ? 240
                : 0;
        return { ...entry, score: Math.max(0, relaxedScore) };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "he"));
  }, [cityEntriesForCurrentSettings, citySearch]);

  useEffect(() => {
    const query = citySearch.trim();
    const nextEntries = query ? searchedCityEntries : cityEntriesForCurrentSettings;
    setDisplayedCityEntries(nextEntries);
    setBestMatchedCityId(query ? nextEntries[0]?.id ?? null : null);
  }, [cityEntriesForCurrentSettings, citySearch, searchedCityEntries]);

  useEffect(() => {
    const load = async () => {
      try {
        const [segmentsRes, includeRes, excludeRes] = await Promise.all([
          fetch(LEVELS_FILES.segmentsCatalog),
          fetch(DATA_FILES.include),
          fetch(DATA_FILES.exclude),
        ]);
        if (!includeRes.ok || !excludeRes.ok) throw new Error("טעינת הקבצים נכשלה");
        if (!segmentsRes.ok) {
          throw new Error("לא נמצא קובץ רמות מקטעים (levels_segments_catalog.json)");
        }
        const segmentsPayload = (await segmentsRes.json()) as LevelsSegmentsCatalog;
        setSegmentsCatalog(segmentsPayload);

        const includePayload = (await includeRes.json()) as LocalityCollection;
        const excludePayload = (await excludeRes.json()) as LocalityCollection;

        setDatasets({ include: includePayload, exclude: excludePayload });
      } catch (error) {
        const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
        setWarningText(`שגיאה בטעינת נתונים: ${message}`);
      }
    };

    load();
  }, []);

  return {
    settings,
    setSettings,
    warningText,
    citySearch,
    setCitySearch,
    bestMatchedCityId,
    displayedCityEntries,
    cityEntriesForCurrentSettings,
    currentPool,
    segmentOptions,
    segmentMinCount,
    segmentMaxCount,
    usingSegmentedDifficulty: USE_SEGMENTED_DIFFICULTY && segmentOptions.length > 0,
    startDisabled,
    visibleDataset,
    featureIndex,
    fullFeatureIndex,
    featureCenterById,
    runtimeColorById,
    activeDatasetKey,
    activeDataset,
  };
}
