# Task Plan: Repository Cleanup Execution Round 8

## Goal
Continue conservative `NodeCard.vue` cleanup by moving knowledge-base input option and description presentation helpers into a dedicated model while preserving input selection behavior.

## Current Phase
Complete

## Phases

### Phase 1: Re-orientation
- [x] Recover previous cleanup context.
- [x] Confirm current git status.
- [x] Inspect `NodeCard.vue` input knowledge-base computed state and related tests.
- **Status:** completed

### Phase 2: Select Safe Refactor Slice
- [x] Select knowledge-base option construction and selected description resolution.
- [x] Keep value emits, boundary switching, and Element Plus select wiring inside `NodeCard.vue`.
- [x] Add a small `inputKnowledgeBaseModel.ts` boundary.
- **Status:** completed

### Phase 3: Implement Cleanup
- [x] Add failing tests for knowledge-base input presentation helpers.
- [x] Move presentation helpers into `inputKnowledgeBaseModel.ts`.
- [x] Update `NodeCard.vue` to call the model helpers.
- **Status:** completed

### Phase 4: Verification
- [x] Run focused input knowledge-base and NodeCard structure tests.
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
| Overall roadmap cleanup before this round | About 18% complete. |
| P1 `NodeCard.vue` cleanup before this round | About 43% complete. |
| Low-risk model extraction subset before this round | About 88% complete. |
| Build/chunk warning remediation before this round | About 80% complete. |
| Overall roadmap cleanup after this round | About 19% complete. |
| P1 `NodeCard.vue` cleanup after this round | About 45% complete. |
| Low-risk model extraction subset after this round | About 92% complete. |
| Build/chunk warning remediation after this round | About 80% complete. |

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Continue `NodeCard.vue` P1 cleanup | The component still owns pure presentation rules that can move safely. |
| Add `inputKnowledgeBaseModel.ts` | Knowledge-base options and selected description are specific enough to keep out of the generic boundary type model. |
| Leave emits and select interaction in `NodeCard.vue` | State updates and UI event handling are component responsibilities. |

## Notes
- Do not commit runtime artifacts such as `backend/data/settings`, `.dev_*`, `dist`, or `.worktrees`.
- After code changes, restart using `npm run dev`.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
