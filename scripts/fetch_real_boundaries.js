#!/usr/bin/env node
/*
  Build a large city/town dataset with real boundaries.
  Sources:
  - Overpass: find administrative locality relations in IL + PS
  - Nominatim lookup: fetch Polygon/MultiPolygon geometry by relation id
*/

const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "data";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_LOOKUP_URL = "https://nominatim.openstreetmap.org/lookup";

const OVERPASS_TIMEOUT = 240;
const LOOKUP_BATCH_SIZE = 35;
const REQUEST_DELAY_MS = 900;

const MIN_POPULATION = 12000;
const EASY_POPULATION = 180000;
const MEDIUM_POPULATION = 60000;

const EXCLUDE_NAME_PATTERNS = [
  "מועצה אזורית",
  "regional council",
  "local council",
  "industrial zone",
  "airport",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

function slugify(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function makeStableId(osmRelationId, nameHe, nameEn) {
  const base = slugify(nameEn || nameHe || `r_${osmRelationId}`);
  if (base.length > 0) {
    return `${base}_${osmRelationId}`;
  }
  return `osm_r_${osmRelationId}`;
}

function readPoints(coords, out) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    out.push(coords);
    return;
  }
  coords.forEach((item) => readPoints(item, out));
}

function geometryBbox(geometry) {
  const pts = [];
  readPoints(geometry.coordinates, pts);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

function bboxTouches(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function buildNeighbors(features) {
  const items = features.map((feature) => ({
    id: feature.properties.id,
    bbox: geometryBbox(feature.geometry),
  }));
  const neighbors = new Map(features.map((f) => [f.properties.id, new Set()]));

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (bboxTouches(items[i].bbox, items[j].bbox)) {
        neighbors.get(items[i].id).add(items[j].id);
        neighbors.get(items[j].id).add(items[i].id);
      }
    }
  }

  for (const feature of features) {
    feature.properties.neighbors = Array.from(neighbors.get(feature.properties.id));
  }
}

function colorizeGreedy(features) {
  const colorById = new Map();
  for (const feature of features) {
    const used = new Set();
    for (const n of feature.properties.neighbors) {
      if (colorById.has(n)) used.add(colorById.get(n));
    }
    let c = 0;
    while (used.has(c)) c += 1;
    colorById.set(feature.properties.id, c);
  }
  for (const feature of features) {
    feature.properties.color_index = colorById.get(feature.properties.id) || 0;
  }
}

function parsePopulation(tags) {
  const raw = tags.population || tags["population:persons"] || tags["population:total"];
  if (!raw) return null;
  const normalized = String(raw).replace(/[^\d]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function difficultyFromPopulation(population) {
  if (typeof population === "number") {
    if (population >= EASY_POPULATION) return "easy";
    if (population >= MEDIUM_POPULATION) return "medium";
    return "hard";
  }
  return "hard";
}

function shouldExcludeByName(nameHe, nameEn) {
  const text = `${nameHe || ""} ${nameEn || ""}`.toLowerCase();
  return EXCLUDE_NAME_PATTERNS.some((p) => text.includes(p.toLowerCase()));
}

async function postOverpass(query) {
  let lastError = "unknown overpass error";
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: new URLSearchParams({ data: query }).toString(),
      });
      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${endpoint}`;
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = `${endpoint}: ${error.message}`;
    }
  }
  throw new Error(lastError);
}

async function fetchLocalityRelations(isoCode, inWbGaza) {
  const query = `
[out:json][timeout:${OVERPASS_TIMEOUT}];
area["ISO3166-1"="${isoCode}"][admin_level=2]->.a;
rel(area.a)
  ["boundary"="administrative"]
  ["admin_level"~"8|9"]
  ["name:he"];
out ids tags;
`;
  const payload = await postOverpass(query);
  const elements = payload.elements || [];
  return elements.map((el) => ({
    relationId: el.id,
    nameHe: el.tags?.["name:he"] || null,
    nameEn: el.tags?.name || null,
    population: parsePopulation(el.tags || {}),
    inWbGaza,
  }));
}

function filterCandidates(items) {
  return items.filter((item) => {
    if (!item.nameHe) return false;
    if (shouldExcludeByName(item.nameHe, item.nameEn)) return false;
    if (typeof item.population === "number" && item.population < MIN_POPULATION) return false;
    return true;
  });
}

async function lookupGeometries(relationIds) {
  const geometryByRelationId = new Map();
  for (let i = 0; i < relationIds.length; i += LOOKUP_BATCH_SIZE) {
    const batch = relationIds.slice(i, i + LOOKUP_BATCH_SIZE);
    const params = new URLSearchParams({
      format: "jsonv2",
      polygon_geojson: "1",
      "accept-language": "he,en",
      osm_ids: batch.map((id) => `R${id}`).join(","),
    });
    const url = `${NOMINATIM_LOOKUP_URL}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "israel-geography-trainer/1.0 (local development)",
      },
    });
    if (!response.ok) {
      throw new Error(`Nominatim lookup failed: HTTP ${response.status}`);
    }
    const rows = await response.json();
    for (const row of rows) {
      const relId = Number(row.osm_id);
      const geo = row.geojson;
      if (!relId || !geo) continue;
      if (geo.type !== "Polygon" && geo.type !== "MultiPolygon") continue;
      geometryByRelationId.set(relId, geo);
    }
    process.stdout.write(`Lookup batch ${Math.floor(i / LOOKUP_BATCH_SIZE) + 1}: +${rows.length}\n`);
    await sleep(REQUEST_DELAY_MS);
  }
  return geometryByRelationId;
}

