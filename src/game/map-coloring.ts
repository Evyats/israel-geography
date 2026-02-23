import type { LocalityFeature } from "./types";

type StyleMeta = {
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  centroid: { lon: number; lat: number };
  diagonal: number;
};

export function colorFromIndex(index: number) {
  const hue = (index * 137) % 360;
  const satCycle = [62, 70, 78];
  const lightCycle = [46, 54, 62];
  const saturation = satCycle[index % satCycle.length];
  const lightness = lightCycle[Math.floor(index / satCycle.length) % lightCycle.length];
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function collectGeometryPoints(coords: unknown, out: Array<[number, number]>) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    out.push([coords[0], coords[1]]);
    return;
  }
  coords.forEach((item) => collectGeometryPoints(item, out));
}

function getGeometryStats(feature: LocalityFeature): StyleMeta {
  const points: Array<[number, number]> = [];
  if ("coordinates" in feature.geometry) {
    collectGeometryPoints(feature.geometry.coordinates, points);
  } else {
    collectGeometryPoints([], points);
  }

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let sumLon = 0;
  let sumLat = 0;

  points.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
    sumLon += lon;
    sumLat += lat;
  });

  const centroid = {
    lon: points.length > 0 ? sumLon / points.length : 0,
    lat: points.length > 0 ? sumLat / points.length : 0,
  };

  return {
    bbox: { minLon, minLat, maxLon, maxLat },
    centroid,
    diagonal: Math.hypot(Math.max(0, maxLon - minLon), Math.max(0, maxLat - minLat)),
  };
}

function bboxGap(a: StyleMeta["bbox"], b: StyleMeta["bbox"]) {
  const gapLon = Math.max(0, Math.max(a.minLon - b.maxLon, b.minLon - a.maxLon));
  const gapLat = Math.max(0, Math.max(a.minLat - b.maxLat, b.minLat - a.maxLat));
  return { gapLon, gapLat };
}

function planarDistanceSq(a: StyleMeta["centroid"], b: StyleMeta["centroid"]) {
  const latMean = (a.lat + b.lat) / 2;
  const lonScale = Math.cos((latMean * Math.PI) / 180);
  const dx = (a.lon - b.lon) * lonScale;
  const dy = a.lat - b.lat;
  return dx * dx + dy * dy;
}

function chooseNextDsaturNode(
  uncolored: Set<string>,
  saturationById: Map<string, number>,
  degreeById: Map<string, number>
) {
  let bestId = "";
  let bestSat = -1;
  let bestDegree = -1;
  uncolored.forEach((id) => {
    const sat = saturationById.get(id) ?? 0;
    const degree = degreeById.get(id) ?? 0;
    if (sat > bestSat || (sat === bestSat && degree > bestDegree)) {
      bestId = id;
      bestSat = sat;
      bestDegree = degree;
    }
  });
  return bestId;
}

export function buildRuntimeColoring(features: LocalityFeature[]) {
  const byId = new Map(features.map((f) => [f.properties.id, f]));
  const statsById = new Map(features.map((f) => [f.properties.id, getGeometryStats(f)]));
  const graph = new Map(features.map((f) => [f.properties.id, new Set<string>()]));

  features.forEach((feature) => {
    const id = feature.properties.id;
    feature.properties.neighbors.forEach((neighborId) => {
      if (!byId.has(neighborId) || neighborId === id) return;
      graph.get(id)?.add(neighborId);
      graph.get(neighborId)?.add(id);
    });
  });

  for (let i = 0; i < features.length; i += 1) {
    const idA = features[i].properties.id;
    const sA = statsById.get(idA)!;
    const radiusA = Math.min(Math.max(sA.diagonal * 1.15 + 0.05, 0.1), 0.22);

    for (let j = i + 1; j < features.length; j += 1) {
      const idB = features[j].properties.id;
      const sB = statsById.get(idB)!;
      const radiusB = Math.min(Math.max(sB.diagonal * 1.15 + 0.05, 0.1), 0.22);
      const nearRadius = Math.max(radiusA, radiusB);
      const distSq = planarDistanceSq(sA.centroid, sB.centroid);
      const gaps = bboxGap(sA.bbox, sB.bbox);
      const bboxNear = gaps.gapLon <= 0.04 && gaps.gapLat <= 0.04;

      if (distSq <= nearRadius * nearRadius || bboxNear) {
        graph.get(idA)?.add(idB);
        graph.get(idB)?.add(idA);
      }
    }
  }

  const colorById = new Map<string, number>();
  const uncolored = new Set(graph.keys());
  const degreeById = new Map<string, number>();
  const saturationById = new Map<string, number>();

  graph.forEach((neighbors, id) => {
    degreeById.set(id, neighbors.size);
    saturationById.set(id, 0);
  });

  while (uncolored.size > 0) {
    const currentId = chooseNextDsaturNode(uncolored, saturationById, degreeById);
    if (!currentId) break;

    const usedColors = new Set<number>();
    graph.get(currentId)?.forEach((neighborId) => {
      const neighborColor = colorById.get(neighborId);
      if (typeof neighborColor === "number") usedColors.add(neighborColor);
    });

    let color = 0;
    while (usedColors.has(color)) color += 1;
    colorById.set(currentId, color);
    uncolored.delete(currentId);

    graph.get(currentId)?.forEach((neighborId) => {
      if (!uncolored.has(neighborId)) return;
      const neighborUsed = new Set<number>();
      graph.get(neighborId)?.forEach((nn) => {
        const cc = colorById.get(nn);
        if (typeof cc === "number") neighborUsed.add(cc);
      });
      saturationById.set(neighborId, neighborUsed.size);
    });
  }

  return colorById;
}
