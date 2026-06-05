# AI Workflow Rules

## Approach
Build this project incrementally using a specification-driven development workflow. Rely exclusively on the parameters defined inside the local configuration files. Implement against these documented specifications exactly; do not infer, assume, or invent application behaviors outside of these files.

## Scoping Rules
- Program a single, isolated functional component or schema definition at a time.
- Write code adjustments in small modules to ensure rapid, local execution testing.
- Do not cross architectural boundaries. Keep database modifications, math utility changes, and layout styling updates separated into independent commits.

## When to Split Work
Divide an implementation task immediately if it mixes any of the following boundaries:
- Database table transformations combined with layout view updates.
- Edits touching two independent data structures (e.g., modifying personal transaction schemas while altering shipment logic).
- Layout additions that introduce behavior not explicitly covered in the design spec files.
If a code change cannot be fully verified locally in under two minutes, divide the task scope immediately.

## Handling Missing Requirements
- Do not invent product features, inputs, or variables missing from the current documentation files.
- If a functional parameter is found to be missing, open and amend the respective file (such as `architecture.md`) before writing any code.
- Log newly discovered edge cases immediately into an active tracking log before continuing.

## Protected Configurations
Do not alter or modify the following configurations under any circumstances:
- Underlying build pipeline configurations or compilation flags (`vite.config.ts`, `tsconfig.json`).
- Tailwind utility mappings or database client engine parameters.

## Keeping Docs in Sync
Update the project context files immediately whenever an implementation introduces changes to:
- Local database schemas, column data types, or row relationships.
- Core math utilities or calculation logic.
- Interface components or layout pattern implementations.

## Before Moving to the Next Unit
1. Verify that the current code changes run end-to-end inside the local browser application sandbox.
2. Confirm that the implementation adheres to every constraint listed in `architecture.md`.
3. Run the project validation command (`npm run build`) to ensure the application compiles cleanly with zero type flags, syntax warnings, or linter errors.