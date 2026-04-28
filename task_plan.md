# Task Plan: Repository Cleanup Execution Round 3

## Goal
Continue conservative GraphiteUI cleanup by extracting another small, tested NodeCard responsibility while preserving editor behavior.

## Current Phase
Phase 5: Commit and Push

## Phases

### Phase 1: Re-orientation
- [x] Recover previous cleanup context.
- [x] Confirm current git status.
- [x] Inspect next NodeCard model-adjacent cleanup target.
- **Status:** completed

### Phase 2: Select Safe Refactor Slice
- [x] Select state port create draft update helpers.
- [x] Confirm existing model/test files can own the behavior.
- [x] Keep UI template and emitted events stable.
- **Status:** completed

### Phase 3: Implement Cleanup
- [x] Add failing tests for the new state port draft helpers.
- [x] Move draft patch logic into `statePortCreateModel.ts`.
- [x] Update `NodeCard.vue` to call the model helpers.
- **Status:** completed

### Phase 4: Verification
- [x] Run focused model and NodeCard structure tests.
- [x] Run TypeScript and meaningful frontend checks.
- [x] Restart the dev environment with `npm run dev`.
- **Status:** completed

### Phase 5: Commit and Push
- [ ] Review diff for unrelated/runtime artifacts.
- [ ] Commit with a Chinese commit message.
- [ ] Push the branch.
- **Status:** pending

## Progress Estimate
| Scope | Estimate |
|-------|----------|
| Overall roadmap cleanup | About 12% complete before this round. |
| P1 `NodeCard.vue` cleanup | About 30% complete before this round. |
| Low-risk model extraction subset | About 55% complete before this round. |
| Overall roadmap cleanup after this round | About 14% complete. |
| P1 `NodeCard.vue` cleanup after this round | About 35% complete. |
| Low-risk model extraction subset after this round | About 65% complete. |

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Continue with `NodeCard.vue` model extraction | It remains the P1 target and still contains pure draft update logic. |
| Use `statePortCreateModel.ts` for draft helper ownership | The file already owns create-port draft/search behavior. |
| Defer route chunk splitting | Build chunk warning is not blocking the current structural cleanup round. |

## Notes
- Do not commit runtime artifacts such as `backend/data/settings`, `.dev_*`, `dist`, or `.worktrees`.
- After code changes, restart using `npm run dev`.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `NodeCard.vue` missing `StateFieldType` after import cleanup | `npx vue-tsc --noEmit --noUnusedLocals --noUnusedParameters` | Restored the type-only import because later NodeCard state/input logic still uses it. |
