import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import type { InstallSource, Plugin, PluginManifest } from './types.js'

const PLUGIN_MANIFEST_FILES = ['open-design.json', 'plugin.json']

export class PluginInstaller {
  constructor(private pluginsDir: string) {}

  /**
   * Install a plugin from a local path.
   */
  async installFromLocal(source: { path: string }): Promise<Plugin> {
    const pluginName = basename(source.path)
    const targetDir = join(this.pluginsDir, pluginName)

    if (!existsSync(source.path)) {
      throw new Error(`Plugin source not found: ${source.path}`)
    }

    // Read manifest
    const manifest = this.readManifest(source.path)
    if (!manifest) {
      throw new Error(`No manifest found in ${source.path}. Need open-design.json or plugin.json`)
    }

    // Create target directory
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    // Copy files
    const entries = readdirSync(source.path, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        copyFileSync(join(source.path, entry.name), join(targetDir, entry.name))
      }
    }

    return {
      id: manifest.name,
      name: manifest.name,
      path: targetDir,
      version: manifest.version,
      description: manifest.description ?? '',
      manifest,
      trustLevel: 'restricted',
      source: 'local',
      enabled: true,
      installedAt: new Date().toISOString(),
    }
  }

  /**
   * List installed plugins.
   */
  listInstalled(): Plugin[] {
    if (!existsSync(this.pluginsDir)) return []

    const plugins: Plugin[] = []
    const entries = readdirSync(this.pluginsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const pluginDir = join(this.pluginsDir, entry.name)
      const manifest = this.readManifest(pluginDir)
      if (manifest) {
        plugins.push({
          id: manifest.name,
          name: manifest.name,
          path: pluginDir,
          version: manifest.version,
          description: manifest.description ?? '',
          manifest,
          trustLevel: entry.name.startsWith('_') ? 'trusted' : 'restricted',
          source: 'local',
          enabled: true,
          installedAt: new Date().toISOString(),
        })
      }
    }

    return plugins
  }

  private readManifest(dir: string): PluginManifest | null {
    for (const filename of PLUGIN_MANIFEST_FILES) {
      const filePath = join(dir, filename)
      if (existsSync(filePath)) {
        return JSON.parse(require('fs').readFileSync(filePath, 'utf-8'))
      }
    }
    return null
  }
}
