# Task Plan: Repository Cleanup Execution Round 2

## Goal
Continue reducing GraphiteUI code concentration with conservative, behavior-preserving refactors based on the architecture roadmap, keeping editor functionality verified.

## Current Phase
Phase 5: Commit and Push

## Phases

### Phase 1: Re-orientation
- [x] Recover previous cleanup context.
- [x] Confirm current git status.
- [x] Inspect the next safest `NodeCard.vue` extraction target.
- **Status:** completed

### Phase 2: Select Safe Refactor Slice
- [x] Identify a small model or composable extraction with existing behavior to preserve.
- [x] Confirm relevant tests or add focused tests before production edits.
- [x] Avoid broad UI restructuring.
- **Status:** completed

### Phase 3: Implement Cleanup
- [x] Add failing tests for the new boundary first.
- [x] Move duplicated or pure logic out of the large component.
- [x] Keep template bindings and emitted events stable.
- **Status:** completed

### Phase 4: Verification
- [x] Run focused tests for the touched surface.
- [x] Run TypeScript and meaningful frontend checks.
- [x] Restart the dev environment with `npm run dev`.
- **Status:** completed

### Phase 5: Commit and Push
- [ ] Review diff for unrelated or runtime artifacts.
- [ ] Commit with a Chinese commit message.
- [ ] Push the branch.
- **Status:** in_progress

## Key Questions
1. Which `NodeCard.vue` responsibility is still isolated enough to extract safely?
2. Which tests can prove the behavior did not change?
3. Can the refactor reduce duplication without changing the visual DOM contract?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Continue inside `NodeCard.vue` before moving to canvas/backend | The roadmap marks NodeCard as P1 and the first extraction succeeded with good test coverage. |
| Prefer model-level extraction over component splitting for this round | Model extraction is lower risk and easier to verify without a browser harness. |
| Extract title/description editor model logic | Text editor metadata, pointer threshold, draft lookup, and commit patch calculation are pure behavior with existing structure coverage. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Notes
- Do not commit runtime artifacts such as `backend/data/settings`, `.dev_*`, `dist`, or `.worktrees`.
- After code changes, restart using `npm run dev`.
