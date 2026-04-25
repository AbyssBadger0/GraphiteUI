import test from "node:test";
import assert from "node:assert/strict";

import type { SkillDefinition } from "../types/skills.ts";

import { buildSkillOverview, buildSkillStatusOptions, filterSkillsForManagement } from "./skillsPageModel.ts";

const skills: SkillDefinition[] = [
  {
    skillKey: "rewrite_text",
    label: "Rewrite Text",
    description: "Rewrite text with a specified style.",
    inputSchema: [{ key: "text", label: "Text", valueType: "text", required: true, description: "Source text" }],
    outputSchema: [{ key: "rewritten", label: "Rewritten", valueType: "text", required: false, description: "Result" }],
    supportedValueTypes: ["text"],
    sideEffects: [],
    sourceFormat: "claude_code",
    sourceScope: "graphite_managed",
    sourcePath: "/skills/rewrite_text/SKILL.md",
    runtimeRegistered: true,
    status: "active",
    canManage: true,
    canImport: false,
    compatibility: [],
  },
  {
    skillKey: "external_search",
    label: "External Search",
    description: "Imported from another runtime.",
    inputSchema: [],
    outputSchema: [],
    supportedValueTypes: ["text", "json"],
    sideEffects: ["network"],
    sourceFormat: "codex",
    sourceScope: "external",
    sourcePath: "/tmp/external_search/SKILL.md",
    runtimeRegistered: false,
    status: "disabled",
    canManage: false,
    canImport: true,
    compatibility: [{ target: "codex", status: "native", summary: "Native Codex skill.", missingCapabilities: [] }],
  },
];

test("filterSkillsForManagement searches key, label, description, value types, and side effects", () => {
  assert.deepEqual(
    filterSkillsForManagement(skills, { query: "rewrite", status: "all" }).map((skill) => skill.skillKey),
    ["rewrite_text"],
  );
  assert.deepEqual(
    filterSkillsForManagement(skills, { query: "network", status: "all" }).map((skill) => skill.skillKey),
    ["external_search"],
  );
  assert.deepEqual(
    filterSkillsForManagement(skills, { query: "", status: "importable" }).map((skill) => skill.skillKey),
    ["external_search"],
  );
});

test("buildSkillOverview summarizes runtime and management readiness", () => {
  assert.deepEqual(buildSkillOverview(skills), {
    total: 2,
    active: 1,
    runtimeRegistered: 1,
    manageable: 1,
    importable: 1,
  });
});

test("buildSkillStatusOptions keeps management filters stable", () => {
  assert.deepEqual(buildSkillStatusOptions(), ["all", "active", "runtime", "manageable", "importable"]);
});
