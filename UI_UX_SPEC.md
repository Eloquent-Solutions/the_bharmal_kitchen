# UI/UX Specifications & Design Token Guide
## The Bharmals Kitchen — Restaurant Management System (RMS)

### 1. Aesthetic Identity
- **Theme Paradigm:** Modern Sophisticated Dark Glassmorphism with Warm Saffron/Amber Gold accents.
- **Background:** Deep rich obsidian (`#0a0d14` / `#0f172a`) with subtle radial glow ambient lighting.
- **Glassmorphism Panels:** Semi-transparent backdrops (`rgba(255, 255, 255, 0.04)`) with backdrop blur (`blur(12px)` - `blur(20px)`) and fine micro-borders (`rgba(255, 255, 255, 0.08)`).

---

### 2. Core Color Palette

| Token Name | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `--color-primary` | `#f59e0b` (Amber Gold) | Primary actions, brand highlights, active tabs, selected states. |
| `--color-primary-hover` | `#d97706` | Hover transitions for primary CTA buttons. |
| `--color-success` | `#22c55e` (Emerald) | Available tables, completed orders, vegetarian indicators, profit margins. |
| `--color-warning` | `#eab308` (Amber) | Cooking orders, billed tables, medium kitchen delays. |
| `--color-danger` | `#ef4444` (Rose Red) | Occupied tables, non-veg indicators, urgent kitchen delays (>15m), low stock alerts. |
| `--color-info` | `#3b82f6` (Sapphire Blue) | Reserved tables, delivery orders, station badges. |

---

### 3. Typography & Spacing
- **Font Stack:** Modern sans-serif system stack (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`).
- **Scale:**
  - Display Title: `28px` (`--font-3xl`), Weight 800
  - Section Header: `22px` (`--font-2xl`), Weight 700
  - Subsection / Card Title: `18px` (`--font-xl`), Weight 700
  - Body Text: `14px` (`--font-base`), Line-height 1.5
  - Microcopy / Timestamps: `12px` (`--font-xs`), Weight 500

---

### 4. Responsive Device Layouts
- **Desktop / Cashier Terminal (1200px+):** Fixed 260px collapsible sidebar, split-pane POS interface (Item catalog on left, persistent Cart & Tax summary on right).
- **Tablet / Steward (768px - 1024px):** Grid-based touch-friendly cards, expandable modals, quick-action floating toolbars.
- **Chef / Kitchen KDS (Full-screen landscape):** High-contrast color status bars, large touch target buttons for bumping orders and checking off ingredients, audible alarm indicators.
- **Mobile (Phone):** Off-canvas drawer navigation, swipeable tabs, stacked order lists.
