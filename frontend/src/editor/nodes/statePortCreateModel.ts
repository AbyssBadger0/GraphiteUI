import type { StateDefinition } from "../../types/node-system.ts";

export type StatePortSearchField = {
  key: string;
  name: string;
  description: string;
};

export type StatePortDraft = {
  key: string;
  definition: StateDefinition;
};

export type CreateStateDraftOptions = {
  side?: "input" | "output";
};

export function matchesStatePortSearch(field: StatePortSearchField, query: string) {
  const normalizedQuery = normalizeStateSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystacks = [
    normalizeStateSearchText(field.name.trim() || field.key),
    normalizeStateSearchText(field.key),
    normalizeStateSearchText(field.description),
  ];

  if (haystacks.some((value) => value.includes(normalizedQuery))) {
    return true;
  }

  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  const words = normalizeStateSearchText(`${field.name} ${field.key}`).split(" ").filter(Boolean);
  if (queryTerms.length > 0 && queryTerms.every((term) => words.some((word) => word.startsWith(term)))) {
    return true;
  }

  const queryCompact = normalizedQuery.replace(/\s+/g, "");
  const initials = words.map((word) => word[0] ?? "").join("");
  return isSubsequence(queryCompact, initials) || haystacks.some((value) => isSubsequence(queryCompact, value.replace(/\s+/g, "")));
}

export function createStateDraftFromQuery(query: string, existingKeys: string[], options: CreateStateDraftOptions = {}): StatePortDraft {
  const trimmedQuery = query.trim();
  const key = createStateKey(trimmedQuery, existingKeys, options.side);

  return {
    key,
    definition: {
      name: trimmedQuery || key,
      description: "",
      type: "text",
      value: "",
      color: "",
    },
  };
}

function createStateKey(base: string, existingKeys: string[], side: CreateStateDraftOptions["side"] = undefined) {
  const normalizedBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalizedBase) {
    return createIndexedStateKey(side === "input" ? "input" : side === "output" ? "output" : "state", existingKeys);
  }
  let nextKey = normalizedBase;
  let index = 2;
  const existing = new Set(existingKeys);

  while (existing.has(nextKey)) {
    nextKey = `${normalizedBase}_${index}`;
    index += 1;
  }

  return nextKey;
}

function createIndexedStateKey(prefix: string, existingKeys: string[]) {
  const existing = new Set(existingKeys);
  let index = 1;
  let nextKey = `${prefix}_${index}`;
  while (existing.has(nextKey)) {
    index += 1;
    nextKey = `${prefix}_${index}`;
  }
  return nextKey;
}

function normalizeStateSearchText(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function isSubsequence(query: string, target: string) {
  let index = 0;
  for (const character of target) {
    if (character === query[index]) {
      index += 1;
      if (index === query.length) {
        return true;
      }
    }
  }
  return false;
}
