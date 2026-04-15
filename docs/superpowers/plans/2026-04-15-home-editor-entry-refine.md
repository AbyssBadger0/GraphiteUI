# Home Editor Entry Refine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the home page into a three-column entry surface, make `/editor` a symmetric template-and-graph landing page, and add a fully collapsible left sidebar.

**Architecture:** Reuse the existing run/graph/template API payloads and keep the current visual language, but rebalance information architecture. The home page becomes a compact entry header plus three cards, the editor landing becomes a clean two-column directory page, and the shell owns a persistent sidebar collapsed state so page alignment is solved at the layout level instead of patching each page.

**Tech Stack:** Next.js App Router, React 19, TypeScript, GraphiteUI existing UI components, backend `/api/graphs`, `/api/runs`, `/api/templates`

---

### Task 1: Record the new scope and validation limits

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: Record that the active frontend task has shifted**

Update the planning files to state that the current focus is no longer just home/workspace merge, but the follow-up refinement:

- home becomes 3 columns
- `/editor` becomes symmetric template/graph landing
- shell gets collapsible sidebar

- [ ] **Step 2: Record the testing constraint**

Write down that `frontend/package.json` still has no test runner, so the verification path for this task remains:

```bash
cd frontend && npx tsc --noEmit
git diff --check
./scripts/start.sh
curl -I http://127.0.0.1:3477
curl -I http://127.0.0.1:3477/editor
curl -I http://127.0.0.1:3477/workspace
curl http://127.0.0.1:8765/health
```

### Task 2: Extend the home dashboard to three columns

**Files:**
- Modify: `frontend/components/workspace/workspace-dashboard-client.tsx`
- Modify: `frontend/components/providers/language-provider.tsx`
- Reference: `frontend/app/page.tsx`

- [ ] **Step 1: Add template data loading to the shared dashboard client**

Extend the existing loader to fetch templates alongside runs and graphs:

```ts
const [graphPayload, runPayload, templatePayload] = await Promise.all([
  apiGet<CanonicalGraphPayload[]>("/api/graphs"),
  apiGet<RunSummary[]>("/api/runs"),
  apiGet<CanonicalTemplateRecord[]>("/api/templates"),
]);
```

Map templates into a compact local summary containing:

```ts
{
  template_id: template.template_id,
  label: template.label,
  description: template.description,
}
```

- [ ] **Step 2: Reshape the grid to three equal columns**

Change the dashboard layout from two `col-span-6` cards to three `col-span-4` cards on large screens:

```tsx
<section className="grid grid-cols-12 gap-[18px] max-[960px]:grid-cols-1">
  <Card className="col-span-4 max-[960px]:col-span-1">{/* runs */}</Card>
  <Card className="col-span-4 max-[960px]:col-span-1">{/* templates */}</Card>
  <Card className="col-span-4 max-[960px]:col-span-1">{/* graphs */}</Card>
</section>
```

- [ ] **Step 3: Implement the middle template column**

Render the first 3 templates with:

- template id
- label
- short description
- direct link to `/editor/new?template=<template_id>`

Also add a footer action:

```tsx
<Link href="/editor">{t("home.more_templates")}</Link>
```

- [ ] **Step 4: Keep column heights visually controlled**

Cap the record counts so the three columns stay close in height:

- runs: 5
- templates: 3
- graphs: 5

Use the existing `EmptyState` component for any missing data and provide action-oriented copy.

### Task 3: Rebuild `/editor` as a symmetric landing page

**Files:**
- Modify: `frontend/app/editor/page.tsx`
- Modify: `frontend/components/providers/language-provider.tsx`
- Modify: `frontend/components/layout-shell.tsx`

- [ ] **Step 1: Fix layout ownership before page content**

Stop treating `/editor` itself as a canvas route. The shell should only remove outer padding for actual editor work surfaces such as:

- `/editor/new`
- `/editor/<graphId>`

So replace the current broad check with a stricter one that keeps `/editor` as a normal padded content page.

- [ ] **Step 2: Remove the duplicated container from `/editor`**

Once shell padding is fixed, simplify the editor landing root from:

```tsx
<main className="mx-auto grid max-w-7xl gap-6 px-6 py-8">
```

to a normal page-level grid such as:

```tsx
<div className="grid gap-6">
```

- [ ] **Step 3: Rewrite the editor landing copy**

Replace the historical copy:

- “Canvas First Editor”
- “新编排器入口”
- “返回工作台”

with current language:

- direct title for template-and-graph entry
- short explanatory sentence
- CTA pair: `新建空白图` and `返回首页`

- [ ] **Step 4: Make template and graph sections equal weight**

Replace the asymmetric layout:

```tsx
lg:grid-cols-[320px_minmax(0,1fr)]
```

with:

```tsx
lg:grid-cols-2
```

Both columns should use the same card shell tone and internal spacing so neither feels secondary.

### Task 4: Add a fully collapsible sidebar

**Files:**
- Modify: `frontend/components/layout-shell.tsx`
- Modify: `frontend/components/providers/language-provider.tsx`

- [ ] **Step 1: Add persisted collapsed state**

Create a local storage key in the shell, for example:

```ts
const SIDEBAR_STORAGE_KEY = "graphiteui:sidebar-collapsed";
```

Use `useState` + `useEffect` to hydrate and persist a boolean collapsed flag.

- [ ] **Step 2: Change shell layout based on collapsed state**

When expanded:

```tsx
<div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)]">
```

When collapsed:

```tsx
<div className="grid min-h-screen grid-cols-[0_minmax(0,1fr)]">
```

Also ensure the aside becomes visually hidden and non-interactive when collapsed.

- [ ] **Step 3: Add the collapse and expand controls**

Use the project’s inline SVG style for both buttons.

Expanded state:
- show a small collapse button in the sidebar header area

Collapsed state:
- show a small floating or edge-pinned expand button near the top-left of the content area

- [ ] **Step 4: Keep content alignment stable**

Verify that home and `/editor` still align correctly after the shell owns spacing. Do not patch alignment with extra page-local padding unless a page truly needs a distinct layout.

### Task 5: Verify and record results

**Files:**
- Modify: `progress.md`
- Modify: `findings.md`

- [ ] **Step 1: Run static verification**

Run:

```bash
cd frontend && npx tsc --noEmit
git diff --check
```

Expected:

- TypeScript exits with code 0
- diff check reports no whitespace issues

- [ ] **Step 2: Restart and probe routes**

Run:

```bash
./scripts/start.sh
curl -I http://127.0.0.1:3477
curl -I http://127.0.0.1:3477/editor
curl -I http://127.0.0.1:3477/workspace
curl http://127.0.0.1:8765/health
```

Expected:

- `/` returns 200
- `/editor` returns 200
- `/workspace` still redirects to `/`
- backend health returns `{"status":"ok"}`

- [ ] **Step 3: Record the completed behavior**

Write the verified outcomes back into `progress.md` and `findings.md`, including:

- home is now 3 columns
- editor landing is symmetric and no longer contains stale copy
- sidebar can collapse and expand
- current frontend verification is still limited by the lack of a test runner
