import type { LocalityFeature } from "./types";

export function normalizeIdList(ids: string[], featureIndex: Map<string, LocalityFeature>) {
  return ids.filter((id) => featureIndex.has(id));
}

export function randomPick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function normalizeSearchText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[־–—-]/g, " ")
    .replace(/\s+/g, " ");
}

export function similarityScore(query: string, candidate: string) {
  const q = normalizeSearchText(query);
  const c = normalizeSearchText(candidate);
  if (!q || !c) return 0;
  if (c === q) return 1000;
  if (c.startsWith(q)) return 800 - (c.length - q.length);

  const index = c.indexOf(q);
  if (index >= 0) return 650 - index;

  const qParts = q.split(" ").filter(Boolean);
  if (qParts.length === 0) return 0;

  let hits = 0;
  for (const part of qParts) {
    if (!c.includes(part)) return 0;
    hits += 1;
  }
  return 400 + hits * 30;
}
