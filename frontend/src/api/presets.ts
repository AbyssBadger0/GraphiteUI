import type { PresetDocument } from "@/types/node-system";

import { apiGet } from "./http";

export async function fetchPresets(): Promise<PresetDocument[]> {
  return apiGet<PresetDocument[]>("/api/presets");
}
