<template>
  <AppShell>
    <section class="presets-page">
      <header class="presets-page__hero">
        <div>
          <div class="presets-page__eyebrow">{{ t("presets.eyebrow") }}</div>
          <h2 class="presets-page__title">{{ t("presets.title") }}</h2>
          <p class="presets-page__body">{{ t("presets.body") }}</p>
        </div>
        <button type="button" class="presets-page__refresh" :disabled="loading" @click="loadPresets">
          {{ loading ? t("presets.refreshing") : t("presets.refresh") }}
        </button>
      </header>

      <section class="presets-page__overview" :aria-label="t('presets.overviewLabel')">
        <article class="presets-page__metric">
          <span>{{ t("presets.total") }}</span>
          <strong>{{ overview.total }}</strong>
        </article>
        <article class="presets-page__metric">
          <span>{{ t("presets.agents") }}</span>
          <strong>{{ overview.agent }}</strong>
        </article>
        <article class="presets-page__metric">
          <span>{{ t("presets.stateFields") }}</span>
          <strong>{{ overview.stateFields }}</strong>
        </article>
        <article class="presets-page__metric">
          <span>{{ t("presets.latestUpdate") }}</span>
          <strong>{{ formatTimestamp(overview.latestUpdatedAt) }}</strong>
        </article>
      </section>

      <section class="presets-page__toolbar" :aria-label="t('presets.filterLabel')">
        <label class="presets-page__search-field">
          <span>{{ t("common.search") }}</span>
          <ElInput v-model="query" class="presets-page__search" :placeholder="t('presets.searchPlaceholder')" clearable />
        </label>
        <div class="presets-page__kind-filter">
          <span>{{ t("presets.kindFilter") }}</span>
          <ElSegmented v-model="kindFilter" class="presets-page__segments" :options="kindOptions" />
        </div>
      </section>

      <section class="presets-page__list">
        <article v-if="loading" class="presets-page__empty">{{ t("common.loading") }}</article>
        <article v-else-if="error" class="presets-page__empty">{{ t("common.failedToLoad", { error }) }}</article>
        <article v-else-if="filteredPresets.length === 0" class="presets-page__empty">
          <p>{{ t("presets.empty") }}</p>
          <RouterLink class="presets-page__empty-action" to="/editor">{{ t("presets.openEditor") }}</RouterLink>
        </article>
        <template v-else>
          <div class="presets-page__result-count">{{ t("presets.resultCount", { count: filteredPresets.length }) }}</div>
          <article v-for="preset in filteredPresets" :key="preset.presetId" class="presets-page__card">
            <div class="presets-page__card-main">
              <div class="presets-page__card-heading">
                <div>
                  <div class="presets-page__id">{{ preset.presetId }}</div>
                  <h3>{{ preset.definition.label }}</h3>
                </div>
                <span class="presets-page__kind">{{ t(`presets.${preset.definition.node.kind}`) }}</span>
              </div>
              <p>{{ preset.definition.description }}</p>
              <div class="presets-page__meta">
                <span>{{ t("presets.nodeKind") }}: {{ preset.definition.node.name }}</span>
                <span>{{ t("presets.sourcePreset") }}: {{ preset.sourcePresetId ?? t("common.none") }}</span>
                <span>{{ t("presets.updated") }}: {{ formatTimestamp(preset.updatedAt) }}</span>
                <span>{{ t("presets.created") }}: {{ formatTimestamp(preset.createdAt) }}</span>
              </div>
            </div>

            <div class="presets-page__columns">
              <section>
                <h4>{{ t("presets.stateSchema") }}</h4>
                <div class="presets-page__badges">
                  <span v-for="stateKey in stateSchemaKeys(preset)" :key="stateKey">{{ stateKey }}</span>
                  <span v-if="stateSchemaKeys(preset).length === 0">{{ t("common.none") }}</span>
                </div>
              </section>
              <section>
                <h4>{{ t("presets.reads") }}</h4>
                <div class="presets-page__badges">
                  <span v-for="binding in preset.definition.node.reads" :key="`read-${binding.state}`">{{ binding.state }}</span>
                  <span v-if="preset.definition.node.reads.length === 0">{{ t("presets.noBindings") }}</span>
                </div>
              </section>
              <section>
                <h4>{{ t("presets.writes") }}</h4>
                <div class="presets-page__badges">
                  <span v-for="binding in preset.definition.node.writes" :key="`write-${binding.state}`">{{ binding.state }}</span>
                  <span v-if="preset.definition.node.writes.length === 0">{{ t("presets.noBindings") }}</span>
                </div>
              </section>
              <section>
                <h4>{{ t("presets.skills") }}</h4>
                <div class="presets-page__badges">
                  <span v-for="skill in presetSkills(preset)" :key="skill">{{ skill }}</span>
                  <span v-if="presetSkills(preset).length === 0">{{ t("common.none") }}</span>
                </div>
              </section>
            </div>
          </article>
        </template>
      </section>
    </section>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElInput, ElSegmented } from "element-plus";
import { useI18n } from "vue-i18n";

import { fetchPresets } from "@/api/presets";
import AppShell from "@/layouts/AppShell.vue";
import type { PresetDocument } from "@/types/node-system";

import {
  buildPresetKindOptions,
  buildPresetOverview,
  filterPresetsForManagement,
  type PresetKindFilter,
} from "./presetsPageModel.ts";

