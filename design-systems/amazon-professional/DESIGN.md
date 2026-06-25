# Amazon Professional

> Category: E-Commerce

A dense, information-rich design system optimized for high-volume marketplace selling. Trust signals, comparison tools, and conversion optimization are paramount.

## 0. Visual Theme & Atmosphere

Dense, trustworthy, and optimized for conversion. Information-rich layouts that prioritize product details, reviews, and comparison. The design is utilitarian — every pixel serves a purpose. Familiar marketplace conventions for instant user comprehension.

## 1. Color

```css
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f0f2f2;
  --color-text: #0f1111;
  --color-text-secondary: #565959;
  --color-link: #007185;
  --color-link-hover: #c7511f;
  --color-accent: #ff9900;
  --color-accent-hover: #e68a00;
  --color-success: #007185;
  --color-warning: #ff9900;
  --color-error: #d00;
  --color-border: #d5d9d9;
  --color-btn-yellow: #ffd814;
  --color-btn-yellow-hover: #f7ca00;
  --color-btn-orange: #ffa41c;
  --color-btn-orange-hover: #fa8900;
  --color-star: #ffa41c;
}

[data-theme="dark"] {
  --color-bg: #0f1111;
  --color-bg-secondary: #1a1a1b;
  --color-text: #ffffff;
  --color-text-secondary: #a0a0a0;
  --color-link: #4dc3e8;
  --color-link-hover: #ff8f4f;
  --color-border: #3a3a3a;
  --color-btn-yellow: #ffd814;
  --color-btn-yellow-hover: #f7ca00;
  --color-btn-orange: #ffa41c;
}
```

## 2. Typography

```css
:root {
  --font-heading: 'Amazon Ember', 'Helvetica Neue', Arial, sans-serif;
  --font-body: 'Amazon Ember', 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2rem;
}
```

Heading: Amazon Ember (bold, 1.75-2rem)
Body: Amazon Ember (regular, 0.875-1rem)
Price: Amazon Ember (bold, 1.5rem)
Caption: Amazon Ember (0.75rem, secondary color)

## 3. Spacing

```css
:root {
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 0.75rem;
  --space-lg: 1rem;
  --space-xl: 1.5rem;
  --space-2xl: 2rem;
  --space-3xl: 3rem;
  --space-4xl: 4rem;
}
```

Compact spacing. Max-width 1500px. Product grid: 4-6 columns.
Information density is higher than typical e-commerce.

## 4. Layout & Composition

- Product list: 4-6 columns, compact cards
- Product detail: 3-column layout (images | info | buy box)
- Left nav: departments hierarchy, expandable
- Review section: sortable, filterable, with helpful votes
- "Buy Box" on right: sticky pricing, variants, add to cart
- Comparison table: side-by-side product specs
- Bestseller badge + ranking on product cards

## 5. Components

### Product Card (Compact)
```css
.product-card-compact {
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}
```

### Buy Box
```css
.buy-box {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: var(--space-lg);
  position: sticky;
  top: 1rem;
}
```

### Add to Cart Button
```css
.btn-add-cart {
  background: var(--color-btn-yellow);
  border: 1px solid var(--color-btn-yellow-hover);
  border-radius: 20px;
  padding: 0.5rem 2rem;
  width: 100%;
  font-size: var(--text-sm);
}
.btn-add-cart:hover {
  background: var(--color-btn-yellow-hover);
}
```

### Star Rating
Gold stars with numeric rating and review count link.

### Price Display
Strikethrough original price (--text-secondary), sale price in bold red, installment info below.

### Deal Timer
Countdown badge with days/hours/minutes left.

## 6. Motion & Interaction

```css
:root {
  --transition-fast: 100ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
```

- Button hover: 100ms background change
- Image gallery: 200ms fade between thumbnails
- Accordion: 200ms height expand/collapse
- Hover card: 200ms border highlight

## 7. Voice & Brand

**Tone**: Helpful, factual, trust-building. "We know you have choices."
**Language**: Feature-forward, spec-heavy, benefit-second.
**Reviews**: Community-driven, verified purchase badges.
**Associates**: "Customers who bought this also bought..."
**Warranty**: Clear warranty and return policy always visible.
**CTA**: "Add to Cart" (primary), "Buy Now" (secondary).

## 8. Anti-patterns

- Do not use hamburger menu on desktop (full nav required)
- Do not hide price until click
- Do not use modal overlays for product detail
- Do not use infinite scroll on product pages (pagination required)
- Do not hide stock status
- Do not use vague shipping estimates ("soon")
- Do not remove review filtering/sorting options
- Do not auto-play video reviews
