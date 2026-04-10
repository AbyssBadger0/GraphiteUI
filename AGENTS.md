# GraphiteUI Agent Instructions

These instructions apply to all work in this repository and should persist across new Codex sessions.

## Commit Messages

- When creating git commits for this project, always write the commit message in Chinese.

## Dev Restart Workflow

- After making code changes, restart the local dev environment by running `scripts/dev_up.sh`.
- Treat `scripts/dev_up.sh` as the standard restart command for this repository.
- If a task only involves documentation or other non-runtime changes, use judgment; for code changes, default to restarting with `scripts/dev_up.sh`.

## Notes

- `scripts/dev_up.sh` already handles restarting by releasing occupied frontend/backend ports before starting services again.
