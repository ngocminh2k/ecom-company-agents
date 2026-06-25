import type { Plugin, PluginPipeline, PluginStage } from './types.js'
import { randomUUID } from 'node:crypto'

export interface PipelineRun {
  id: string
  pluginId: string
  stages: StageRun[]
  status: 'running' | 'completed' | 'failed'
  currentStageIndex: number
  startedAt: string
  completedAt?: string
}

export interface StageRun {
  stageId: string
  atoms: string[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  repeat: number
  result?: unknown
}

export class PipelineExecutor {
  private runs: Map<string, PipelineRun> = new Map()

  /**
   * Start executing a plugin pipeline.
   */
  startPipeline(plugin: Plugin, initialInput?: Record<string, unknown>): PipelineRun {
    const pipeline = plugin.manifest.pipeline
    if (!pipeline) {
      throw new Error(`No pipeline defined in plugin: ${plugin.name}`)
    }

    const run: PipelineRun = {
      id: randomUUID(),
      pluginId: plugin.id,
      stages: pipeline.stages.map((stage) => ({
        stageId: stage.id,
        atoms: stage.atoms,
        status: 'pending' as const,
        repeat: 0,
      })),
      status: 'running',
      currentStageIndex: 0,
      startedAt: new Date().toISOString(),
    }

    this.runs.set(run.id, run)
    return run
  }

  /**
   * Get pipeline run status.
   */
  getRun(runId: string): PipelineRun | undefined {
    return this.runs.get(runId)
  }

  /**
   * Complete current stage and advance to next.
   */
  completeStage(runId: string, result?: unknown): PipelineRun | null {
    const run = this.runs.get(runId)
    if (!run) return null

    const stage = run.stages[run.currentStageIndex]
    if (stage) {
      stage.status = 'completed'
      stage.result = result
    }

    // Check if should repeat
    if (stage && stage.repeat > 0) {
      stage.repeat++
      stage.status = 'pending'
      return run
    }

    run.currentStageIndex++

    // Check if all stages done
    if (run.currentStageIndex >= run.stages.length) {
      run.status = 'completed'
      run.completedAt = new Date().toISOString()
    } else {
      run.stages[run.currentStageIndex].status = 'running'
    }

    return run
  }

  /**
   * Fail current stage.
   */
  failStage(runId: string, error: string): void {
    const run = this.runs.get(runId)
    if (!run) return

    const stage = run.stages[run.currentStageIndex]
    if (stage) {
      stage.status = 'failed'
    }
    run.status = 'failed'
    run.completedAt = new Date().toISOString()
  }

  /**
   * List all runs.
   */
  listRuns(): PipelineRun[] {
    return Array.from(this.runs.values())
  }
}
