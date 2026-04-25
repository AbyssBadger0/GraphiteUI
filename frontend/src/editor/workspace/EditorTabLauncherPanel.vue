<template>
  <div class="editor-tab-launcher-panel">
    <div class="editor-tab-launcher-panel__header">
      <div class="editor-tab-launcher-panel__eyebrow">新建图</div>
      <div class="editor-tab-launcher-panel__hint">选择一个入口开始编辑</div>
    </div>

    <button type="button" class="editor-tab-launcher-panel__entry" @click="$emit('create-new')">
      <span class="editor-tab-launcher-panel__entry-icon" aria-hidden="true">
        <ElIcon><DocumentAdd /></ElIcon>
      </span>
      <div class="editor-tab-launcher-panel__entry-copy">
        <div class="editor-tab-launcher-panel__entry-title">新建空白图</div>
        <div class="editor-tab-launcher-panel__entry-meta">从空白工作流开始</div>
      </div>
      <ElIcon class="editor-tab-launcher-panel__entry-arrow" aria-hidden="true"><ArrowRight /></ElIcon>
    </button>

    <div class="editor-tab-launcher-panel__section">
      <button
        type="button"
        class="editor-tab-launcher-panel__entry"
        :class="{ 'editor-tab-launcher-panel__entry--active': expandedSection === 'template' }"
        @click="toggleSection('template')"
      >
        <span class="editor-tab-launcher-panel__entry-icon" aria-hidden="true">
          <ElIcon><CollectionTag /></ElIcon>
        </span>
        <div class="editor-tab-launcher-panel__entry-copy">
          <div class="editor-tab-launcher-panel__entry-title">从模板新建</div>
          <div class="editor-tab-launcher-panel__entry-meta">选择预设模板作为起点</div>
        </div>
        <ElIcon
          class="editor-tab-launcher-panel__entry-arrow"
          :class="{ 'editor-tab-launcher-panel__entry-arrow--open': expandedSection === 'template' }"
          aria-hidden="true"
        >
          <ArrowRight />
        </ElIcon>
      </button>
      <div
        v-if="expandedSection === 'template'"
        class="editor-tab-launcher-panel__option-list"
        role="listbox"
        aria-label="可用模板"
      >
        <button
          v-for="option in templateOptions"
          :key="option.value"
          type="button"
          class="editor-tab-launcher-panel__option"
          @click="selectTemplate(option.value)"
        >
          <span class="editor-tab-launcher-panel__option-label">{{ option.label }}</span>
          <span class="editor-tab-launcher-panel__option-meta">{{ option.value }}</span>
        </button>
        <div v-if="templateOptions.length === 0" class="editor-tab-launcher-panel__empty">
          {{ templatePlaceholder }}
        </div>
      </div>
    </div>

    <div class="editor-tab-launcher-panel__section">
      <button
        type="button"
        class="editor-tab-launcher-panel__entry"
        :class="{ 'editor-tab-launcher-panel__entry--active': expandedSection === 'graph' }"
        @click="toggleSection('graph')"
      >
        <span class="editor-tab-launcher-panel__entry-icon" aria-hidden="true">
          <ElIcon><FolderOpened /></ElIcon>
        </span>
        <div class="editor-tab-launcher-panel__entry-copy">
          <div class="editor-tab-launcher-panel__entry-title">打开已有图</div>
          <div class="editor-tab-launcher-panel__entry-meta">继续编辑已保存工作流</div>
        </div>
        <ElIcon
          class="editor-tab-launcher-panel__entry-arrow"
          :class="{ 'editor-tab-launcher-panel__entry-arrow--open': expandedSection === 'graph' }"
          aria-hidden="true"
        >
          <ArrowRight />
        </ElIcon>
      </button>
      <div
        v-if="expandedSection === 'graph'"
        class="editor-tab-launcher-panel__option-list"
        role="listbox"
        aria-label="已有图"
      >
        <button
          v-for="option in graphOptions"
          :key="option.value"
          type="button"
          class="editor-tab-launcher-panel__option"
          @click="selectGraph(option.value)"
        >
          <span class="editor-tab-launcher-panel__option-label">{{ option.label }}</span>
          <span class="editor-tab-launcher-panel__option-meta">{{ option.value }}</span>
        </button>
        <div v-if="graphOptions.length === 0" class="editor-tab-launcher-panel__empty">
          {{ graphPlaceholder }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, CollectionTag, DocumentAdd, FolderOpened } from "@element-plus/icons-vue";
import { ElIcon } from "element-plus";
import { ref } from "vue";

import type { WorkspaceSelectOption } from "./workspaceSelectModel";

const props = defineProps<{
  templateOptions: WorkspaceSelectOption[];
  graphOptions: WorkspaceSelectOption[];
  templatePlaceholder: string;
  graphPlaceholder: string;
}>();

const emit = defineEmits<{
  (event: "create-new"): void;
  (event: "create-from-template", templateId: string): void;
  (event: "open-graph", graphId: string): void;
}>();

const expandedSection = ref<"template" | "graph" | null>(null);

function toggleSection(section: "template" | "graph") {
  expandedSection.value = expandedSection.value === section ? null : section;
}

function selectTemplate(templateId: string) {
  emit("create-from-template", templateId);
  expandedSection.value = null;
}

function selectGraph(graphId: string) {
  emit("open-graph", graphId);
  expandedSection.value = null;
}
</script>

