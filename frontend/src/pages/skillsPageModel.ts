import type { SkillDefinition } from "../types/skills.ts";

export type SkillStatusFilter = "all" | "active" | "runtime" | "manageable" | "importable";

export type SkillManagementFilters = {
  query: string;
  status: SkillStatusFilter;
};

export type SkillOverview = {
  total: number;
  active: number;
  runtimeRegistered: number;
  manageable: number;
  importable: number;
};

export function buildSkillStatusOptions(): SkillStatusFilter[] {
  return ["all", "active", "runtime", "manageable", "importable"];
}

export function filterSkillsForManagement(
  skills: SkillDefinition[],
  filters: SkillManagementFilters,
): SkillDefinition[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return skills.filter((skill) => {
    if (!matchesSkillStatus(skill, filters.status)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return buildSkillSearchText(skill).includes(normalizedQuery);
  });
}

export function buildSkillOverview(skills: SkillDefinition[]): SkillOverview {
  return {
    total: skills.length,
    active: skills.filter((skill) => skill.status === "active").length,
    runtimeRegistered: skills.filter((skill) => skill.runtimeRegistered).length,
    manageable: skills.filter((skill) => skill.canManage).length,
    importable: skills.filter((skill) => skill.canImport).length,
  };
}

function matchesSkillStatus(skill: SkillDefinition, filter: SkillStatusFilter): boolean {
  if (filter === "active") {
    return skill.status === "active";
  }
  if (filter === "runtime") {
    return skill.runtimeRegistered;
  }
  if (filter === "manageable") {
    return skill.canManage;
  }
  if (filter === "importable") {
    return skill.canImport;
  }
  return true;
}

function buildSkillSearchText(skill: SkillDefinition): string {
  return [
    skill.skillKey,
    skill.label,
    skill.description,
    skill.sourceFormat,
    skill.sourceScope,
    skill.sourcePath,
    skill.status,
    ...skill.supportedValueTypes,
    ...skill.sideEffects,
    ...skill.inputSchema.map((field) => `${field.key} ${field.label} ${field.valueType} ${field.description}`),
    ...skill.outputSchema.map((field) => `${field.key} ${field.label} ${field.valueType} ${field.description}`),
    ...skill.compatibility.map((item) => `${item.target} ${item.status} ${item.summary} ${item.missingCapabilities.join(" ")}`),
  ]
    .join(" ")
    .toLowerCase();
}
