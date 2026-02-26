# Tailwind Color Configuration

## Color Choices

- **Primary:** `sky` — Used for active states, links, primary buttons, selected items, confidence badges
- **Secondary:** `amber` — Used for high-priority indicators, warning accents
- **Neutral:** `zinc` — Used for all neutral surfaces, borders, text, backgrounds

## Additional Semantic Colors

- **Emerald:** Done/success status badges
- **Violet:** In-progress status badges
- **Red:** Overdue items, error states, destructive actions

## Usage Examples

```
Primary button:     bg-sky-600 hover:bg-sky-700 text-white
Secondary badge:    bg-amber-50 text-amber-600 border-amber-200
Neutral text:       text-zinc-600 dark:text-zinc-400
Neutral border:     border-zinc-200 dark:border-zinc-800
Card background:    bg-white dark:bg-zinc-900
Page background:    bg-zinc-50 dark:bg-zinc-950
```

## Status Badge Patterns

```
High priority:  bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40
Open:           bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40
In Progress:    bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40
Done:           bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40
Overdue:        bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40
```

## Dark Mode

All designs use Tailwind's `dark:` variant prefix. Key dark mode patterns:

```
Background:     bg-white dark:bg-zinc-900
Page bg:        bg-zinc-50 dark:bg-zinc-950
Border:         border-zinc-200 dark:border-zinc-800
Text primary:   text-zinc-900 dark:text-zinc-100
Text secondary: text-zinc-500 dark:text-zinc-400
Text muted:     text-zinc-400 dark:text-zinc-500
Hover row:      hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20
Active nav:     bg-sky-50 dark:bg-sky-950 text-sky-500
```
