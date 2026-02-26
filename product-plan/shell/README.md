# Application Shell

## Overview

Watchdog uses a sidebar navigation pattern — a persistent vertical nav on the left with the content area filling the remaining space. The shell is flat, minimal, and edge-to-edge with no card stacking or heavy borders. Navigation is keyboard-accessible and optimized for information density.

## Components Provided

- `AppShell.tsx` — Main layout wrapper with responsive sidebar (desktop full, tablet compact, mobile overlay)
- `MainNav.tsx` — Navigation component with icon + label items and bottom section
- `UserMenu.tsx` — User menu with avatar (initials fallback), name, and dropdown (Profile, Logout)

## Navigation Structure

| Item | Icon | Position |
|------|------|----------|
| Dashboard | LayoutDashboard | Main (default/home) |
| People | Users | Main |
| Tasks | CheckSquare | Main |
| Sources | Database | Main |
| Processing | Cpu | Main |
| Settings | Settings | Bottom (below divider) |

## Layout Pattern

- **Sidebar:** Fixed-position left sidebar, 256px wide on desktop
- **Content:** Fills remaining width, single scroll context
- **Header:** Watchdog wordmark (Space Grotesk) at top of sidebar
- **Divider:** 1px border separates main nav from bottom section (Settings + User)

## Responsive Behavior

- **Desktop (lg+):** Full sidebar with icon + label, 256px wide
- **Tablet (md):** Collapsed sidebar with icons only, 64px wide
- **Mobile (<md):** Sidebar hidden, hamburger button in a slim top bar triggers a slide-in overlay from the left

## User Menu

Located at the bottom of the sidebar, below Settings. Shows:
- User avatar (initials fallback) and name
- Dropdown with: Profile, Logout

## Design Notes

- No shadow on sidebar — single 1px right border (zinc-200/zinc-800)
- Active nav item: sky-500 text/icon with sky-50 (dark: sky-950) background strip
- Hover state: zinc-100 (dark: zinc-800)
- Nav items: full-width with generous padding for easy click targets
- Typography: Space Grotesk for Watchdog wordmark, Inter for nav labels
- Icons: lucide-react, 20px size, 1.5px stroke

## Wire Up Navigation

Connect the navigation callbacks to your routing:

```tsx
<AppShell
  activeSection="dashboard"
  onNavigate={(section) => router.push(`/${section}`)}
  userName="Admin User"
  userAvatarUrl={null}
  onLogout={() => auth.logout()}
>
  {/* Your section content renders here */}
</AppShell>
```
