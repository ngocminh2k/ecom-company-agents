# Shopify Minimal

> Category: E-Commerce

A clean, conversion-focused design system built for modern e-commerce stores. Lightweight, fast, and minimalist with emphasis on product imagery and typography.

## 0. Visual Theme & Atmosphere

Minimalist, clean, and trustworthy. White space is a feature, not empty space. Product photography is the hero. The design fades into the background to let products speak. Clean borders, subtle shadows on interactive elements, generous whitespace throughout.

## 1. Color

```css
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f6f6f7;
  --color-text: #121212;
  --color-text-secondary: #6b6b6b;
  --color-accent: #007bff;
  --color-accent-hover: #0056b3;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-border: #e5e7eb;
  --color-border-focus: #007bff;
}

[data-theme="dark"] {
  --color-bg: #121212;
  --color-bg-secondary: #1e1e1e;
  --color-text: #f5f5f5;
  --color-text-secondary: #a0a0a0;
  --color-accent: #3b82f6;
  --color-accent-hover: #60a5fa;
  --color-border: #2d2d2d;
}
```

## 2. Typography

```css
:root {
  --font-heading: 'Inter', system-ui, -apple-system, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-4xl: 2.5rem;
  --heading-weight: 600;
  --body-line-height: 1.6;
  --heading-line-height: 1.2;
}
```

Display: Inter (bold, 2.5-4xl)
Heading: Inter (semibold, 1.5-2xl)
Body: Inter (regular, 1rem, 1.6 line-height)
Caption: Inter (0.875rem, secondary color)
Mono: JetBrains Mono

## 3. Spacing

```css
:root {
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;
  --space-4xl: 6rem;
  --grid-gap: 1rem;
  --section-padding: 4rem 1rem;
}
```

Grid: 12-column, 1rem gap. Max container width 1280px centered.
Section padding: 4rem top/bottom, 1rem sides on mobile.

## 4. Layout & Composition

- Max container width: 1280px, centered with auto margins
- 12-column grid with 1rem gaps
- Product grid: 4 columns desktop, 2 tablet, 1 mobile
- Sidebar: 280px for filters on desktop, slide-out on mobile
- Sticky header with search, cart, and account
- Cards: white bg, subtle border, 8px radius, no shadow default
- Featured section: full-bleed with inner container

## 5. Components

### Product Card
```css
.product-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 200ms var(--ease-out-expo);
}
.product-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.product-card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Button
```css
.btn-primary {
  background: var(--color-accent);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 200ms;
}
.btn-primary:hover {
  background: var(--color-accent-hover);
}
.btn-primary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Input
```css
.input {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: var(--text-base);
  width: 100%;
  transition: border-color 200ms;
}
.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
}
```

### Cart Drawer
Slide from right, 400px wide, full height. Close button top-right. Line items with image, title, quantity stepper, price. Subtotal sticky at bottom with checkout CTA.

### Search Overlay
Full-screen overlay with centered search input, autocomplete dropdown below, recent searches, popular products grid.

## 6. Motion & Interaction

```css
:root {
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion) {
  :root {
    --transition-fast: 0ms;
    --transition-base: 0ms;
    --transition-slow: 0ms;
  }
}
```

- Button hover: 150ms background shift
- Card hover: 200ms shadow lift
- Cart drawer: 300ms slide from right
- Product image zoom: 200ms scale on hover
- Page transitions: 200ms fade
- Skeleton loading: 1.5s pulse animation

## 7. Voice & Brand

**Tone**: Friendly, helpful, confident. Not pushy or salesy.
**Language**: Clear benefit-first copy. "Free shipping over $50" not "We offer free shipping."
**Product desc**: Feature then benefit. Specs in bullet points.
**CTA**: Action-oriented: "Add to Cart", "Checkout", "Shop Now".
**Error msgs**: Helpful, not blaming. "Let's try that again" not "Invalid input."
**Empty states**: Illustrations + action prompts, not dead ends.

## 8. Anti-patterns

- Do not use rounded corners > 12px on interactive elements
- Do not animate layout properties (width, height, top, left)
- Do not use justified text alignment
- Do not use more than 2 font families
- Do not use patterned backgrounds behind product images
- Do not disable browser autofill
- Do not use horizontal scrolling on product grids
- Minimum tap target: 44x44px on mobile
- Do not show out-of-stock products without a notify option
