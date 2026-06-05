# UI Context

## Theme
The interface replicates a native iOS application layout, adhering strictly to the iOS Human Interface Guidelines (HIG). The visual architecture utilizes a clean, single-viewport structure optimized for efficient mobile input. It features clear typography, strict safety padding, and high-contrast system states.

## Colors
All UI components must use the specific design tokens listed below. Do not use hardcoded hexadecimal strings in layout code.

| Role | Tailwind Token Class | Native iOS Equivalency | Operational Scope |
| ------ | ------ | ------ | ------ |
| Page background | `bg-slate-50` | `systemBackgroundColor` | System-wide background for the main canvas view. |
| Surface background | `bg-white` | `secondarySystemBackgroundColor` | Container cards, scroll lists, and action sheets. |
| Primary text | `text-slate-900` | `labelColor` | High-contrast title typography and primary numbers. |
| Muted text | `text-slate-500` | `secondaryLabelColor` | Transaction timestamps, informational captions, and item tags. |
| Primary accent | `text-sky-600` / `bg-sky-600` | `systemBlueColor` | Interactive items, active menu links, and primary save targets. |
| Border outline | `border-slate-200` | `separatorColor` | Clean divider lines separating list records and form cells. |
| Expense / Outflow | `text-red-600` / `bg-red-600` | `systemRedColor` | Displays personal expenses and action delete buttons. |
| Revenue / Gain | `text-emerald-600` / `bg-emerald-600` | `systemGreenColor` | Highlights income streams, positive margins, and the Safety Pocket. |

## Typography
| System Scale | Tailwind Font / Size Classes | Applied Target Area |
| ------ | ------ | ------ |
| Large Title | `font-sans text-3xl font-bold tracking-tight` | Primary dashboard overview header. |
| Body Text | `font-sans text-base font-normal` | List labels, product brand text, and descriptions. |
| Numerical Metric | `font-mono text-lg font-semibold` | Taka currency printouts, counts, and calculated margins. |

## Corner Radius Scale (iOS Compliant)
| Context Structure | Tailwind Class | Functional Assignment |
| ------ | ------ | ------ |
| Control Controls | `rounded-lg` | Input text fields, individual batch tags, and inline action buttons. |
| Interface Cards | `rounded-2xl` | Dashboard metric summaries and scrollable list cards. |
| Modals & Alerts | `rounded-3xl` | Bottom sheet forms and quick transaction prompts. |

## Layout Patterns
- **Standard iOS Navigation Sheet**: A fixed top navigation bar displaying the view title, containing clear left/right action text anchors.
- **Grouped Interface Rows**: Display transaction records inside distinct vertical lists featuring rounded corners, white card backings, and clear separation borders.
- **Thumb-Accessible Primary Trigger**: A floating, fixed-bottom action element configured to activate input screens without stretching the user's hand.

## Icons
- Implement system icons using vector graphics from the Lucide React library.
- Size Constraint: Force `w-5 h-5` configurations for contextual list icons and standard interactive triggers.