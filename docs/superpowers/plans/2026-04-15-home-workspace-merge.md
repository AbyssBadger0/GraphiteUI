# Home Workspace Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/` and `/workspace` into a single entry page that keeps minimal onboarding while surfacing recent runs and recent graphs immediately.

**Architecture:** Reuse the existing dashboard data-fetching path from the current workspace view, but reshape it into a home-first composition: a compact entry header followed by a strict two-column content area. Retire `/workspace` as an independent page by redirecting it to `/`, and remove navigation/content copy that only existed to support the split-entry model.

**Tech Stack:** Next.js App Router, React 19, TypeScript, existing GraphiteUI UI components, backend APIs at `/api/graphs` and `/api/runs`

---

### Task 1: Lock the implementation boundary

**Files:**
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md`
- Reference: `docs/home_workspace_merge_design.md`

- [ ] **Step 1: Record the execution focus**

Update the planning files so they no longer describe the home/workspace work as an open-ended visual polish task. Record that the active task is specifically the merge of `/` and `/workspace`, and that the target end state is a single home entry.

- [ ] **Step 2: Record the verification constraint**

Document in `findings.md` and `progress.md` that the frontend currently has no dedicated test runner in `frontend/package.json`, so this implementation will be verified with:

```bash
cd frontend && npx tsc --noEmit
git diff --check
./scripts/start.sh
curl -I http://127.0.0.1:3477
curl http://127.0.0.1:8765/health
```

- [ ] **Step 3: Mark this task complete in the execution log after code lands**

Append a short note to `progress.md` describing the actual merge outcome:

```md
- 首页与工作台已收口为单一入口，`/workspace` 重定向到 `/`
```

### Task 2: Rebuild `/` into the unified entry page

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/components/workspace/workspace-dashboard-client.tsx`
- Modify: `frontend/components/providers/language-provider.tsx`

- [ ] **Step 1: Write the failing expectation by removing the old split-entry structure**

Before new implementation, identify the old home-only sections that must disappear:

```tsx
<section>
  {/* snapshot cards */}
</section>
<section>
  {/* flow cards */}
</section>
```

The new page must not render those legacy intro blocks anymore. The target top area should only contain:

```tsx
<section>
  <SectionHeader ... />
  <div>{/* CTA buttons */}</div>
</section>
```

- [ ] **Step 2: Implement the minimal unified home structure**

Refactor `frontend/app/page.tsx` so the page renders:

```tsx
<div className="grid gap-5">
  <section>{/* minimal onboarding header + CTAs */}</section>
  <WorkspaceDashboardClient mode="home" />
</div>
```

The header should keep the existing visual language, but shrink the copy to one short positioning statement plus two actions:

- main CTA: create/open new graph
- secondary CTA: open editor

- [ ] **Step 3: Reshape the dashboard into a two-column home-first layout**

Update `WorkspaceDashboardClient` to support a compact home mode that renders:

```tsx
<section className="grid grid-cols-12 gap-[18px] max-[960px]:grid-cols-1">
  <Card className="col-span-6 max-[960px]:col-span-1">{/* recent runs */}</Card>
  <Card className="col-span-6 max-[960px]:col-span-1">{/* recent graphs */}</Card>
</section>
```

Requirements:

- Left column: recent runs
- Right column: recent graphs
- Each column shows up to 5 or 6 records
- Empty states should guide the user toward the next action, not just say “暂无数据”

- [ ] **Step 4: Keep navigation targets intact**

Do not change the link targets inside the cards:

- recent run item -> `/runs/<run_id>`
- recent graph item -> `/editor/<graph_id>`

This preserves the existing interaction model while the entry structure changes.

### Task 3: Retire `/workspace` as an independent route

**Files:**
- Modify: `frontend/app/workspace/page.tsx`
- Modify: `frontend/components/layout-shell.tsx`
- Modify: `frontend/components/providers/language-provider.tsx`

- [ ] **Step 1: Replace the current workspace page with a redirect**

Implement the route as:

```tsx
import { redirect } from "next/navigation";

export default function WorkspacePage() {
  redirect("/");
}
```

- [ ] **Step 2: Remove duplicate navigation entry**

Update the sidebar navigation so only one primary entry remains for the merged home/workspace concept. Keep:

```ts
{ href: "/", label: t("nav.home") }
```

Remove the dedicated `/workspace` item from the primary navigation list.

- [ ] **Step 3: Delete obsolete split-entry copy**

Remove translation keys that only existed to explain the old split between home and workspace, especially copy describing `/workspace` as a separate overview page if it is no longer rendered anywhere.

### Task 4: Verify and stabilize

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
- `git diff --check` reports no whitespace or conflict issues

- [ ] **Step 2: Restart the dev environment**

Run:

```bash
./scripts/start.sh
```

Expected:

- frontend listening on `127.0.0.1:3477`
- backend listening on `127.0.0.1:8765`

- [ ] **Step 3: Verify the routes**

Run:

```bash
curl -I http://127.0.0.1:3477
curl -I http://127.0.0.1:3477/workspace
curl http://127.0.0.1:8765/health
```

Expected:

- `/` returns `200`
- `/workspace` returns a redirect or final `200` through redirect handling
- backend health returns `{"status":"ok"}`

- [ ] **Step 4: Update execution records**

Write the verified outcome into `progress.md` and `findings.md`, including:

- home/workspace merged
- `/workspace` retired into redirect
- current verification still depends on static checks because frontend test harness is absent
