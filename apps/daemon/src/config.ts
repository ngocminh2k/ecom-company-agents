/**
 * ECC Daemon — Central configuration from environment variables.
 */
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(7456),
  BIND_HOST: z.string().default('127.0.0.1'),
  DATA_DIR: z.string().default('./data'),
  DATABASE_PATH: z.string().default('./data/ecc.db'),
  ARTIFACTS_DIR: z.string().default('./data/artifacts'),
  SKILLS_DIR: z.string().default('./skills'),
  DESIGN_SYSTEMS_DIR: z.string().default('./design-systems'),
  PLUGINS_DIR: z.string().default('./plugins'),

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
