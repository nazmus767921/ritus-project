---
description: Spec driven developoment workflow
---

# Antigravity Rule: Work Initialization & Wrap-up

## Trigger & Guardrail
- **Pattern:** `/start-work @<file>`
- **Else:** Stop and reply: "Please specify the file: `/start-work @filename`"

## Execution Steps

### 1. Branch Naming
Parse target file to determine branch name (kebab-case, no `.md`):
- **If Phase file:** `phase/[NN]-phase` (e.g., `phase/01-phase`)
- **If Spec/Feature file:** `feature/[filename]` (e.g., `feature/thruster-spec`)

### 2. Git Action & Initialization
- Create/checkout target branch.
- Run `/grill-me` on the file to start alignment.

### 4. Post-Implementation Cleanup
Once implementation is complete and verified:
- Mark unit `NN` as complete in `context/progress-tracker.md`.