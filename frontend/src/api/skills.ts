import type { SkillDefinition } from "@/types/skills";

import { apiGet } from "./http.ts";

export async function fetchSkillDefinitions(): Promise<SkillDefinition[]> {
  return apiGet<SkillDefinition[]>("/api/skills/definitions");
}

export async function fetchSkillCatalog(options: { includeDisabled?: boolean } = {}): Promise<SkillDefinition[]> {
  const includeDisabled = options.includeDisabled ?? true;
  return apiGet<SkillDefinition[]>(`/api/skills/catalog?include_disabled=${includeDisabled ? "true" : "false"}`);
}
