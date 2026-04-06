# Design System Specification: Editorial Financial Intelligence

## 1. Overview & Creative North Star
**The Creative North Star: "The Financial Observatory"**
This design system moves away from the cluttered, "utility-first" look of traditional fintech. Instead, we are building an Observatory—a high-end, editorial environment where data is treated as art. We prioritize breathing room, sophisticated depth, and intentional asymmetry to guide the user’s eye through their financial narrative. 

By utilizing glassmorphism and deep tonal layering, we transform a standard management tool into a premium digital vault. We break the "template" look by avoiding rigid grids; instead, we use overlapping elements and varying typographic scales to create a sense of bespoke craftsmanship.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, nocturnal base (#08080f), layered with vibrant semantic accents that pop against the darkness.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off content. Structural boundaries are defined exclusively through background shifts (e.g., a `surface_container_low` card sitting on a `surface` background) or subtle tonal transitions. The only exception is the "Ghost Border" used in glassmorphism.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of frosted glass.
- **Base Level:** `surface` (#13131a)
- **Secondary Level:** `surface_container_low` (#1b1b23) for major sectioning.
- **Tertiary Level:** `surface_container_high` (#2a2931) for interactive elements and cards.
- **Highest Level:** `surface_bright` (#393841) for floating modals or active states.

### The Glass & Gradient Rule
To achieve a "signature" look, all primary CTAs and hero data visualizations should utilize a subtle linear gradient (e.g., `primary` to `primary_container`). Floating elements must use **Glassmorphism**: 
- **Fill:** `surface_variant` at 40% opacity.
- **Effect:** 16px to 24px Backdrop Blur.
- **Border:** 6% White (as specified in "The Ghost Border").

### Semantic Palette (Financial Context)
- **Income:** `Emerald` / `Green`
- **Expenses:** `Red`
- **Subscriptions:** `Violet`
- **Non-CC Expenses:** `Orange`
- **Credit Card:** `Pink`
- **Available/Reservations:** `Cyan`
- **Emergency Fund:** `Sky`

---

## 3. Typography
We use **Inter** for its clarity, but we apply it with an editorial hierarchy.

### The Rule of Tabular Numbers
In a financial context, alignment is trust. All currency amounts **must** use the `tnum` (tabular figures) OpenType feature. This ensures that digits align vertically in lists and tables, preventing "shimmering" as numbers change.

*   **Display (L/M/S):** Used for total net worth or primary balance. Tracking: -0.02em.
*   **Headline (L/M/S):** Used for section titles (e.g., "Monthly Cashflow").
*   **Title (L/M/S):** Used for card titles and category headers.
*   **Body (L/M/S):** Standard reading text.
*   **Label (M/S):** Used for micro-data, timestamps, and "over-eyebrow" descriptors.

**Formatting:**
- **ARS:** `es-AR` ($ 1.234,56)
- **USD:** `en-US` ($1,234.56)

---

## 4. Elevation & Depth
We eschew traditional drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." Place a `surface_container_lowest` component on a `surface_container` background to create a "recessed" look, or a `surface_container_highest` on a `surface` background for "lift."
*   **Ambient Shadows:** For floating elements (Modals/Poppers), use a 40px blur, 0px offset, and 4% opacity of the `on_surface` color. It should feel like a soft glow of darkness, not a hard shadow.
*   **The Ghost Border:** For all containers, use a `6% White` border. If using tokens, use `outline_variant` at 10-20% opacity. This defines the edge of the "glass" without creating a visual barrier.
*   **Roundedness:**
    *   **Containers/Cards:** `xl` (3rem) or `lg` (2rem).
    *   **Buttons/Inputs:** `md` (1.5rem).
    *   **Chips:** `full`.

---

## 5. Components

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines between list items. Use 16px-24px of vertical white space or a subtle background shift on hover.
*   **Layout:** Use asymmetrical padding (e.g., more padding on the left than the right) to create a modern, editorial feel for transaction history.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`). White text. `xl` roundedness.
*   **Secondary:** Glassmorphic fill (10% white) with a 6% white Ghost Border.
*   **Tertiary:** Ghost button. No container, just `primary` colored text and a Lucide icon.

### Inputs & Selects
*   **Styling:** Semi-transparent `surface_container_lowest` fill.
*   **Focus State:** The Ghost Border increases to 40% opacity of the `primary` color. No heavy glow.
*   **Micro-interaction:** Labels should float and shrink on focus, moving into the `label-sm` tier.

### Signature Component: The "Vault Card"
A specific component for GuitaApp representing a bank account or credit card.
- **Background:** Glassmorphism with a deep gradient mesh (Primary to Secondary).
- **Corner:** `xl` (3rem).
- **Typography:** `Display-sm` for the balance, `Label-md` for the account name.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use generous whitespace. If a screen feels "full," it is no longer premium.
- **Do** use Lucide icons with a `stroke-width` of 1.5px for a light, airy feel.
- **Do** allow elements to overlap slightly (e.g., a card bleeding off the edge of the screen or over a background gradient) to break the grid.
- **Do** ensure all currency formatting is localized strictly to the currency type (ARS vs USD).

### Don’t:
- **Don’t** use 100% black (#000000). Use the background token (#08080f) to maintain depth.
- **Don’t** use high-contrast borders. If a border is visible as a "line," it’s too heavy.
- **Don’t** use standard shadows. If it looks like a "Material Design" shadow, delete it.
- **Don’t** use default Inter numeric spacing. Always enable `tabular-nums`.

---

## 7. Interaction Patterns
- **Haptic Feedback:** Every financial "Commit" action (saving a transaction) should feel weighty.
- **Motion:** Use "Soft In-Out" easing for glass panels. They shouldn't just appear; they should frost over and fade in.
- **Trust:** Use the `Emerald` (Savings) and `Cyan` (Available) colors to highlight positive reinforcement in the UI.

---
**Director's Note:**
*Remember, we are not just building a tracker; we are building a piece of financial jewelry. Every pixel should feel expensive.*