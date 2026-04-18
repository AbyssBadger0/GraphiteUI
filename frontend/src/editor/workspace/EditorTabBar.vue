<template>
  <header class="editor-tab-bar">
    <div class="editor-tab-bar__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.tabId"
        type="button"
        class="editor-tab-bar__tab"
        :class="{ 'editor-tab-bar__tab--active': tab.tabId === activeTabId }"
        @click="$emit('activate-tab', tab.tabId)"
      >
        <span class="editor-tab-bar__tab-title">{{ tab.title }}</span>
        <span class="editor-tab-bar__tab-status">
          <span
            v-if="tab.dirty"
            class="editor-tab-bar__dirty-dot"
            :class="{ 'editor-tab-bar__dirty-dot--hidden': tab.tabId === activeTabId }"
          />
          <button
            type="button"
            class="editor-tab-bar__close"
            :class="{ 'editor-tab-bar__close--visible': tab.tabId === activeTabId }"
            aria-label="关闭标签页"
            @click.stop="$emit('close-tab', tab.tabId)"
          >
            ×
          </button>
        </span>
      </button>
    </div>

    <div class="editor-tab-bar__controls">
      <input
        v-if="isEditingGraphName"
        ref="graphNameInput"
        v-model="draftGraphName"
        class="editor-tab-bar__name-input"
        @blur="commitGraphName"
        @keydown.enter.prevent="commitGraphName"
        @keydown.esc.prevent="cancelGraphNameEdit"
      />
      <button v-else type="button" class="editor-tab-bar__graph-name" :title="activeGraphName" @dblclick="startGraphNameEdit">
        {{ activeGraphName }}
      </button>

      <button
        type="button"
        class="editor-tab-bar__state-pill"
        :class="{ 'editor-tab-bar__state-pill--active': isStatePanelOpen }"
        @click="$emit('toggle-state-panel')"
      >
        <span>State</span>
        <span class="editor-tab-bar__state-count">{{ activeStateCount }}</span>
      </button>

      <button type="button" class="editor-tab-bar__action" @click="$emit('create-new')">新建图</button>

      <WorkspaceSelect
        v-model="selectedTemplateId"
        :options="templateOptions"
        placeholder="从模板创建"
        min-width-class-name="editor-tab-bar__select"
      />

      <WorkspaceSelect
        v-model="selectedGraphId"
        :options="graphOptions"
        placeholder="打开已有图"
        min-width-class-name="editor-tab-bar__select editor-tab-bar__select--wide"
      />

      <button type="button" class="editor-tab-bar__action" @click="$emit('save-active-graph')">Save</button>
      <button type="button" class="editor-tab-bar__action" @click="$emit('validate-active-graph')">Validate</button>
      <button type="button" class="editor-tab-bar__action editor-tab-bar__action--primary" @click="$emit('run-active-graph')">
        Run
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import type { EditorWorkspaceTab } from "@/lib/editor-workspace";
import type { GraphDocument, TemplateRecord } from "@/types/node-system";
import WorkspaceSelect from "./WorkspaceSelect.vue";
import { buildWorkspaceSelectOptions } from "./workspaceSelectModel";

const props = defineProps<{
  tabs: EditorWorkspaceTab[];
  activeTabId: string | null;
  templates: TemplateRecord[];
  graphs: GraphDocument[];
  activeGraphName: string;
  activeStateCount: number;
  isStatePanelOpen: boolean;
}>();

const emit = defineEmits<{
  (event: "activate-tab", tabId: string): void;
  (event: "close-tab", tabId: string): void;
  (event: "create-new"): void;
  (event: "create-from-template", templateId: string): void;
  (event: "open-graph", graphId: string): void;
  (event: "rename-active-graph", name: string): void;
  (event: "toggle-state-panel"): void;
  (event: "save-active-graph"): void;
  (event: "validate-active-graph"): void;
  (event: "run-active-graph"): void;
}>();

const selectedTemplateId = ref("");
const selectedGraphId = ref("");
const isEditingGraphName = ref(false);
const draftGraphName = ref(props.activeGraphName);
const graphNameInput = ref<HTMLInputElement | null>(null);

const templateOptions = computed(() =>
  buildWorkspaceSelectOptions(
    props.templates.map((template) => ({
      value: template.template_id,
      label: template.label,
    })),
  ),
);

const graphOptions = computed(() =>
  buildWorkspaceSelectOptions(
    props.graphs.map((graph) => ({
      value: graph.graph_id,
      label: graph.name,
    })),
  ),
);

