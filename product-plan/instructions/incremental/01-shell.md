# Milestone 1: Shell

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** None

---

## About This Handoff

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Product requirements and user flow specifications
- Design system tokens (colors, typography)
- Sample data showing the shape of data components expect
- Test specs focused on user-facing behavior

**Your job:**
- Integrate these components into your application
- Wire up callback props to your routing and business logic
- Replace sample data with real data from your backend
- Implement loading, error, and empty states

The components are props-based — they accept data and fire callbacks. How you architect the backend, data layer, and business logic is up to you.

---

## Goal

Set up the design tokens and application shell — the persistent chrome that wraps all sections.

## What to Implement

### 1. Design Tokens

Configure your styling system with these tokens:

- See `product-plan/design-system/tokens.css` for CSS custom properties
- See `product-plan/design-system/tailwind-colors.md` for Tailwind configuration
- See `product-plan/design-system/fonts.md` for Google Fonts setup

**Colors:**
- Primary: `sky` — Active states, links, primary buttons, selected items
- Secondary: `amber` — High-priority indicators, warning accents
- Neutral: `zinc` — All neutral surfaces, borders, text, backgrounds
- Additional: `emerald` (success), `violet` (in-progress), `red` (errors/overdue)

**Typography:**
- Heading: Space Grotesk (page titles, stat numbers, wordmark)
- Body: Inter (labels, descriptions, nav items)
- Mono: JetBrains Mono (data values, timestamps, percentages)

### 2. Application Shell

Copy the shell components from `product-plan/shell/components/` to your project:

- `AppShell.tsx` — Main layout wrapper with responsive sidebar
- `MainNav.tsx` — Navigation with icon + label items
- `UserMenu.tsx` — User menu with avatar (initials fallback) and dropdown

**Wire Up Navigation:**

Connect navigation to your routing. The default navigation items are:

| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/dashboard` | LayoutDashboard |
| People | `/people` | Users |
| Tasks | `/tasks` | ListChecks |
| Sources | `/sources` | Inbox |
| Processing | `/processing` | Activity |
| Settings | `/settings` | Settings (bottom section) |

**User Menu:**

The user menu expects:
- User name (string)
- Email (optional)
- Avatar URL (optional, falls back to initials)
- `onLogout` callback
- `onProfile` callback

**Responsive Behavior:**

The shell has three responsive modes using container queries:
- **Desktop (container >= 1024px):** Full sidebar, 256px wide, icon + label
- **Tablet (container 768px–1023px):** Collapsed sidebar, 64px wide, icons only
- **Mobile (container < 768px):** Hidden sidebar, hamburger button in top bar, slide-in overlay

## Files to Reference

- `product-plan/design-system/` — Design tokens (CSS, Tailwind colors, fonts)
- `product-plan/shell/README.md` — Shell design intent and component descriptions
- `product-plan/shell/components/` — Shell React components

## Done When

- [ ] Design tokens are configured (colors, fonts loaded)
- [ ] Shell renders with sidebar navigation
- [ ] Navigation links to correct routes
- [ ] Active nav item is highlighted with sky color
- [ ] User menu shows user info with initials avatar
- [ ] User menu dropdown with Profile and Logout
- [ ] Responsive on desktop, tablet, and mobile
- [ ] Dark mode works correctly
