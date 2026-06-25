import { Router, type Router as RouterType } from 'express'
import { scanDesignSystemsDir, parseDesignSystemFile, generateTokensCss } from '@ecc/design-system'
import { getConfig } from '../config.js'

export const designSystemsRouter: RouterType = Router()

// List all design systems
designSystemsRouter.get('/', (_req, res) => {
  const config = getConfig()
  const systems = scanDesignSystemsDir(config.DESIGN_SYSTEMS_DIR)
  res.json({
    systems: systems.map((s) => ({
      name: s.name,
      slug: s.slug,
      category: s.category,
      path: s.path,
      sectionCount: Object.values(s.sections).filter(Boolean).length,
    })),
  })
})

// Get a specific design system by slug
designSystemsRouter.get('/:slug', (req, res) => {
  const config = getConfig()
  const systems = scanDesignSystemsDir(config.DESIGN_SYSTEMS_DIR)
  const system = systems.find((s) => s.slug === req.params.slug)
  if (!system) {
    return res.status(404).json({ error: true, message: 'Design system not found' })
  }
  res.json({ system })
})

// Get tokens.css for a design system
designSystemsRouter.get('/:slug/tokens.css', (req, res) => {
  const config = getConfig()
  const systems = scanDesignSystemsDir(config.DESIGN_SYSTEMS_DIR)
  const system = systems.find((s) => s.slug === req.params.slug)
  if (!system) {
    return res.status(404).json({ error: true, message: 'Design system not found' })
  }
  const css = generateTokensCss(system)
  res.type('text/css').send(css)
})
