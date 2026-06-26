/**
 * ECC Daemon — Central configuration from environment variables.
 *
 * All file-system paths resolve relative to the MONOREPO ROOT
 * (derived from import.meta.url), NOT from process.cwd().
 */
import { z } from 'zod'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const _daemonDir = dirname(fileURLToPath(import.meta.url))     // apps/daemon/src/
const _monorepoRoot = resolve(_daemonDir, '..', '..', '..')    // F:/ecom-company-agents/

export const MONOREPO_ROOT = _monorepoRoot

const envSchema = z.object({
  PORT: z.coerce.number().default(7456),
  BIND_HOST: z.string().default('127.0.0.1'),
  DATA_DIR: z.string().default(() => resolve(_monorepoRoot, 'data')),
  DATABASE_PATH: z.string().default(() => resolve(_monorepoRoot, 'data', 'ecc.db')),
  ARTIFACTS_DIR: z.string().default(() => resolve(_monorepoRoot, 'data', 'artifacts')),
  SKILLS_DIR: z.string().default(() => resolve(_monorepoRoot, 'skills')),
  DESIGN_SYSTEMS_DIR: z.string().default(() => resolve(_monorepoRoot, 'design-systems')),
  PLUGINS_DIR: z.string().default(() => resolve(_monorepoRoot, 'plugins')),

  // LLM Proxy keys (BYOK)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  CORS_ENABLED: z.coerce.boolean().default(false),

  // E-commerce (optional)
  PRINTFUL_API_KEY: z.string().optional(),
  PRINTIFY_API_KEY: z.string().optional(),
  SHOPIFY_API_KEY: z.string().optional(),
  SHOPIFY_STORE_URL: z.string().optional(),
})

export type DaemonConfig = z.infer<typeof envSchema>

let _config: DaemonConfig | null = null

export function loadConfig(): DaemonConfig {
  if (_config) return _config
  _config = envSchema.parse(process.env)
  return _config
}

export function getConfig(): DaemonConfig {
  if (!_config) return loadConfig()
  return _config
}
