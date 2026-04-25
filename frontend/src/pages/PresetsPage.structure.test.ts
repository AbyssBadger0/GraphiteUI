import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const componentSource = readFileSync(resolve(currentDirectory, "PresetsPage.vue"), "utf8");
const sourceCoverageTest = readFileSync(resolve(currentDirectory, "../i18n/sourceCoverage.test.ts"), "utf8");

test("PresetsPage loads persisted node presets into a searchable management surface", () => {
  assert.match(componentSource, /import \{ fetchPresets \} from "@\/api\/presets";/);
  assert.match(componentSource, /const presets = ref<PresetDocument\[\]>\(\[\]\);/);
  assert.match(componentSource, /const filteredPresets = computed\(\(\) => filterPresetsForManagement/);
  assert.match(componentSource, /<ElInput[\s\S]*v-model="query"[\s\S]*class="presets-page__search"/);
  assert.match(componentSource, /<ElSegmented[\s\S]*v-model="kindFilter"[\s\S]*:options="kindOptions"/);
  assert.match(componentSource, /v-for="preset in filteredPresets"/);
  assert.match(componentSource, /preset\.definition\.node\.kind/);
});

test("PresetsPage participates in i18n source coverage", () => {
  assert.match(sourceCoverageTest, /"src\/pages\/PresetsPage\.vue"/);
});

test("PresetsPage prevents management controls from overflowing narrow shells", () => {
  assert.match(componentSource, /\.presets-page \{[\s\S]*min-width:\s*0;/);
  assert.match(componentSource, /\.presets-page__segments \{[\s\S]*max-width:\s*100%;[\s\S]*overflow-x:\s*auto;/);
  assert.match(componentSource, /@media \(max-width:\s*700px\) \{[\s\S]*\.presets-page__refresh \{[\s\S]*width:\s*100%;/);
});
