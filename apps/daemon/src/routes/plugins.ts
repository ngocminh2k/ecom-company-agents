import { Router, type Router as RouterType } from 'express'
import { PluginInstaller, PipelineExecutor } from '@ngocminh2k/plugin-system'
import { getConfig } from '../config.js'

export const pluginsRouter: RouterType = Router()

let installer: PluginInstaller | null = null
let pipelineExecutor: PipelineExecutor | null = null

function getInstaller(): PluginInstaller {
  if (!installer) {
    const config = getConfig()
    installer = new PluginInstaller(config.PLUGINS_DIR ?? './plugins')
  }
  return installer
}

function getExecutor(): PipelineExecutor {
  if (!pipelineExecutor) {
    pipelineExecutor = new PipelineExecutor()
  }
  return pipelineExecutor
}

// List installed plugins
pluginsRouter.get('/', (_req, res) => {
  const plugins = getInstaller().listInstalled()
  res.json({ plugins })
})

// Install a plugin from local path
pluginsRouter.post('/install', async (req: any, res) => {
  const { path } = req.body
  if (!path) {
    return res.status(400).json({ error: true, message: 'Plugin path is required' })
  }
  try {
    const plugin = await getInstaller().installFromLocal({ path })
    res.status(201).json({ plugin })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

// Execute a plugin pipeline
pluginsRouter.post('/:id/execute', (req: any, res) => {
  const plugins = getInstaller().listInstalled()
  const plugin = plugins.find((p) => p.id === req.params.id)

  if (!plugin) {
    return res.status(404).json({ error: true, message: 'Plugin not found' })
  }

  if (!plugin.manifest.pipeline) {
    return res.status(400).json({ error: true, message: 'Plugin has no pipeline' })
  }

  const run = getExecutor().startPipeline(plugin)
  res.json({
    run: {
      id: run.id,
      pluginId: run.pluginId,
      stages: run.stages,
      status: run.status,
      currentStageIndex: run.currentStageIndex,
    },
  })
})

// Get pipeline run status
pluginsRouter.get('/runs/:runId', (req: any, res) => {
  const run = getExecutor().getRun(req.params.runId)
  if (!run) {
    return res.status(404).json({ error: true, message: 'Run not found' })
  }
  res.json({ run })
})
