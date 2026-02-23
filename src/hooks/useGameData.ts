import { useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { geoJSON as leafletGeoJson } from "leaflet";

import { DATA_FILES, LEVELS_FILES, TOTAL_QUESTIONS } from "@/game/constants";
import { buildRuntimeColoring } from "@/game/map-coloring";
import type { DatasetKey, Levels, LevelsCatalog, LocalityCollection, LocalityFeature, SettingsState } from "@/game/types";
import { normalizeIdList, normalizeSearchText, similarityScore } from "@/game/utils";

export function useGameData() {
  const [levels, setLevels] = useState<Levels | null>(null);
  const [datasets, setDatasets] = useState<Record<DatasetKey, LocalityCollection | null>>({
    include: null,
    exclude: null,
  });
  const [settings, setSettings] = useState<SettingsState>({
    difficulty: "easy",
    includeTerritories: false,
  });
  const [warningText, setWarningText] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [displayedCityEntries, setDisplayedCityEntries] = useState<Array<{ id: string; name: string; score?: number }>>([]);
  const [bestMatchedCityId, setBestMatchedCityId] = useState<string | null>(null);

  const levelsFromCatalog = (catalog: LevelsCatalog): Levels => {
    return {
      easy: catalog.easy.map((entry) => entry.id),
      medium: catalog.medium.map((entry) => entry.id),
      hard: catalog.hard.map((entry) => entry.id),
    };
  };

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

  const pools = useMemo(() => {
    if (!levels) return { easy: [], medium: [], hard: [] } as Levels;
    return {
      easy: normalizeIdList(levels.easy, fullFeatureIndex),
      medium: normalizeIdList(levels.medium, fullFeatureIndex),
      hard: normalizeIdList(levels.hard, fullFeatureIndex),
    };
  }, [levels, fullFeatureIndex]);

  const currentPool = pools[settings.difficulty];
  const startDisabled = currentPool.length < TOTAL_QUESTIONS;

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
        // Exact text containment first; keeps behavior stable when adding/removing letters.
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
    if (!activeDataset) return;
    if (startDisabled) {
      setWarningText("אין מספיק ערים לרמה שנבחרה (נדרשות לפחות 10).");
    } else {
      setWarningText("");
    }
  }, [activeDataset, startDisabled]);

  useEffect(() => {
    const load = async () => {
      try {
        const [catalogRes, legacyRes, includeRes, excludeRes] = await Promise.all([
          fetch(LEVELS_FILES.catalog),
          fetch(LEVELS_FILES.legacy),
          fetch(DATA_FILES.include),
          fetch(DATA_FILES.exclude),
        ]);
        if (!includeRes.ok || !excludeRes.ok) throw new Error("טעינת הקבצים נכשלה");

        let levelsPayload: Levels | null = null;
        if (catalogRes.ok) {
          const catalogPayload = (await catalogRes.json()) as LevelsCatalog;
          levelsPayload = levelsFromCatalog(catalogPayload);
        } else if (legacyRes.ok) {
          levelsPayload = (await legacyRes.json()) as Levels;
        } else {
          throw new Error("לא נמצא קובץ רמות חוקי (levels_catalog.json או levels.json)");
        }

        const includePayload = (await includeRes.json()) as LocalityCollection;
        const excludePayload = (await excludeRes.json()) as LocalityCollection;

        setLevels(levelsPayload);
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

