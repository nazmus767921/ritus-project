# Code Standards

## General
- **Modular Single Responsibility Design**: Isolate layout elements, database queries, and mathematical formulas into separate files. Do not mix them together.
- **Fail-Fast Boundary Validation**: Terminate execution loops immediately if user inputs break numerical boundaries, such as negative pricing numbers or blank item counts.
- **Precision Preservation**: Convert and store all currency values as scaled integers representing exact Taka amounts. Do not use floating-point numbers for currency operations.

## TypeScript
- **Strict Configuration Enforcement**: Enable strict type-checking modes across the development project. The usage of implicit `any` types is prohibited.
- **Explicit Type Architecture**: Write explicit interface definitions for all form states, transactional inputs, and internal database rows.
- **Sanitized Type Casting**: Explicitly convert and validate string inputs into clean numeric types before passing data to mathematical functions or database drivers.

## React 19 / Styling (Tailwind CSS)
- **Zero Framework Extensions**: Write pure Tailwind CSS utility classes across all visual components. The inclusion or usage of shadcn/ui primitives is prohibited.
- **Localized State Isolation**: Handle multi-step shipment entries and form inputs using local component state arrays to avoid triggering parent layout re-renders.
- **Strict Token Usage**: Style all UI elements using the functional variables defined in `ui-context.md`. Do not inject arbitrary hexadecimal values into class arrays.

## iOS HIG Compliance
- **View Hierarchy**: Use a standard navigation bar layout combined with crisp bottom action sheets to manage complex workflows.
- **Interactive Target Size**: Design all buttons and touch targets with an absolute minimum interactable area of 44 x 44 points to ensure touch accuracy.
- **State Feedback**: Provide immediate visual feedback states (`active:bg-opacity-80`) for touch actions to mimic native iOS application behavior.

## Database & API Strategy
- **Local Transaction Management**: Wrap multi-brand shipment inputs inside an explicit Drizzle ORM database transaction blocks to ensure simultaneous record insertion.
- **On-the-Fly Metrics Aggregation**: Calculate your main dashboard summary numbers dynamically using group-by queries rather than writing mutable calculation flags to individual database rows.

## File Organization
- `src/components/ui/` — Houses structural components like forms, buttons, and system lists.
- `src/db/` — Contains database table schemas, connection setups, and direct query scripts.
- `src/lib/math/` — Collects mathematical calculation functions for Option A distribution logic.
- `src/types/` — Declares shared TypeScript types and model interfaces.