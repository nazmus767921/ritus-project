### Context & Role
You are an expert Frontend Developer and UI/UX Designer. I need you to create a reusable, highly robust numeric input component and integrate it into multiple existing forms and views within our application.

---

### 1. Reusable Component: `QuantityInput`
Create a reusable number input component with the following specifications:
* **UI/UX Layout:** A central text input field flanked by a minus (`-`) icon button on the left and a plus (`+`) icon button on the right. 
* **Manual Input Behavior:** * It must strictly accept numbers.
    * Users must be able to completely clear the field (allow an empty state or a temporary "removable 0" while typing) so they don't get stuck fighting a default value.
* **Step Controls:** Clicking the plus/minus buttons must increment or decrement the current value by exactly 1.

### 2. Validation & Form Integration Logic
When integrated into forms, enforce the following business logic:
* **Minimum Value:** The selling quantity must have a strict minimum value of `1` upon form validation/submission. 
* **State Management:** Ensure the component plays nicely with our form state management (e.g., handles `onChange`, `value`, and validation error states smoothly if the user leaves it blank).

### 3. Integration Points
Please integrate this new component and its corresponding data into the following areas:

* **Forms (Interactive Input):**
    1. **Execute Sell Sheet:** Replace the current quantity input with this new component.
    2. **New Transaction Sheet:** Integrate the component for specifying transaction quantity.
    3. **Edit Transaction Sheet:** Integrate the component, ensuring it correctly pre-populates with the existing transaction's quantity.
* **Display (Read-Only Views):**
    1. **Transaction Page / History:** Update the transaction list/rows and detail views to clearly display the saved selling quantity.

---

### Expected Output
Please provide:
1. The code for the reusable `QuantityInput` component.
2. Example implementation/integration code for one of the forms (showing the validation logic).
3. The updated UI code snippet for the Transaction Page display.