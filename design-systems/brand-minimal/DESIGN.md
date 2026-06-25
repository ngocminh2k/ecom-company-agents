# Brand Minimal

> Category: E-Commerce

A versatile, brand-first design system for D2C (Direct-to-Consumer) brands. Clean, premium, and conversion-optimized with brand-centric storytelling.

## 0. Visual Theme & Atmosphere

Premium, refined, and brand-forward. Designed for D2C brands that want to tell a story. Clean layouts with editorial photography, generous whitespace, and sophisticated typography. The design feels like a magazine meets a luxury store.

## 1. Color

```css
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f8f8f8;
  --color-text: #0a0a0a;
  --color-text-secondary: #5a5a5a;
  --color-text-tertiary: #a0a0a0;
  --color-accent: #0a0a0a;
  --color-accent-alt: #f0f0f0;
  --color-success: #0a0a0a;
  --color-border: #e0e0e0;
  --color-border-light: #f0f0f0;
}

[data-theme="dark"] {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-text: #f5f5f5;
  --color-text-secondary: #a0a0a0;
  --color-accent: #ffffff;
  --color-accent-alt: #2a2a2a;
  --color-border: #2a2a2a;
}
```

## 2. Typography

```css
:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 2.75rem;
  --text-4xl: 4rem;
  --text-5xl: 5rem;
}
```

Display: Playfair Display (italic, 4-5xl for hero)
Heading: Inter (500 weight, 1.5-2.75xl)
Body: Inter (regular, 1rem, 1.7 line-height)

## 3. Spacing

```css
:root {
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;
  --space-4xl: 10rem;
}
```

Max-width: 1320px. Product grid: 3 columns, 2rem gap.
Editorial section: alternating 60/40 text/image splits.

## 4. Layout & Composition

- Editorial hero: full-bleed image + overlaid text
- Product grid: 3 columns, generous gap
- Alternating sections: 60% text / 40% image
- "As seen in" social proof bar
- Cinematic product detail (scroll-story format)
- Minimal footer: 3 columns, small text

## 5. Components

### Editorial Card
```css
.editorial-card {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 3rem;
  align-items: center;
}
```

### Nav Link
```css
.nav-link {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: var(--text-xs);
  font-weight: 500;
}
```

### Product Image
Full-bleed, aspect-ratio: 4/5, object-fit: cover.
Hover: subtle scale (1.02) with 400ms transition.

### CTA Button
Text-based CTA with underline-on-hover effect. No button shapes.
Uppercase, letter-spaced, small font weight 500.

### Accordion
Product details, shipping, returns — collapsible sections with chevron rotate.

## 6. Motion & Interaction

```css
:root {
  --transition-fast: 200ms ease;
  --transition-base: 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --transition-slow: 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

- Scroll-triggered reveal: 600ms fade-up
- Image hover: 400ms scale (compositor only)
- Nav links: 200ms underline animation
- Cart count: 300ms badge update animation
- Page transitions: 400ms cross-fade

## 7. Voice & Brand

**Tone**: Refined, confident, understated. Let the product speak.
**Language**: Short, punchy copy. "The only shirt you need."
**Storytelling**: Brand origin stories, craftsmanship emphasis.
**CTA**: "Discover", "Explore", "The [Product]", "Own It".
**Social proof**: Third-party endorsements, press mentions, user-generated content.

## 8. Anti-patterns

- Do not use more than one accent color
- Do not use discount/sale banners in header
- Do not use "Buy Now" or aggressive CTAs
- Do not use more than 2 font weights per family
- Do not clutter the header (max 5 nav items)
- Do not use popups on first visit
- Do not use gradient or multi-color text
