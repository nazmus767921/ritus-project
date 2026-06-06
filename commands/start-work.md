# Antigravity Rule: Work Initialization & Wrap-up

## Trigger & Guardrail
- **Pattern:** `/start-work @<file>`
- **Else:** Stop and reply: "Please specify the file: `/start-work @filename`"

## Execution Steps

### 1. Interactive Branch Naming & Suggestions
Before creating the branch, analyze the target file and **stop to ask the user for their preferred branch name**. Provide 1 or 2 targeted suggestions based on these rules:
- **If Phase file:** Suggest `phase/[NN]-phase` (e.g., `phase/01-phase`)
- **If Spec/Feature file:** Suggest `feature/[filename]` (e.g., `feature/thruster-spec` — lowercase, kebab-case, no `.md`)

> **Wait for User Input:** Do not proceed to Step 2 until the user confirms one of the suggestions or provides a custom branch name.

### 2. Git Action & Initialization
Once the branch name is finalized:
- Create and switch to the target branch.
- **Pull the latest changes from the default branch** to ensure the new workspace is completely up to date.
- Use the `grill-me` skill on the file to start alignment.

### 3. Iterative Implementation Loop
Proceed with the implementation and verification workflows based on the aligned scope. 
- Once the initial implementation task finishes, **explicitly ask the user if there is anything else that needs to be done.**
- Continue addressing feedback, making refinements, or handling additional tasks in an iterative loop.
- **Do not proceed to cleanup** until the user explicitly states the work is completed or inputs the `/finish-work` command.

### 4. Post-Implementation Cleanup
Once the user explicitly signals completion (via verbal confirmation or `/finish-work`):
- Mark unit `NN` as complete in `context/progress-tracker.md`.