watch(
  () => props.activeGraphName,
  (nextName) => {
    if (!isEditingGraphName.value) {
      draftGraphName.value = nextName;
    }
  },
);

watch(selectedTemplateId, (nextValue) => {
  if (!nextValue) {
    return;
  }
  emit("create-from-template", nextValue);
  selectedTemplateId.value = "";
});

watch(selectedGraphId, (nextValue) => {
  if (!nextValue) {
    return;
  }
  emit("open-graph", nextValue);
  selectedGraphId.value = "";
});

async function startGraphNameEdit() {
  isEditingGraphName.value = true;
  await nextTick();
  graphNameInput.value?.focus();
  graphNameInput.value?.select();
}

function commitGraphName() {
  const nextName = draftGraphName.value.trim();
  if (nextName && nextName !== props.activeGraphName) {
    emit("rename-active-graph", nextName);
  }
  isEditingGraphName.value = false;
}

function cancelGraphNameEdit() {
  draftGraphName.value = props.activeGraphName;
  isEditingGraphName.value = false;
}
</script>

<style scoped>
.editor-tab-bar {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(154, 52, 18, 0.14);
  border-radius: 28px;
  background: rgba(255, 250, 241, 0.9);
  padding: 14px 16px;
  box-shadow: 0 18px 36px rgba(154, 52, 18, 0.08);
}

.editor-tab-bar__tabs {
  display: flex;
  min-width: 0;
  gap: 8px;
  overflow-x: auto;
}

.editor-tab-bar__tab {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  position: relative;
  height: 38px;
  border: 1px solid rgba(154, 52, 18, 0.1);
  border-radius: 14px;
  padding: 0 12px;
  background: rgba(255, 250, 241, 0.64);
  color: #3c2914;
  cursor: pointer;
  transition: 150ms ease;
}

.editor-tab-bar__tab--active {
  border-color: rgba(154, 52, 18, 0.22);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 18px rgba(154, 52, 18, 0.08);
}

.editor-tab-bar__tab-title {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-tab-bar__tab-status {
  position: relative;
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
}

.editor-tab-bar__dirty-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgb(154, 52, 18);
  transition: opacity 140ms ease;
}

.editor-tab-bar__dirty-dot--hidden,
.editor-tab-bar__tab:hover .editor-tab-bar__dirty-dot {
  opacity: 0;
}

.editor-tab-bar__close {
  position: absolute;
  border: none;
  border-radius: 999px;
  width: 20px;
  height: 20px;
  background: transparent;
  color: rgb(154, 52, 18);
  cursor: pointer;
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 140ms ease, transform 140ms ease, background-color 140ms ease;
}

.editor-tab-bar__tab:hover .editor-tab-bar__close,
.editor-tab-bar__close--visible {
  opacity: 1;
  transform: scale(1);
}

.editor-tab-bar__close:hover {
  background: rgba(154, 52, 18, 0.08);
}

.editor-tab-bar__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.editor-tab-bar__graph-name,
.editor-tab-bar__name-input,
.editor-tab-bar__state-pill,
.editor-tab-bar__select,
.editor-tab-bar__action {
  min-height: 38px;
  border: 1px solid rgba(154, 52, 18, 0.14);
  border-radius: 16px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.82);
  color: #3c2914;
}

.editor-tab-bar__graph-name,
.editor-tab-bar__name-input {
  min-width: 220px;
  text-align: left;
}

.editor-tab-bar__graph-name {
  cursor: pointer;
}

.editor-tab-bar__state-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  cursor: pointer;
}

.editor-tab-bar__state-pill--active {
  border-color: rgba(154, 52, 18, 0.24);
  background: rgba(255, 244, 240, 0.94);
  color: rgba(154, 52, 18, 0.92);
}

.editor-tab-bar__state-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid rgba(154, 52, 18, 0.16);
  border-radius: 999px;
  background: rgba(255, 250, 241, 0.92);
  color: rgba(60, 41, 20, 0.7);
  font-size: 0.72rem;
}

.editor-tab-bar__select {
  min-width: 180px;
}

.editor-tab-bar__select--wide {
  min-width: 200px;
}

.editor-tab-bar__action {
  cursor: pointer;
}

.editor-tab-bar__action--primary {
  background: rgba(154, 52, 18, 0.92);
  border-color: rgba(154, 52, 18, 0.92);
  color: rgba(255, 250, 241, 0.96);
}
</style>
