# Task Plan: Repository Cleanup Execution Rounds 21-30

## Goal
Run a ten-round conservative cleanup batch focused on `EditorCanvas.vue` pure projection and interaction-model helpers while preserving graph editing behavior, runtime visuals, drag/connect workflows, deletion behavior, and dev startup health.

## Current Phase
Phase 13 complete

## Phases

### Phase 1: Re-orientation and Ten-Round Planning
- [x] Run planning catchup and confirm no local source changes.
- [x] Re-read the latest plan, progress, findings, and current high-line-count files.
- [x] Inspect the remaining `EditorCanvas.vue` computed/helper clusters.
- [x] Select ten low-risk pure boundaries for Rounds 21-30.
- **Status:** completed

### Phase 2: Round 21 - Minimap Edge Projection
- [x] Add focused tests for projected minimap edge models.
- [x] Extract minimap edge color/kind/path projection from `EditorCanvas.vue`.
- **Status:** completed

### Phase 3: Round 22 - Forced Visible Edge Ids
- [x] Add focused tests for forced visible projected edge id collection.
- [x] Extract selected/confirm/editor edge-id collection from `EditorCanvas.vue`.
- **Status:** completed

### Phase 4: Round 23 - Pending State Port Preview
- [x] Add focused tests for state preview labels and pending source/target maps.
- [x] Extract pending state port preview projection from `EditorCanvas.vue`.
- **Status:** completed

### Phase 5: Round 24 - Virtual Create Port Visibility
- [x] Add focused tests for virtual input/output create port visibility rules.
- [x] Extract default and interaction-based visibility decisions from `EditorCanvas.vue`.
- **Status:** completed

### Phase 6: Round 25 - Transient Virtual Anchors
- [x] Add focused tests for transient virtual create/input/output anchors.
- [x] Extract virtual anchor filtering and projection from `EditorCanvas.vue`.
- **Status:** completed

### Phase 7: Round 26 - Selected Reconnect Projection
- [x] Add focused tests for selected edge to reconnect connection projection.
- [x] Move selected reconnect connection derivation into the connection model.
- **Status:** completed

### Phase 8: Round 27 - Keyboard Edge Delete Projection
- [x] Add focused tests for projected edge to delete-action conversion.
- [x] Reuse the flow-edge delete model in keyboard delete handling.
- **Status:** completed

### Phase 9: Round 28 - Data Edge Disconnect Projection
- [x] Add focused tests for data-edge disconnect availability and payloads.
- [x] Move pure data-edge disconnect decisions into the data-edge model.
- **Status:** completed

### Phase 10: Round 29 - Pinch Pointer Math
- [x] Add focused tests for pinch pointer distance, center, and start projection.
- [x] Extract pure two-finger gesture math from `EditorCanvas.vue`.
- **Status:** completed

### Phase 11: Round 30 - Viewport Display Projection
- [x] Add focused tests for viewport transform style and zoom label formatting.
- [x] Extract viewport display helpers from `EditorCanvas.vue`.
- **Status:** completed

### Phase 12: Verification
- [x] Run focused model and structure tests.
- [x] Run TypeScript unused-symbol verification.
- [x] Run the full frontend test suite.
- [x] Run the frontend production build and check for chunk-warning regressions.
- [x] Restart the dev environment with `npm run dev` and verify frontend/backend health.
- **Status:** completed

### Phase 13: Commit and Push
- [x] Review diffs for unrelated/runtime artifacts.
- [x] Commit source and tests with a Chinese commit message.
- [x] Commit planning updates with a Chinese commit message if separated.
- [x] Push the branch.
- **Status:** completed

## Progress Estimate
| Scope | Estimate |
|-------|----------|
| Overall roadmap cleanup before this batch | About 30% complete. |
| P1 `NodeCard.vue` cleanup before this batch | About 49% complete. |
| P2 `EditorCanvas.vue` cleanup before this batch | About 14% complete. |
| Build/chunk warning remediation before this batch | About 80% complete. |
| Overall roadmap cleanup after this batch | About 34% complete. |
| P1 `NodeCard.vue` cleanup target after this batch | About 49% complete. |
| P2 `EditorCanvas.vue` cleanup after this batch | About 24% complete. |
| Build/chunk warning remediation after this batch | Warning elimination confirmed; no Vite large chunk warning in production build. |

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Make the next batch exactly ten cleanup rounds | The user explicitly asked to increase the next round count to ten. |
| Stay mostly inside `EditorCanvas.vue` | It remains a large mixed-responsibility component, and the selected helpers are pure enough to test without UI risk. |
| Avoid backend runtime refactors in this batch | Backend executor/provider files need broader behavior fixtures and are higher risk than the current canvas projection helpers. |
| Keep side effects local | DOM measurement, refs, timers, emits, lock guards, and viewport mutation stay in the component. |

## Notes
- Clean baseline: `main...origin/main` after `8017081 更新第十八至二十轮清理进度`.
- `EditorCanvas.vue` starts this batch at 4,226 lines.
- The previous production build completed without a large chunk warning.
- This batch leaves `EditorCanvas.vue` at 4,039 lines, down from 4,226 at the batch start.
- Do not commit runtime artifacts such as `backend/data/settings`, `.dev_*`, `dist`, or `.worktrees`.
- After code changes, restart using `npm run dev`.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Structure test still expected the old inline forced-edge-id block | Focused post-implementation run | Updated the assertion to verify the extracted `buildForceVisibleProjectedEdgeIds` boundary and flow confirm id input. |
