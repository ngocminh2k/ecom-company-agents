export interface PluginManifest {
  name: string
  title?: string
  version: string
  description?: string
  author?: string
  license?: string
  tags?: string[]
  specVersion?: string
  pipeline?: PluginPipeline
  od?: {
    kind?: 'skill' | 'scenario' | 'atom' | 'bundle'
    mode?: string
    taskKind?: string
    engineRequirements?: string
    useCase?: {
      query?: string
    }
  }
}

export interface PluginPipeline {
  stages: PluginStage[]
}

export interface PluginStage {
  id: string
  atoms: string[]
  repeat?: boolean
  until?: string
}

export interface Plugin {
  id: string
  name: string
  path: string
  version: string
  description: string
  manifest: PluginManifest
  trustLevel: 'trusted' | 'restricted'
  source: 'local' | 'github' | 'registry'
  enabled: boolean
  installedAt: string
}

export type InstallSource =
  | { type: 'local'; path: string }
  | { type: 'github'; repo: string; ref?: string; subpath?: string }
  | { type: 'registry'; name: string }
  | { type: 'url'; url: string }
