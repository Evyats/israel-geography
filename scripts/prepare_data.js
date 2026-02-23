#!/usr/bin/env node
/*
  Preprocess localities data into game-ready GeoJSON and levels.
  Usage:
    node scripts/prepare_data.js --input data/raw_localities.geojson --output data

  Expected raw feature properties:
    - id (or osm_id)
    - name_he or name:he (fallback name)
    - population (optional)
    - in_wb_gaza (optional; otherwise computed from region tag if present)
*/

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx < 0 || idx === args.length - 1) return fallback;
  return args[idx + 1];
};

const inputPath = getArg("--input", path.join("data", "raw_localities.geojson"));
const outputDir = getArg("--output", "data");

const MANUAL_EASY = new Set(["ירושלים", "תל אביב-יפו", "חיפה", "באר שבע"]);
const MANUAL_MEDIUM = new Set(["אשדוד", "נתניה", "ראשון לציון", "פתח תקווה", "חולון"]);

function parseJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function inferName(properties) {
  return properties.name_he || properties["name:he"] || properties.name || null;
}

function inferId(properties, index) {
  return String(properties.id || properties.osm_id || `loc_${index}`);
}

function inferWbGaza(properties) {
  if (typeof properties.in_wb_gaza === "boolean") {
    return properties.in_wb_gaza;
  }

  const text = String(properties.region || properties.admin_area || "").toLowerCase();
  return text.includes("west bank") || text.includes("wb") || text.includes("gaza") || text.includes("judea") || text.includes("samaria");
}

function getBbox(geometry) {
  const points = [];

  const readCoords = (coords) => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      points.push(coords);
      return;
    }
    coords.forEach(readCoords);
  };

  readCoords(geometry.coordinates);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return { minX, minY, maxX, maxY };
}

function bboxTouches(a, b) {
  const overlapX = a.minX <= b.maxX && a.maxX >= b.minX;
  const overlapY = a.minY <= b.maxY && a.maxY >= b.minY;
  if (!overlapX || !overlapY) return false;

  const areaX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const areaY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);

  return areaX >= -1e-8 && areaY >= -1e-8;
}

function assignDifficulty(nameHe, population) {
  if (MANUAL_EASY.has(nameHe)) return "easy";
  if (MANUAL_MEDIUM.has(nameHe)) return "medium";

  if (typeof population === "number") {
    if (population >= 180000) return "easy";
    if (population >= 50000) return "medium";
    return "hard";
  }

  if (nameHe && nameHe.length <= 4) return "medium";
  return "hard";
}

function colorizeGreedy(features) {
  const colorMap = new Map();
  const lookup = new Map(features.map((f) => [f.properties.id, f]));

  features.forEach((feature) => {
    const used = new Set();
    feature.properties.neighbors.forEach((neighborId) => {
      if (colorMap.has(neighborId)) {
        used.add(colorMap.get(neighborId));
      }
    });

    let color = 0;
    while (used.has(color)) color += 1;
    colorMap.set(feature.properties.id, color);
  });

  lookup.forEach((feature, id) => {
    feature.properties.color_index = colorMap.get(id) || 0;
  });
}

function buildNeighbors(features) {
  const bboxes = features.map((feature) => ({ id: feature.properties.id, bbox: getBbox(feature.geometry) }));
  const neighbors = new Map(features.map((f) => [f.properties.id, new Set()]));

  for (let i = 0; i < bboxes.length; i += 1) {
    for (let j = i + 1; j < bboxes.length; j += 1) {
      if (bboxTouches(bboxes[i].bbox, bboxes[j].bbox)) {
        neighbors.get(bboxes[i].id).add(bboxes[j].id);
        neighbors.get(bboxes[j].id).add(bboxes[i].id);
      }
    }
  }

  features.forEach((feature) => {
    feature.properties.neighbors = Array.from(neighbors.get(feature.properties.id));
  });
}

function validate(features, levels) {
  const ids = new Set(features.map((f) => f.properties.id));

  ["easy", "medium", "hard"].forEach((level) => {
    levels[level].forEach((id) => {
      if (!ids.has(id)) {
        throw new Error(`Missing level ID in features: ${id}`);
      }
    });
  });

  features.forEach((feature) => {
    const p = feature.properties;
    ["id", "name_he", "difficulty_bucket", "in_wb_gaza", "color_index", "neighbors"].forEach((key) => {
      if (p[key] === undefined || p[key] === null) {
        throw new Error(`Missing property ${key} on feature ${p.id || "unknown"}`);
      }
    });
  });
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    console.error("Provide a raw locality GeoJSON via --input.");
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const raw = parseJson(inputPath);
  const normalizedFeatures = raw.features
    .map((feature, index) => {
      const nameHe = inferName(feature.properties || {});
      if (!nameHe) return null;

      const populationRaw = Number(feature.properties.population);
      const population = Number.isFinite(populationRaw) ? populationRaw : null;

      return {
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          id: inferId(feature.properties || {}, index),
          name_he: nameHe,
          population,
          difficulty_bucket: assignDifficulty(nameHe, population),
          in_wb_gaza: inferWbGaza(feature.properties || {}),
          color_index: 0,
          neighbors: [],
        },
      };
    })
    .filter(Boolean);

  buildNeighbors(normalizedFeatures);
  colorizeGreedy(normalizedFeatures);

  const levels = {
    easy: normalizedFeatures.filter((f) => f.properties.difficulty_bucket === "easy").map((f) => f.properties.id),
    medium: normalizedFeatures
      .filter((f) => f.properties.difficulty_bucket === "easy" || f.properties.difficulty_bucket === "medium")
      .map((f) => f.properties.id),
    hard: normalizedFeatures.map((f) => f.properties.id),
  };

  const all = { type: "FeatureCollection", features: normalizedFeatures };
  const noWbGaza = {
    type: "FeatureCollection",
    features: normalizedFeatures.filter((f) => !f.properties.in_wb_gaza),
  };

  validate(all.features, levels);

  writeJson(path.join(outputDir, "localities_all.geojson"), all);
  writeJson(path.join(outputDir, "localities_no_wb_gaza.geojson"), noWbGaza);
  writeJson(path.join(outputDir, "levels.json"), levels);

  console.log(`Prepared ${all.features.length} localities.`);
}

main();
