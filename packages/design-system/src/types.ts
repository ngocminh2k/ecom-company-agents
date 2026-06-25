/**
 * Design System — types for DESIGN.md 9-section format.
 */

export interface DesignSystem {
  name: string
  slug: string
  category: string
  path: string
  sections: DesignSections
  tokensCss?: string
  raw: string
}

export interface DesignSections {
  /** 0. Visual Theme & Atmosphere */
  visualTheme?: string
  /** 1. Color */
  color?: string
  /** 2. Typography */
  typography?: string
  /** 3. Spacing */
  spacing?: string
  /** 4. Layout & Composition */
  layout?: string
  /** 5. Components */
  components?: string
  /** 6. Motion & Interaction */
  motion?: string
  /** 7. Voice & Brand */
  voice?: string
  /** 8. Anti-patterns */
  antiPatterns?: string
}

export interface DesignTokens {
  colors: Record<string, string>
  typography: Record<string, string>
  spacing: Record<string, string>
  other: Record<string, string>
}
