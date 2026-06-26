import type { TaskRunner } from '../types.js'

export interface AdAsset {
  copy: string
  hooks: string[]
  images: string[]
}

export interface ComplianceResult {
  status: 'approved' | 'rejected'
  violations: string[]
  fixedCopy: string | null
}

export class AdComplianceValidationService {
  private readonly runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
  }

  async validateAsset(asset: AdAsset): Promise<ComplianceResult> {
    if (!this.runner) {
      throw new Error('TaskRunner is required for compliance validation')
    }

    try {
      const result = await this.runner.routeTask(
        'marketing-compliance',
        { asset },
        {
          outputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['approved', 'rejected'] },
              violations: { type: 'array', items: { type: 'string' } },
              fixedCopy: { type: ['string', 'null'] }
            },
            required: ['status', 'violations', 'fixedCopy']
          }
        }
      )

      if (result.error) {
        throw new Error(`Compliance check failed: ${result.error}`)
      }

      try {
        const parsed = JSON.parse(result.output) as ComplianceResult

        // Immutability: return a new object with the parsed fields
        return {
          status: parsed.status,
          violations: [...parsed.violations],
          fixedCopy: parsed.fixedCopy
        }
      } catch (parseError) {
        const err = parseError instanceof Error ? parseError : new Error(String(parseError))
        throw new Error(`Failed to parse compliance result: ${err.message}`)
      }
    } catch (error) {
      // Re-throw the error explicitly without silently swallowing it
      throw error
    }
  }
}
