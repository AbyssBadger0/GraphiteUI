# Task Plan: Repository Cleanup Execution Round 15

## Goal
Continue conservative `EditorCanvas.vue` cleanup by moving node presentation and minimap node projection helpers into a focused canvas node presentation model while preserving drag, resize, and viewport behavior.

## Current Phase
Complete

## Phases

### Phase 1: Re-orientation
- [x] Run planning catchup and recover previous cleanup context.
- [x] Confirm current git status.
- [x] Inspect `EditorCanvas.vue` node presentation helpers and existing canvas tests.
- **Status:** completed

### Phase 2: Select Safe Refactor Slice
- [x] Select node transform style, node card size style, fallback rendered size, minimap node model, and minimap run-state helpers.
- [x] Keep drag state, resize events, viewport state, DOM measurement, and graph mutation inside `EditorCanvas.vue`.
- [x] Add a focused `canvasNodePresentationModel.ts` for pure node presentation helpers.
- **Status:** completed

### Phase 3: Implement Cleanup
- [x] Add failing tests for canvas node presentation helpers.
- [x] Move node presentation helpers into `canvasNodePresentationModel.ts`.
- [x] Update `EditorCanvas.vue` to call the model helpers.
- **Status:** completed

### Phase 4: Verification
- [x] Run focused canvas node presentation and EditorCanvas structure tests.
- [x] Run TypeScript and meaningful frontend checks.
- [x] Run the frontend production build.
- [x] Restart the dev environment with `npm run dev`.
- **Status:** completed

### Phase 5: Commit and Push
- [x] Review diff for unrelated/runtime artifacts.
- [x] Commit with a Chinese commit message.
- [x] Push the branch.
- **Status:** completed

## Progress Estimate
| Scope | Estimate |
|-------|----------|
| Overall roadmap cleanup before this round | About 25% complete. |
| P1 `NodeCard.vue` cleanup before this round | About 49% complete. |
| P2 `EditorCanvas.vue` cleanup before this round | About 5% complete. |
| Build/chunk warning remediation before this round | About 80% complete. |
| Overall roadmap cleanup after this round | About 26% complete. |
| P1 `NodeCard.vue` cleanup after this round | About 49% complete. |
| P2 `EditorCanvas.vue` cleanup after this round | About 7% complete. |
| Build/chunk warning remediation after this round | About 80% complete. |

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Continue `EditorCanvas.vue` P2 cleanup | The prior canvas model extractions established a safe pure presentation boundary. |
| Extract node presentation helpers next | These helpers derive CSS objects and minimap node data from existing node state without controlling drag or resize lifecycles. |
| Leave interaction orchestration in `EditorCanvas.vue` | The component still owns drag state, resize state, DOM measurement, viewport updates, and emits. |

## Notes
- Do not commit runtime artifacts such as `backend/data/settings`, `.dev_*`, `dist`, or `.worktrees`.
- After code changes, restart using `npm run dev`.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
