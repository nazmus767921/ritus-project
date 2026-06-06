### Role & Context
You are an expert full-stack developer and UI/UX designer. I need your help refactoring an existing application. Below is a breakdown of a logic fix, UX improvements, new features, and a major UI revamp for a shipment workflow.

*Note: For the entire UI, we are moving away from traditional desktop-style dialogs/modals. Please replace them with smooth, native iOS-style bottom sheets. These bottom sheets must NOT have drag handles at the top. Instead, all navigation and action buttons must be located directly inside the sheet header content using the native iOS layout structure:*



┌────────────────────────────────────────────────────────┐
│ [Back/Close]                  Title          [Action]  │
└────────────────────────────────────────────────────────┘


---

### 1. Bug/Logic Fix: Transaction Editing Behavior
* **Current Issue:** When editing a transaction inside the edit interface, if a user changes the selected stock item, the entire transaction description is overwritten by the new stock item's default description. This causes existing `customer name` and `notes` data to be completely lost.
* **Required Fix:** 
    * Update the database/API schema to explicitly include `customer_name` and `notes` as dedicated, separate fields so they are not bundled into or overwritten by the description.
    * Ensure that changing a stock item during an edit *only* updates the item details, preserving the existing customer name and notes.

---

### 2. UI/UX Improvement: Transaction Type Restrictions
* **Current Behavior:** The `Edit_Transaction` iOS-style bottom sheet currently allows users to change the transaction type from "Income" to "Expense" and vice versa.
* **Task:** Provide your expert recommendation on whether we should disable this toggle during editing to prevent accounting discrepancies. If we disable it, how should we best guide the user (e.g., a message suggesting they delete and recreate the transaction)? If we keep it, how do we handle it safely?

---

### 3. New Feature: Inventory Metrics Dashboard
* **Requirement:** Calculate and display the following live metrics in the dashboard/metrics component:
    * **Total Available Stock:** Overall stock initially recorded.
    * **Total Sold Quantity:** Total units sold across all transactions.
    * **Total Remaining Stock:** (Available Stock - Sold Quantity).

---

### 4. Component Revamp: `Import_Shipment` Workflow
I need a complete overhaul of the `Import_Shipment` workflow to support a multi-step accordion form and a multi-stage confirmation review, utilizing stackable iOS-style bottom sheets.

#### Phase 1: Accordion Form Behavior (Base Bottom Sheet)
* **Header Actions:** Following the iOS structure, the header row must contain: `[Cancel]` (Left) | `"Import Shipment"` (Center) | `[Review]` (Right, disabled until at least one valid row is added).
* **Accordion Rules:** Change the shipment items list into an accordion where only one item can be expanded at a time.
* **Collapsed State:** Displays a summary header formatted as: `#1 [Brand Name]  ^`. Directly below this header, it must display a clean, list-like row layout showing the key values already inputted by the user (e.g., Cost, Quantity, Size) so they can review data at a glance without expanding.
* **Expanded State:** Opens up the full interactive input form for that specific item to allow editing.
* **Dynamic Adding:** When a user clicks "Add Row", a new row is generated (e.g., `#2 [Brand Name]  v`), it should automatically expand into the form view, and the previous row must automatically collapse into the summarized list layout.

#### Phase 2: Review & Confirmation Flow
Instead of a direct submission, implement a 2-step verification process using overlaying, stackable bottom sheets:

1. **Step 1: Review Bottom Sheet**
    * **Trigger:** Clicking the `[Review]` button in the top right of the base sheet slides up this secondary sheet on top.
    * **Header Actions:** `[Back]` (Left, returns to base sheet) | `"Verify Items"` (Center) | `[Confirm]` (Right).
    * **Content Layout:** This shows all the filled-out stock items as a clean, flat list (no forms, no accordions). Each row in this list must feature an **Edit** button (which dismisses this sheet and takes them back to that auto-expanded form in the base sheet) and a **Remove** button.

2. **Step 2: Final Confirmation Bottom Sheet**
    * **Trigger:** Clicking `[Confirm]` in the Review sheet header opens a final, smaller confirmation bottom sheet on top.
    * **Header Actions:** `[Back]` (Left, returns to review sheet) | `"Final Approval"` (Center) | `[Import]` (Right, styled with a submission/primary accent).
    * **Content Layout:** This sheet must explicitly display the summary metrics in a clear view: *Total unique stock items* and *Total aggregate quantity of items to be imported*. Clicking the final `[Import]` button executes the database transaction and closes all active sheets.

---

### 5. UI/UX Improvement: Compact Assistant Interface
* **Current Issue:** The mascot and chat interface take up way too much screen real estate.
* **Requirement:** Redesign this UI to be much more compact. Condense the mascot size down to a small avatar footprint and transition the layout so the chat bubbles appear tightly grouped near the top of the container, maximizing the usable primary workspace and data tables below it.

---

### Expected Output
Please provide the step-by-step logic, schema update suggestions, and frontend component adjustments (state management changes for the accordion layout and managing stackable iOS bottom sheets) needed to implement these updates.