<style scoped>
.editor-tab-launcher-panel {
  box-sizing: border-box;
  width: min(336px, calc(100vw - 32px));
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--graphite-glass-border);
  border-radius: 22px;
  background: var(--graphite-glass-specular), var(--graphite-glass-lens), var(--graphite-glass-bg-strong);
  background-blend-mode: screen, screen, normal;
  box-shadow:
    var(--graphite-glass-shadow),
    var(--graphite-glass-highlight),
    var(--graphite-glass-rim);
  backdrop-filter: blur(26px) saturate(1.55) contrast(1.01);
  padding: 8px;
  display: grid;
  gap: 8px;
}

.editor-tab-launcher-panel__header {
  display: grid;
  gap: 2px;
  padding: 4px 8px 2px;
}

.editor-tab-launcher-panel__eyebrow {
  color: rgba(124, 45, 18, 0.96);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.editor-tab-launcher-panel__hint {
  color: rgba(60, 41, 20, 0.58);
  font-size: 0.78rem;
}

.editor-tab-launcher-panel__section {
  display: grid;
  gap: 8px;
}

.editor-tab-launcher-panel__entry {
  box-sizing: border-box;
  width: 100%;
  min-height: 68px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(213, 184, 146, 0.5);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    0 1px 1px rgba(92, 58, 28, 0.03);
  padding: 10px;
  color: rgba(72, 48, 29, 0.92);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.editor-tab-launcher-panel__entry:hover {
  border-color: rgba(177, 105, 46, 0.36);
  background: rgba(255, 255, 255, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 6px 16px rgba(92, 58, 28, 0.055);
  color: rgba(104, 55, 24, 0.98);
  transform: translateY(-1px);
}

.editor-tab-launcher-panel__entry:focus-visible {
  outline: none;
  border-color: rgba(154, 52, 18, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 0 0 3px rgba(201, 107, 31, 0.14);
}

.editor-tab-launcher-panel__entry--active {
  border-color: rgba(154, 52, 18, 0.42);
  background: rgba(255, 255, 255, 0.56);
  color: rgba(111, 52, 22, 1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 3px 0 0 rgba(154, 52, 18, 0.68),
    0 8px 18px rgba(92, 58, 28, 0.055);
}

.editor-tab-launcher-panel__entry-icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(213, 184, 146, 0.52);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.48);
  color: rgba(154, 52, 18, 0.92);
  box-shadow: var(--graphite-glass-highlight);
}

.editor-tab-launcher-panel__entry-arrow {
  justify-self: end;
  color: rgba(124, 45, 18, 0.46);
  transition: color 160ms ease, transform 160ms ease;
}

.editor-tab-launcher-panel__entry:hover .editor-tab-launcher-panel__entry-arrow,
.editor-tab-launcher-panel__entry--active .editor-tab-launcher-panel__entry-arrow {
  color: rgba(124, 45, 18, 0.76);
}

.editor-tab-launcher-panel__entry-arrow--open {
  transform: rotate(90deg);
}

.editor-tab-launcher-panel__option-list {
  max-height: min(260px, 42vh);
  display: grid;
  gap: 6px;
  overflow-y: auto;
  padding: 0 4px 2px 56px;
  scrollbar-color: rgba(154, 52, 18, 0.28) transparent;
  scrollbar-width: thin;
}

.editor-tab-launcher-panel__option-list::-webkit-scrollbar {
  width: 8px;
}

.editor-tab-launcher-panel__option-list::-webkit-scrollbar-track {
  background: transparent;
}

.editor-tab-launcher-panel__option-list::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(154, 52, 18, 0.28);
  background-clip: content-box;
}

.editor-tab-launcher-panel__option {
  display: grid;
  gap: 2px;
  width: 100%;
  border: 1px solid rgba(213, 184, 146, 0.42);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.28);
  padding: 9px 11px;
  color: rgba(72, 48, 29, 0.9);
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
}

.editor-tab-launcher-panel__option:hover,
.editor-tab-launcher-panel__option:focus-visible {
  border-color: rgba(154, 52, 18, 0.34);
  background: rgba(255, 255, 255, 0.48);
  color: rgba(111, 52, 22, 1);
  outline: none;
  transform: translateX(2px);
}

.editor-tab-launcher-panel__option-label {
  overflow: hidden;
  font-size: 0.84rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-tab-launcher-panel__option-meta {
  overflow: hidden;
  color: rgba(60, 41, 20, 0.5);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-tab-launcher-panel__empty {
  border: 1px dashed rgba(213, 184, 146, 0.52);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.24);
  padding: 12px;
  color: rgba(60, 41, 20, 0.55);
  font-size: 0.78rem;
}

.editor-tab-launcher-panel__entry-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: currentColor;
}

.editor-tab-launcher-panel__entry-meta {
  margin-top: 4px;
  font-size: 0.78rem;
  color: rgba(60, 41, 20, 0.58);
  line-height: 1.35;
}

@media (max-width: 420px) {
  .editor-tab-launcher-panel__entry {
    grid-template-columns: 36px minmax(0, 1fr) 18px;
    gap: 10px;
  }

  .editor-tab-launcher-panel__entry-icon {
    width: 36px;
    height: 36px;
  }

  .editor-tab-launcher-panel__option-list {
    padding-left: 0;
  }
}
</style>
