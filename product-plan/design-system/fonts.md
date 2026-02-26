# Typography Configuration

## Google Fonts Import

Add to your HTML `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## Font Usage

- **Headings:** Space Grotesk — Page titles, card titles, stat numbers, the Watchdog wordmark
- **Body text:** Inter — Labels, descriptions, inputs, nav items, general content
- **Code/technical:** JetBrains Mono — Percentages, data values, timestamps, monospace data

## Applying Fonts in Components

The screen design components apply fonts via inline style attributes:

```tsx
// Headings
style={{ fontFamily: "'Space Grotesk', sans-serif" }}

// Body text
style={{ fontFamily: "'Inter', sans-serif" }}

// Monospace data
style={{ fontFamily: "'JetBrains Mono', monospace" }}
```

## Typography Scale

| Element | Font | Classes |
|---------|------|---------|
| Page title | Space Grotesk | `text-xl font-bold text-zinc-900 dark:text-zinc-100` |
| Subtitle | Inter | `text-sm text-zinc-400 dark:text-zinc-500 mt-1` |
| Section header | Space Grotesk | `text-sm font-bold text-zinc-900 dark:text-zinc-100` |
| Uppercase label | Inter | `text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500` |
| Stat value | Space Grotesk | `text-2xl font-bold mt-1 tabular-nums` |
| Body text | Inter | `text-sm text-zinc-600 dark:text-zinc-400` |
