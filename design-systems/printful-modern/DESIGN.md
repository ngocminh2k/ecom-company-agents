# Printful Modern

> Category: E-Commerce

A bold, vibrant design system for POD (Print on Demand) brands. Optimized for product showcases, custom designs, and mockup-heavy layouts.

## 0. Visual Theme & Atmosphere

Bold, colorful, and energetic. Perfect for POD stores that want to stand out. Large product mockups, gradient accents, and playful interactions. The design communicates creativity and customizability.

## 1. Color

```css
:root {
  --color-bg: #fafafa;
  --color-bg-secondary: #f0f0ff;
  --color-text: #1a1a2e;
  --color-text-secondary: #6b7280;
  --color-accent: #7c3aed;
  --color-accent-secondary: #ec4899;
  --color-accent-gradient: linear-gradient(135deg, #7c3aed, #ec4899);
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-border: #e0e0e0;
}

[data-theme="dark"] {
  --color-bg: #0f0f1a;
  --color-bg-secondary: #1a1a2e;
  --color-text: #f0f0ff;
  --color-text-secondary: #9ca3af;
  --color-accent: #a78bfa;
  --color-accent-secondary: #f472b6;
  --color-border: #2d2d44;
}
```

## 2. Typography

```css
:root {
  --font-heading: 'DM Sans', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-display: 'Clash Display', 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 3rem;
  --text-4xl: 4rem;
}
```

Display: Clash Display (bold, 3-4xl, tight tracking: -0.02em)
Heading: DM Sans (bold, 1.5-2xl)
Body: DM Sans (regular, 1rem)
Caption: DM Sans (0.875rem, --color-text-secondary)

## 3. Spacing

```css
:root {
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 5rem;
  --space-4xl: 8rem;
  --grid-gap: 1.5rem;
}
```

Grid: 12 columns with 1.5rem gaps. Max 1440px. Full-bleed hero sections.
Product grid: 3 columns on desktop, 2 tablet, 1 mobile.

## 4. Layout & Composition

- Full-bleed hero with split layout (mockup left, copy right)
- Product detail: 60/40 split (image gallery / product info)
- Gradient section dividers between content blocks
- Overlapping elements for visual depth
- Mega-menu navigation with category cards
- Sticky add-to-cart bar on scroll
- Masonry-style mockup grids

## 5. Components

### Mockup Card
```css
.mockup-card {
  background: var(--color-bg);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
.mockup-card img {
  width: 100%;
  height: auto;
  transition: transform 300ms var(--ease-out-expo);
}
.mockup-card:hover img {
  transform: scale(1.03);
}
```

### Gradient Button
```css
.btn-gradient {
  background: var(--color-accent-gradient);
  color: white;
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 200ms, transform 200ms;
}
.btn-gradient:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
```

### Color Swatch
Circle swatches with check on selected, 36px diameter, border on light colors.

### Size Selector
Pill buttons, 40px height, filled on selected, outline otherwise.

### Product Preview
Zoom on hover with lens effect. 360-degree spin on drag (mobile: swipe).

## 6. Motion & Interaction

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 300ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-slow: 500ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

- Mockup zoom: 300ms scale transform
- Gradient button hover: opacity + translateY
- Page load: staggered fade-up on product cards (100ms delay per card)
- Color swatch select: 200ms ring expansion
- Cart add: 300ms fly-to-cart animation
- Scroll-triggered reveal on sections

## 7. Voice & Brand

**Tone**: Creative, excited, inclusive. "Create something amazing."
**Language**: Benefit-focused for creators. "Your design, their premium quality."
**Product**: Emphasize customizability, quality, and uniqueness.
**CTA**: "Design Now", "Customize", "Start Creating", "Get Yours".
**Community**: "Join 200K+ creators using Printful Modern."

## 8. Anti-patterns

- Do not use muted/pastel as primary palette
- Do not use more than 2 accent gradients
- Do not crop product mockups (show full product)
- Do not use text on busy backgrounds (overlay with blur)
- Do not show mockups without product context
- Do not hide pricing until hover/click
- Minimum font size: 14px on body text