function dedupeByRelation(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.relationId)) {
      map.set(item.relationId, item);
    }
  }
  return Array.from(map.values());
}

async function main() {
  process.stdout.write("Fetching relation lists from Overpass...\n");
  const [il, ps] = await Promise.all([
    fetchLocalityRelations("IL", false),
    fetchLocalityRelations("PS", true),
  ]);

  const merged = dedupeByRelation([...il, ...ps]);
  const filtered = filterCandidates(merged);
  process.stdout.write(`Relations: raw=${merged.length}, after_filter=${filtered.length}\n`);

  const relationIds = filtered.map((x) => x.relationId);
  process.stdout.write("Fetching geometries from Nominatim lookup...\n");
  const geometryByRelationId = await lookupGeometries(relationIds);

  const features = [];
  const skipped = [];
  for (const item of filtered) {
    const geometry = geometryByRelationId.get(item.relationId);
    if (!geometry) {
      skipped.push(item);
      continue;
    }
    const id = makeStableId(item.relationId, item.nameHe, item.nameEn);
    features.push({
      type: "Feature",
      geometry,
      properties: {
        id,
        name_he: item.nameHe,
        population: item.population,
        difficulty_bucket: difficultyFromPopulation(item.population),
        in_wb_gaza: item.inWbGaza,
        color_index: 0,
        neighbors: [],
      },
    });
  }

  buildNeighbors(features);
  colorizeGreedy(features);

  const levels = {
    easy: features.filter((f) => f.properties.difficulty_bucket === "easy").map((f) => f.properties.id),
    medium: features
      .filter((f) => f.properties.difficulty_bucket === "easy" || f.properties.difficulty_bucket === "medium")
      .map((f) => f.properties.id),
    hard: features.map((f) => f.properties.id),
  };

  const all = { type: "FeatureCollection", features };
  const noWbGaza = {
    type: "FeatureCollection",
    features: features.filter((f) => !f.properties.in_wb_gaza),
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeJson(path.join(OUTPUT_DIR, "localities_all.geojson"), all);
  writeJson(path.join(OUTPUT_DIR, "localities_no_wb_gaza.geojson"), noWbGaza);
  writeJson(path.join(OUTPUT_DIR, "levels.json"), levels);

  process.stdout.write(`Wrote features=${features.length}, excluded_dataset=${noWbGaza.features.length}\n`);
  process.stdout.write(`Levels: easy=${levels.easy.length}, medium=${levels.medium.length}, hard=${levels.hard.length}\n`);
  process.stdout.write(`Skipped_no_geometry=${skipped.length}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

