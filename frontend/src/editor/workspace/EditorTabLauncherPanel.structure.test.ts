import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "EditorTabLauncherPanel.vue"), "utf8");
const entryButtonMatches = componentSource.match(/class="editor-tab-launcher-panel__entry"/g) ?? [];
const entryTitleMatches = componentSource.match(/class="editor-tab-launcher-panel__entry-title">/g) ?? [];
const entryIconMatches = componentSource.match(/class="editor-tab-launcher-panel__entry-icon"/g) ?? [];
const optionListMatches = componentSource.match(/class="editor-tab-launcher-panel__option-list"/g) ?? [];

test("EditorTabLauncherPanel offers blank, template, and existing-graph entry points behind the plus launcher", () => {
  assert.match(componentSource, /const expandedSection = ref<"template" \| "graph" \| null>\(null\);/);
  assert.match(componentSource, /@click="\$emit\('create-new'\)"/);
  assert.match(componentSource, /@click="toggleSection\('template'\)"/);
  assert.match(componentSource, /@click="toggleSection\('graph'\)"/);
  assert.equal(entryButtonMatches.length, 3);
  assert.equal(entryTitleMatches.length, 3);
  assert.match(componentSource, /class="editor-tab-launcher-panel__entry-title">新建空白图</);
  assert.match(componentSource, /class="editor-tab-launcher-panel__entry-title">从模板新建</);
  assert.match(componentSource, /class="editor-tab-launcher-panel__entry-title">打开已有图</);
  assert.equal(optionListMatches.length, 2);
  assert.match(componentSource, /v-if="expandedSection === 'template'"[\s\S]*class="editor-tab-launcher-panel__option-list"/);
  assert.match(componentSource, /v-for="option in templateOptions"[\s\S]*@click="selectTemplate\(option\.value\)"/);
  assert.match(componentSource, /v-if="expandedSection === 'graph'"[\s\S]*class="editor-tab-launcher-panel__option-list"/);
  assert.match(componentSource, /v-for="option in graphOptions"[\s\S]*@click="selectGraph\(option\.value\)"/);
  assert.doesNotMatch(componentSource, /import WorkspaceSelect from/);
  assert.doesNotMatch(componentSource, /<WorkspaceSelect/);
});

test("EditorTabLauncherPanel keeps the launcher light by using compact cards instead of a full dialog", () => {
  assert.match(componentSource, /class="editor-tab-launcher-panel__entry"/);
  assert.match(componentSource, /\.editor-tab-launcher-panel \{[\s\S]*width:\s*min\(336px,\s*calc\(100vw - 32px\)\);/);
  assert.match(componentSource, /\.editor-tab-launcher-panel__option-list \{[\s\S]*max-height:\s*min\(260px,\s*42vh\);[\s\S]*overflow-y:\s*auto;/);
  assert.doesNotMatch(componentSource, /<ElDialog/);
  assert.doesNotMatch(componentSource, /position:\s*fixed;/);
});

test("EditorTabLauncherPanel uses the shared liquid glass visual language", () => {
  assert.match(componentSource, /import \{ ElIcon \} from "element-plus";/);
  assert.match(componentSource, /import \{[\s\S]*ArrowRight[\s\S]*CollectionTag[\s\S]*DocumentAdd[\s\S]*FolderOpened[\s\S]*\} from "@element-plus\/icons-vue";/);
  assert.equal(entryIconMatches.length, 3);
  assert.match(componentSource, /<ElIcon><DocumentAdd \/><\/ElIcon>/);
  assert.match(componentSource, /<ElIcon><CollectionTag \/><\/ElIcon>/);
  assert.match(componentSource, /<ElIcon><FolderOpened \/><\/ElIcon>/);
  assert.match(componentSource, /\.editor-tab-launcher-panel \{[\s\S]*border:\s*1px solid var\(--graphite-glass-border\);/);
  assert.match(
    componentSource,
    /\.editor-tab-launcher-panel \{[\s\S]*background:\s*var\(--graphite-glass-specular\),\s*var\(--graphite-glass-lens\),\s*var\(--graphite-glass-bg-strong\);/,
  );
  assert.match(componentSource, /\.editor-tab-launcher-panel \{[\s\S]*box-shadow:[\s\S]*var\(--graphite-glass-rim\);/);
  assert.match(componentSource, /\.editor-tab-launcher-panel \{[\s\S]*backdrop-filter:\s*blur\(26px\) saturate\(1\.55\) contrast\(1\.01\);/);
  assert.match(componentSource, /\.editor-tab-launcher-panel__entry \{[\s\S]*grid-template-columns:\s*40px minmax\(0,\s*1fr\) 18px;/);
  assert.match(componentSource, /\.editor-tab-launcher-panel__entry-icon \{[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.48\);/);
  assert.match(componentSource, /\.editor-tab-launcher-panel__entry--active \{[\s\S]*border-color:\s*rgba\(154,\s*52,\s*18,\s*0\.42\);/);
  assert.match(componentSource, /\.editor-tab-launcher-panel__entry-arrow--open \{[\s\S]*transform:\s*rotate\(90deg\);/);
  assert.match(componentSource, /\.editor-tab-launcher-panel__option \{[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.28\);/);
});

test("EditorTabLauncherPanel option rows emit immediately and collapse the expanded section", () => {
  assert.match(
    componentSource,
    /function selectTemplate\(templateId: string\) \{[\s\S]*emit\("create-from-template", templateId\);[\s\S]*expandedSection\.value = null;[\s\S]*\}/,
  );
  assert.match(
    componentSource,
    /function selectGraph\(graphId: string\) \{[\s\S]*emit\("open-graph", graphId\);[\s\S]*expandedSection\.value = null;[\s\S]*\}/,
  );
  assert.doesNotMatch(componentSource, /selectedTemplateId/);
  assert.doesNotMatch(componentSource, /selectedGraphId/);
  assert.doesNotMatch(componentSource, /watch\(/);
});
