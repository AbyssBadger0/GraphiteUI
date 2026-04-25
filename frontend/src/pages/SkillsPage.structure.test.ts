import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const componentSource = readFileSync(resolve(currentDirectory, "SkillsPage.vue"), "utf8");
const skillsApiSource = readFileSync(resolve(currentDirectory, "../api/skills.ts"), "utf8");
const sourceCoverageTest = readFileSync(resolve(currentDirectory, "../i18n/sourceCoverage.test.ts"), "utf8");

test("SkillsPage loads the full skill catalog into a searchable management surface", () => {
  assert.match(skillsApiSource, /export async function fetchSkillCatalog/);
  assert.match(componentSource, /import \{ fetchSkillCatalog \} from "@\/api\/skills";/);
  assert.match(componentSource, /const skills = ref<SkillDefinition\[\]>\(\[\]\);/);
  assert.match(componentSource, /const filteredSkills = computed\(\(\) => filterSkillsForManagement/);
  assert.match(componentSource, /<ElInput[\s\S]*v-model="query"[\s\S]*class="skills-page__search"/);
  assert.match(componentSource, /<ElSegmented[\s\S]*v-model="statusFilter"[\s\S]*:options="statusOptions"/);
  assert.match(componentSource, /v-for="skill in filteredSkills"/);
  assert.match(componentSource, /skill\.compatibility/);
});

test("SkillsPage participates in i18n source coverage", () => {
  assert.match(sourceCoverageTest, /"src\/pages\/SkillsPage\.vue"/);
});

test("SkillsPage prevents management controls from overflowing narrow shells", () => {
  assert.match(componentSource, /\.skills-page \{[\s\S]*min-width:\s*0;/);
  assert.match(componentSource, /\.skills-page__segments \{[\s\S]*max-width:\s*100%;[\s\S]*overflow-x:\s*auto;/);
  assert.match(componentSource, /@media \(max-width:\s*700px\) \{[\s\S]*\.skills-page__refresh \{[\s\S]*width:\s*100%;/);
});
