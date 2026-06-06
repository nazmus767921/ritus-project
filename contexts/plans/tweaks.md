### Role & Context
You are an expert full-stack developer and UI/UX designer. I need your help refactoring several frontend components, state validation logic, and a layout design in my application. 

Please follow a strict **DRY (Don't Repeat Yourself)** approach. Prioritize structural planning and layout alignment before providing implementation code.

---

### 1. Global Component Refactor: Reusable iOS-Style Bottom Sheet (DRY)
* **Current State:** `New_transaction`, `Edit_transaction`, and `Execute_sale` currently use desktop-style dialogs, while `Import_shipment` uses a custom bottom sheet.
* **Requirement:** Extract the bottom sheet logic into a single, highly flexible, and **reusable iOS-style Bottom Sheet component**. 
* **Component Constraints:**
    * No top drag handles.
    * Uses the native iOS top header layout embedded within the sheet content:
      `[Back/Close (Dynamic)] -------- Title -------- [Action/Submit (Dynamic)]`
    * Implement this reusable component across: `Import_Shipment`, `New_Transaction`, `Edit_Transaction`, and `Execute_Sale`.

---

### 2. `Import_Shipment` Workflow: Component Tweaks & Logic Fixes

#### A. Accordion Collapsed State Redesign
* **Current Behavior:** The collapsed row redundantly repeats the `# [Serial Number] [Brand Name]` in the lower summary section, even though it is already visible in the primary item header title.
* **Fix:** Remove the duplicate serial number and brand name from the collapsed sub-content block.
* **UI Revamp:** Redesign the collapsed layout entirely. It should feature a clean, highly compact, grid/list-style row layout displaying inputted key-value pairs (e.g., `Cost: $X`, `Qty: X`, `Sizes: X`) using polished typography so data is easily readable at a glance.

#### B. Cost Calculation Logic Bug
* **Current Issue:** When `courier_fee` is 0, adding a new row and leaving the input form completely empty incorrectly calculates a `per-unit-true-cost` of 1 Taka.
* **Expected Behavior:** If the form is empty or values are unassigned, the calculated per-unit true cost must accurately evaluate to 0. Fix the underlying fallback or division-by-zero default logic handling this calculation.

#### C. Review Action Validation Gate
* **Current Behavior:** The `[Review]` header button becomes active as long as at least one row is filled, even if multiple other newly added rows remain entirely empty.
* **Expected Behavior:** Strictly disable the `[Review]` button until **all** generated rows in the accordion list are completely and validly filled out. No empty or partially filled rows should bypass this gate.

---

### 3. `Import_Shipment` Phase 2: Final Approval Metadata
* **Requirement:** Update the content area of the **Final Approval Bottom Sheet** (Step 2 of the confirmation process) to include the following financial breakdown:
    * **Total Wholesale Price:** The calculated sum of all items' wholesale prices combined.
    * **Courier Charge:** Displayed clearly directly below the wholesale total line item.

---

### 4. UI/UX Improvement: Interactive Mascot Chat Bubble
* **Current Issue:** The assistant mascot's chat text is clipped/truncated and cannot be fully read.
* **New Interactive Behavior Requirement:**
    1. **Idle State:** Compact, safe-cropped chat preview.
    2. **On Tap/Click:** The chat bubble expands smoothly to reveal the full text string.
    3. **Timer Display:** It remains expanded for exactly 5 seconds before automatically shrinking back to its idle footprint.
    4. **Manual Interrupt:** If the user clicks anywhere outside the bubble *before* the 5-second timer finishes, clear the active timeout instantly and trigger an immediate shrink animation.
    5. **Animation Specification:** Use `framer-motion` to handle the expand/shrink states, utilizing a snappy, tactile **spring animation** config.

---

### Expected Output
Please thoroughly plan your layout alignment and state architecture before writing any code. Provide:
1. The architectural state layout for the reusable Bottom Sheet component.
2. The revised math/validation logic for the cost calculations and button states.
3. The complete `framer-motion` implementation code for the interactive mascot chat bubble.