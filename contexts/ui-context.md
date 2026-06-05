# UI Context - Bold Neobrutalism

## Theme
The interface implements a custom **Bold Neobrutalist** theme styled like a retro desktop software window. The design features a vibrant color palette, thick high-contrast black borders, hard offset shadows, custom system window controls, and bouncy interactive micro-animations that respond with mechanical feedback on user click actions.

## Colors
All UI components must use the design tokens listed below to maintain design system consistency.

| Role | Tailwind Token Class | Description |
| ------ | ------ | ------ |
| Page background | `bg-yellow-100` (`#FEF08A`) | Vibrant Retro Mustard Yellow background. |
| Surface background | `bg-white` | Base color for container cards, forms, list headers, and modal overlays. |
| Secondary surface | `bg-slate-100` | Secondary background for neutral badges, control groups, and inputs. |
| Primary text | `text-black` / `text-slate-900` | Solid black typography for titles, numbers, and critical labels. |
| Muted text | `text-slate-700` | High-contrast secondary text for timestamps and descriptions. |
| Accent (Interactive) | `bg-purple-600` / `text-purple-600` | Electric Purple for tab highlights, action buttons, and active options. |
| Expense / Outflow | `bg-red-400` / `text-red-600` | Hot Coral Red for personal expenses, deletions, and negative metrics. |
| Revenue / Gain | `bg-green-400` / `text-green-600` | Neon Green for income, stock badges, margins, and the Safety Pocket. |
| Borders | `border-3 border-black` / `border-2 border-black` | Solid black outlines applied around all containers, inputs, and buttons. |
| Box Shadows | `shadow-neobrutal` / `shadow-neobrutal-sm` | Flat, hard black shadow offsets: `shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`. |

## Typography
Headings and numeric metrics utilize `Space Grotesk` for retro-tech layout aesthetics. UI labels and body texts utilize `Lexend` to maintain clear readability.

| System Scale | Tailwind Font / Size Classes | Applied Target Area |
| ------ | ------ | ------ |
| Large Title | `font-display text-2xl sm:text-3xl font-bold tracking-tight text-black` | Main application headers and modal titles. |
| Card Metric | `font-display text-xl sm:text-2xl font-extrabold tracking-tight` | Aggregated profit, net, and safety values. |
| Label & Caption | `font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider` | Section categories, inputs, and description tags. |
| Body Text | `font-sans text-sm sm:text-base font-medium text-slate-800` | Inventory brand names, list descriptions, and item rows. |

## Corner Radius & Borders
Neobrutalism balances sharp angles with playful rounded shapes.
- **Controls & Buttons**: `rounded-xl` with `border-2 border-black` and `shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`.
- **Main Window & Cards**: `rounded-2xl` with `border-3 border-black` and `shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`.
- **Active Button Action state**: On active press, buttons shift downward (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`) to simulate a mechanical click.

## Layout Patterns
- **Retro Software Window Frame**: The app is rendered inside a centered card framed with simulated min/max/close controls (red/yellow/green circle dots) and a thick title bar.
- **Stacked Card Widgets**: Metric readouts are displayed as high-visibility colored cards with hard black shadow borders.
- **Retro System Dialog Modals**: Modals are centered on the viewport with thick black borders, a grey window title bar, and a bold `[X]` exit button.

## Icons
- Lucide React library icons are used throughout the UI.
- All icons are rendered with standard sizing constraints: `w-5 h-5` for general triggers, `w-4 h-4` for status indicators inside cards.