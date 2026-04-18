<template>
  <aside class="editor-state-panel" :class="{ 'editor-state-panel--open': open }">
    <button
      v-if="!open"
      type="button"
      class="editor-state-panel__collapsed"
      aria-label="Open state panel"
      @click="$emit('toggle')"
    >
      <span class="editor-state-panel__collapsed-label">State</span>
      <span class="editor-state-panel__collapsed-count">{{ view.count }}</span>
    </button>

    <template v-else>
      <header class="editor-state-panel__header">
        <div>
          <div class="editor-state-panel__eyebrow">Graph State</div>
          <h2 class="editor-state-panel__title">State Panel</h2>
          <p class="editor-state-panel__body">Browse the graph-level state objects that travel through the workflow.</p>
        </div>
        <button type="button" class="editor-state-panel__collapse" aria-label="Collapse state panel" @click="$emit('toggle')">
          <svg viewBox="0 0 16 16" class="editor-state-panel__collapse-icon" aria-hidden="true">
            <path d="M10.5 3.5 5.5 8l5 4.5" />
          </svg>
        </button>
      </header>

      <div class="editor-state-panel__summary">
        <div>
          <div class="editor-state-panel__summary-title">{{ view.count }} state objects</div>
          <div class="editor-state-panel__summary-body">These values are stored with the graph and restored in the editor.</div>
        </div>
      </div>

      <div class="editor-state-panel__content">
        <div v-if="view.rows.length === 0" class="editor-state-panel__empty">
          <div class="editor-state-panel__empty-title">{{ view.emptyTitle }}</div>
          <div class="editor-state-panel__empty-body">{{ view.emptyBody }}</div>
        </div>

        <article v-for="row in view.rows" :key="row.key" class="editor-state-panel__card">
          <div class="editor-state-panel__card-head">
            <div class="editor-state-panel__card-main">
              <div class="editor-state-panel__card-title">{{ row.title }}</div>
              <div class="editor-state-panel__card-key">{{ row.key }}</div>
            </div>
            <span class="editor-state-panel__card-type">{{ row.typeLabel }}</span>
          </div>

          <p v-if="row.description" class="editor-state-panel__card-description">{{ row.description }}</p>

          <div class="editor-state-panel__card-bindings">
            <span class="editor-state-panel__binding-chip editor-state-panel__binding-chip--readers">{{ row.readerCount }} readers</span>
            <span class="editor-state-panel__binding-chip editor-state-panel__binding-chip--writers">{{ row.writerCount }} writers</span>
          </div>

          <div v-if="row.readers.length > 0 || row.writers.length > 0" class="editor-state-panel__binding-groups">
            <div v-if="row.readers.length > 0" class="editor-state-panel__binding-group">
              <div class="editor-state-panel__binding-group-title">Readers</div>
              <div class="editor-state-panel__binding-list">
                <span v-for="binding in row.readers" :key="`reader-${binding.nodeId}`" class="editor-state-panel__binding-token">
                  {{ binding.nodeLabel }}
                </span>
              </div>
            </div>

            <div v-if="row.writers.length > 0" class="editor-state-panel__binding-group">
              <div class="editor-state-panel__binding-group-title">Writers</div>
              <div class="editor-state-panel__binding-list">
                <span v-for="binding in row.writers" :key="`writer-${binding.nodeId}`" class="editor-state-panel__binding-token">
                  {{ binding.nodeLabel }}
                </span>
              </div>
            </div>
          </div>

          <div class="editor-state-panel__card-value">
            <div class="editor-state-panel__card-value-label">Value</div>
            <pre class="editor-state-panel__card-value-preview">{{ row.valuePreview }}</pre>
          </div>
        </article>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { buildStatePanelViewModel } from "./statePanelViewModel";
import type { GraphDocument, GraphPayload } from "@/types/node-system";

const props = defineProps<{
  open: boolean;
  document: GraphPayload | GraphDocument;
}>();

defineEmits<{
  (event: "toggle"): void;
}>();

const view = computed(() => buildStatePanelViewModel(props.document));
</script>

<style scoped>
.editor-state-panel {
  min-height: 0;
  height: 100%;
  border-left: 1px solid rgba(154, 52, 18, 0.16);
  background: rgba(255, 250, 241, 0.78);
  backdrop-filter: blur(20px);
}

