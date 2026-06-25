# Design Systems

## DESIGN.md Format (9 Sections)

Every design system must include exactly nine sections:

| # | Section | Requirements |
|---|---------|-------------|
| 0 | Visual Theme & Atmosphere | Mood, use cases, style direction, 30-40 lines |
| 1 | Color | Palette tables + CSS `:root {}` tokens, real hex codes |
| 2 | Typography | Type scale (Display, H1, Body, Caption), font labels |
| 3 | Spacing | Spacing scale + grid tokens |
| 4 | Layout & Composition | Grid, breakpoints, layout primitives |
| 5 | Components | 3-6 components with real CSS, :focus-visible on all interactive |
| 6 | Motion & Interaction | Transition tokens + keyframes, prefers-reduced-motion |
| 7 | Voice & Brand | Tone, language patterns, brand voice |
| 8 | Anti-patterns | Specific prohibitions ("Do not use rounded corners > 12px") |

### Structure
```
design-systems/<slug>/
├── DESIGN.md     — canonical design prose
└── tokens.css    — compiled CSS (auto-generated)
```

### Built-in Brands
| System | Category | Style |
|--------|----------|-------|
| Shopify Minimal | E-Commerce | Clean, conversion-focused |
| Printful Modern | E-Commerce | Bold, creative, POD-optimized |
| Etsy Vintage | E-Commerce | Warm, handmade, earthy |
| Brand Minimal | E-Commerce | Premium D2C, editorial |
| Amazon Professional | E-Commerce | Dense, trust-optimized |