const presets = ref<PresetDocument[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const query = ref("");
const kindFilter = ref<PresetKindFilter>("all");
const { t, locale } = useI18n();

const overview = computed(() => buildPresetOverview(presets.value));
const filteredPresets = computed(() => filterPresetsForManagement(presets.value, { query: query.value, kind: kindFilter.value }));
const kindOptions = computed(() =>
  buildPresetKindOptions().map((value) => ({
    value,
    label: value === "all" ? t("presets.allKinds") : t(`presets.${value}`),
  })),
);

async function loadPresets() {
  loading.value = true;
  try {
    presets.value = await fetchPresets();
    error.value = null;
  } catch (fetchError) {
    error.value = fetchError instanceof Error ? fetchError.message : t("common.loading");
  } finally {
    loading.value = false;
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return t("common.none");
  }
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function stateSchemaKeys(preset: PresetDocument) {
  return Object.keys(preset.definition.state_schema);
}

function presetSkills(preset: PresetDocument) {
  return preset.definition.node.kind === "agent" ? preset.definition.node.config.skills : [];
}

onMounted(loadPresets);
</script>

<style scoped>
.presets-page {
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.presets-page__hero,
.presets-page__toolbar,
.presets-page__metric,
.presets-page__card,
.presets-page__empty {
  min-width: 0;
  border: 1px solid var(--graphite-border);
  border-radius: 24px;
  background: var(--graphite-surface-panel);
  box-shadow: var(--graphite-shadow-panel);
}

.presets-page__hero > *,
.presets-page__search-field,
.presets-page__kind-filter,
.presets-page__card-main,
.presets-page__card-heading > *,
.presets-page__columns section {
  min-width: 0;
}

.presets-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
}

.presets-page__eyebrow,
.presets-page__id {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.78);
}

.presets-page__title {
  margin: 8px 0 10px;
  color: var(--graphite-text-strong);
  font-family: var(--graphite-font-display);
  font-size: 2rem;
  line-height: 1.16;
  overflow-wrap: anywhere;
}

.presets-page__body,
.presets-page__card p,
.presets-page__meta,
.presets-page__empty,
.presets-page__result-count {
  color: rgba(60, 41, 20, 0.72);
  line-height: 1.6;
}

.presets-page__body,
.presets-page__card p {
  margin: 0;
  overflow-wrap: anywhere;
}

.presets-page__refresh,
.presets-page__empty-action {
  border: 1px solid rgba(154, 52, 18, 0.2);
  border-radius: 14px;
  padding: 10px 14px;
  background: rgba(255, 248, 240, 0.96);
  color: rgb(154, 52, 18);
  cursor: pointer;
  text-decoration: none;
  transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.presets-page__refresh:hover,
.presets-page__empty-action:hover {
  border-color: rgba(154, 52, 18, 0.28);
  background: rgba(255, 250, 242, 1);
  transform: translateY(-1px);
}

.presets-page__refresh:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
}

.presets-page__overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.presets-page__metric {
  padding: 16px;
  background: rgba(255, 255, 255, 0.62);
}

.presets-page__metric span {
  color: rgba(60, 41, 20, 0.68);
  font-size: 0.84rem;
}

.presets-page__metric strong {
  display: block;
  margin-top: 8px;
  color: var(--graphite-text-strong);
  font-size: 1.35rem;
}

.presets-page__toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 14px;
  align-items: end;
  padding: 16px;
  background: var(--graphite-glass-specular), var(--graphite-glass-lens), var(--graphite-glass-bg-strong);
}

.presets-page__search-field,
.presets-page__kind-filter {
  display: grid;
  gap: 8px;
  color: rgba(60, 41, 20, 0.72);
}

.presets-page__search {
  width: 100%;
}

.presets-page__segments {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
}

.presets-page__segments :deep(.el-segmented__group) {
  gap: 4px;
}

.presets-page__segments :deep(.el-segmented__item.is-selected) {
  color: var(--graphite-accent-strong);
}

.presets-page__list {
  display: grid;
  gap: 12px;
}

.presets-page__empty {
  padding: 24px;
}

.presets-page__card {
  display: grid;
  gap: 16px;
  padding: 18px;
  background: var(--graphite-surface-card);
}

.presets-page__card-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.presets-page__card h3,
.presets-page__card h4 {
  margin: 0;
}

.presets-page__card h3 {
  margin-top: 6px;
  color: var(--graphite-text-strong);
}

.presets-page__card h4 {
  color: rgba(60, 41, 20, 0.76);
  font-size: 0.86rem;
}

.presets-page__kind,
.presets-page__badges span {
  border: 1px solid rgba(154, 52, 18, 0.08);
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(255, 248, 240, 0.92);
  color: rgb(154, 52, 18);
  font-family: var(--graphite-font-mono);
  font-size: 0.82rem;
}

.presets-page__meta,
.presets-page__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.presets-page__meta {
  margin-top: 12px;
  font-family: var(--graphite-font-mono);
  font-size: 0.82rem;
}

.presets-page__columns {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.presets-page__columns section {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}

@media (max-width: 1100px) {
  .presets-page__overview,
  .presets-page__columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .presets-page__toolbar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .presets-page__hero,
  .presets-page__card-heading {
    display: grid;
  }

  .presets-page__refresh {
    width: 100%;
  }

  .presets-page__title {
    font-size: 1.6rem;
  }

  .presets-page {
    max-width: calc(100vw - var(--app-sidebar-width) - 56px);
  }

  .presets-page__overview,
  .presets-page__columns {
    grid-template-columns: 1fr;
  }
}
</style>