.editor-state-panel--open {
  display: flex;
  flex-direction: column;
}

.editor-state-panel__collapsed {
  display: flex;
  height: 100%;
  width: 100%;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.editor-state-panel__collapsed-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.84);
}

.editor-state-panel__collapsed-count {
  display: inline-flex;
  min-width: 24px;
  justify-content: center;
  border: 1px solid rgba(154, 52, 18, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  padding: 2px 8px;
  font-size: 0.68rem;
  color: rgba(60, 41, 20, 0.72);
}

.editor-state-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(154, 52, 18, 0.14);
  padding: 16px;
}

.editor-state-panel__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.82);
}

.editor-state-panel__title {
  margin: 8px 0 0;
  font-size: 1.3rem;
  color: #1f2937;
}

.editor-state-panel__body {
  margin: 8px 0 0;
  line-height: 1.6;
  color: rgba(60, 41, 20, 0.72);
}

.editor-state-panel__collapse {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(154, 52, 18, 0.14);
  border-radius: 999px;
  background: rgba(255, 252, 247, 0.92);
  color: rgba(60, 41, 20, 0.72);
  cursor: pointer;
}

.editor-state-panel__collapse-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}

.editor-state-panel__summary {
  margin: 16px;
  border: 1px solid rgba(154, 52, 18, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  padding: 14px;
  box-shadow: 0 10px 24px rgba(60, 41, 20, 0.06);
}

.editor-state-panel__summary-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
}

.editor-state-panel__summary-body {
  margin-top: 6px;
  font-size: 0.82rem;
  line-height: 1.5;
  color: rgba(60, 41, 20, 0.68);
}

.editor-state-panel__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
  display: grid;
  gap: 14px;
  align-content: start;
}

.editor-state-panel__empty {
  display: grid;
  place-items: center;
  min-height: 240px;
  border: 1px dashed rgba(154, 52, 18, 0.24);
  border-radius: 28px;
  background: rgba(255, 250, 241, 0.72);
  padding: 24px;
  text-align: center;
}

.editor-state-panel__empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.editor-state-panel__empty-body {
  margin-top: 8px;
  font-size: 0.88rem;
  line-height: 1.6;
  color: rgba(60, 41, 20, 0.72);
}

.editor-state-panel__card {
  border: 1px solid rgba(154, 52, 18, 0.14);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.editor-state-panel__card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.editor-state-panel__card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.editor-state-panel__card-key {
  margin-top: 4px;
  font-size: 0.82rem;
  color: rgba(60, 41, 20, 0.62);
}

.editor-state-panel__card-bindings {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-state-panel__binding-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(154, 52, 18, 0.14);
  padding: 0 10px;
  font-size: 0.78rem;
  color: rgba(60, 41, 20, 0.72);
  background: rgba(255, 250, 241, 0.92);
}

.editor-state-panel__binding-chip--readers {
  border-color: rgba(37, 99, 235, 0.16);
  color: rgba(37, 99, 235, 0.88);
  background: rgba(239, 246, 255, 0.9);
}

.editor-state-panel__binding-chip--writers {
  border-color: rgba(217, 119, 6, 0.16);
  color: rgba(217, 119, 6, 0.9);
  background: rgba(255, 247, 237, 0.92);
}

.editor-state-panel__binding-groups {
  display: grid;
  gap: 10px;
}

.editor-state-panel__binding-group {
  display: grid;
  gap: 6px;
}

.editor-state-panel__binding-group-title {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.74);
}

.editor-state-panel__binding-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-state-panel__binding-token {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(154, 52, 18, 0.14);
  padding: 0 10px;
  font-size: 0.78rem;
  color: rgba(60, 41, 20, 0.82);
  background: rgba(255, 250, 241, 0.92);
}

.editor-state-panel__card-type {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(154, 52, 18, 0.16);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.82);
}

.editor-state-panel__card-description {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(60, 41, 20, 0.72);
}

.editor-state-panel__card-value {
  border: 1px solid rgba(154, 52, 18, 0.12);
  border-radius: 16px;
  background: rgba(248, 242, 234, 0.72);
  padding: 12px 14px;
}

.editor-state-panel__card-value-label {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.8);
}

.editor-state-panel__card-value-preview {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  line-height: 1.55;
  color: #1f2937;
}
</style>
