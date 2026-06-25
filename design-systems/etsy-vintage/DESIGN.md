# Etsy Vintage

> Category: E-Commerce

A warm, handcrafted design system for vintage and handmade marketplaces. Earthy tones, serif typography, and texture-rich surfaces.

## 0. Visual Theme & Atmosphere

Warm, nostalgic, and trustworthy. Earthy color palette (terracotta, olive, cream). Subtle paper texture backgrounds. Hand-drawn iconography. The design feels like a cozy artisan market, not a sterile e-commerce store.

## 1. Color

```css
:root {
  --color-bg: #fdf8f0;
  --color-bg-secondary: #f5ede0;
  --color-text: #2d1b0e;
  --color-text-secondary: #7a6b5d;
  --color-accent: #c8673d;
  --color-accent-hover: #a85430;
  --color-accent-secondary: #4a7c59;
  --color-success: #4a7c59;
  --color-warning: #d4a24e;
  --color-error: #c8673d;
  --color-border: #e0d5c5;
  --color-star: #d4a24e;
}

[data-theme="dark"] {
  --color-bg: #1a120a;
  --color-bg-secondary: #2d1b0e;
  --color-text: #f5ede0;
  --color-text-secondary: #b8a99a;
  --color-accent: #e88b5f;
  --color-accent-hover: #c8673d;
  --color-border: #3d2b1a;
}
```

## 2. Typography

```css
:root {
  --font-heading: 'Playfair Display', Georgia, serif;
  --font-body: 'Lora', Georgia, serif;
  --font-mono: 'Cutive Mono', 'Courier New', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 2.5rem;
  --text-4xl: 3.5rem;
}
```

Display: Playfair Display (bold italic, 2.5-3.5xl)
Heading: Playfair Display (bold, 1.5-2xl)
Body: Lora (regular, 1rem, 1.7 line-height)
Caption: Lora (italic, 0.875rem)

## 3. Spacing

```css
:root {
  --space-xs: 0.375rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;
  --space-4xl: 8rem;
}
```

Generous spacing. Content-centered max-width 1200px.
Recommended 2-3 columns product grid for a curated feel.

## 4. Layout & Composition

- Centered layout with max 1200px
- 2-3 column product grid (curated feel, not bulk)
- Sidebar shop filters with toggle
- Featured shop section: large format hero with shop story
- Review cards with star ratings and photo proofs
- "From the seller" box with profile photo and message

## 5. Components

### Shop Card
```css
.shop-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
}
.shop-card:hover {
  border-color: var(--color-accent);
}
```

### Star Rating
```css
.star-rating {
  color: var(--color-star);
  letter-spacing: 2px;
}
```

### Review Card
White background, subtle border, quote styling, reviewer avatar + name, date, star rating.

### Favorite Button
Heart icon, outline default, filled with color on active. Animate on click (scale pulse).

### Shop Banner
Full-width banner with shop name, tagline, follower count, and action buttons.

## 6. Motion & Interaction

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 300ms ease;
  --transition-slow: 400ms ease;
}
```

- Subtle fade on page transitions (no dramatic motion)
- Hover: border color shift on cards
- Favorite: heartbeat scale animation
- Shop banner: parallax on scroll (subtle)
- Review carousel: 300ms slide

## 7. Voice & Brand

**Tone**: Warm, personal, authentic. "Handmade with love."
**Language**: Story-driven. Products have stories, not just specs.
**Shop voice**: Each shop has personality in their "About" section.
**Reviews**: Encourage detailed, photo-rich reviews.
**Community**: "Part of the Etsy Vintage family."

## 8. Anti-patterns

- Do not use sans-serif fonts for headings (serif required)
- Do not use bright neon or highly saturated colors
- Do not use modern/flat design patterns (too cold)
- Do not use stock photography of "perfect" lifestyle
- Do not auto-play video or audio
- Do not use aggressive discount popups
- Do not hide shop location or processing times
