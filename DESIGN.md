# Design System: SET Learning & Nossos Cartões Dashboard
**Source Image:** SET Modern Educational Dashboard

## 1. Visual Theme & Atmosphere
- **Mood & Vibe:** Light, vibrant, friendly, and structured. Uses generous whitespace, soft pastel tints, and high-contrast color cards to create an inviting, energetic, and highly readable experience.
- **Density:** Spacious layout with distinct card containers, soft border-radius, and whisper-soft diffused shadows that create depth without visual noise.
- **Color Mode:** Clean Light Mode (`#F4F7FE` base background with `#FFFFFF` card surfaces).

---

## 2. Color Palette & Functional Roles

### Primary & Accent Colors
- **Vibrant Azure Blue (`#2563EB` / `#1D72F3`):** Primary brand identity, active tab indicators, high-priority bar charts, and primary action buttons.
- **Sky Cyan (`#00A3FF`):** Secondary gradient accent for primary cards.

### Course Card Gradient System
- **French (Electric Blue Gradient):** `linear-gradient(135deg, #1D72F3 0%, #00A3FF 100%)` — Energetic, primary focus.
- **Portuguese (Warm Sunset Orange Gradient):** `linear-gradient(135deg, #FF7020 0%, #FFA000 100%)` — High-energy secondary focus.
- **Italian (Fresh Lime Green Gradient):** `linear-gradient(135deg, #65A30D 0%, #84CC16 100%)` — Growth, completed milestones.
- **German (Golden Sun Yellow Gradient):** `linear-gradient(135deg, #F59E0B 0%, #FACC15 100%)` — Warmth, active progress.

### Soft Tint Icon Containers & Badges
- **Soft Reading Blue Tint:** Background `#E0F2FE`, Icon/Text `#0284C7`.
- **Soft Writing Orange Tint:** Background `#FFEDD5`, Icon/Text `#EA580C`.
- **Soft Speaking Yellow Tint:** Background `#FEF9C3`, Icon/Text `#CA8A04`.
- **Soft Listening Green Tint:** Background `#DCFCE7`, Icon/Text `#16A34A`.

### Neutral & Background Surface Colors
- **App Background (`#F4F7FE`):** Soft, cool pale blue-gray canvas that provides gentle contrast against white containers.
- **Card Surface (`#FFFFFF`):** Pure white container surfaces for stats, list items, and widgets.
- **Stat Widget Soft Fill (`#F0F7FF`):** Pale ice-blue background fill for statistics cards.
- **Primary Text (`#1E293B`):** Deep slate navy for titles, card headers, and bold statistics numbers.
- **Secondary / Muted Text (`#94A3B8`):** Muted slate gray for subtitles, timestamps, and secondary navigation links.
- **Border / Divider (`#E2E8F0`):** Subtle dividers and container borders.

---

## 3. Typography Rules
- **Font Family:** Geometric Sans-Serif (e.g., *Plus Jakarta Sans*, *Outfit*, or *Inter*).
- **Header 1 / Greetings:** `20px` to `24px`, SemiBold/Bold, `#1E293B`.
- **Card Titles:** `16px` to `18px`, Bold, `#FFFFFF` on gradients or `#1E293B` on light cards.
- **Stat Numbers:** `28px` to `32px`, ExtraBold, `#1E293B`.
- **Body & Subtitles:** `12px` to `14px`, Medium, `#94A3B8`.
- **Microcopy & Labels:** `10px` to `11px`, SemiBold, Upper/Capitalized.

---

## 4. Component Stylings

### A. Gradient Course & Metric Cards
- **Shape:** Generously rounded corners (`border-radius: 20px` / `rounded-2xl`).
- **Background:** Rich 2-stop linear gradient (`135deg`).
- **Content:** Title + lesson count top-left, circular progress indicator bottom-left, vector landmark illustration bottom-right.
- **Elevation:** Diffused soft drop shadow matching gradient color (`box-shadow: 0 12px 24px -6px rgba(29, 114, 243, 0.3)`).

### B. Statistic Cards
- **Shape:** Smooth rounded rectangle (`border-radius: 16px` / `rounded-xl`).
- **Background:** Soft pale ice-blue (`#F0F7FF`).
- **Indicator:** Vertical pill accent bar (`width: 4px`, `height: 20px`, `background: #2563EB`, `border-radius: 9999px`) on the left of large numbers.
- **Text Layout:** Title + subtitle stacked vertically above large bold number.

### C. List Items (Planning & Agenda)
- **Shape:** Rounded bar (`border-radius: 16px` / `rounded-xl`).
- **Background:** Crisp white (`#FFFFFF`) or ultra-soft neutral tint (`#F8FAFC`).
- **Icon Container:** Square box (`40px x 40px`, `border-radius: 12px`) with soft pastel tint and matching colored icon.
- **Trailing Action:** Muted vertical 3-dot options trigger (`#94A3B8`).

### D. Activity & Bar Charts
- **Bars:** Capsule-topped rounded vertical bars (`border-radius: 8px 8px 0 0`).
- **Default Bar Fill:** Extremely soft pale sky blue (`#E0F2FE`).
- **Active Bar Highlight:** Solid vibrant azure blue (`#2563EB`).

### E. Sidebar & Navigation
- **Background:** Pure white (`#FFFFFF`) with a subtle right border (`#E2E8F0`).
- **Active Item:** Active indicator dot (`#2563EB`) + highlighted text.
- **Inactive Items:** Muted slate gray icons and text (`#94A3B8`) with smooth hover state (`#1E293B`).

---

## 5. Layout Principles
- **Grid Architecture:** 3-column layout:
  1. **Left Sidebar:** Fixed navigation panel with branding, main routes, and bottom illustration widget.
  2. **Center Main Canvas:** Greeting header, Course Cards Grid (2x2 grid), and Planning / Agenda List.
  3. **Right Panel:** User profile summary, Statistics 2x2 grid, and Activity Chart.
- **Whitespace Rhythm:** `24px` (`gap-6`) between major grid sections and `16px` (`gap-4`) inside component groups.
- **Border Radius Hierarchy:**
  - Outer Containers & Main Cards: `20px` to `24px` (`rounded-2xl` / `rounded-3xl`)
  - Inner Badges & Icon Boxes: `12px` (`rounded-xl`)
  - Accent Bar Lines & Pills: `9999px` (`rounded-full`)
