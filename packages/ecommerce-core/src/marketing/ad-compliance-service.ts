import type { TaskRunner } from '../types.js'

export class ComplianceParseError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message)
    this.name = 'ComplianceParseError'
  }
}

export interface AdAsset {
  platform: string
  landingPageUrl: string
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
  // PR Feedback: make runner required, remove optional typing ?
  constructor(private readonly runner: TaskRunner) {}

  async validateAsset(asset: AdAsset): Promise<ComplianceResult> {
    const result = await this.runner.routeTask(
      'marketing-compliance',
      { asset },
      {
        outputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['approved', 'rejected'] },
            violations: { type: 'array', items: { type: 'string' } },
            fixedCopy: { type: 'string' }
          },
          required: ['status', 'violations']
        }
      }
    )

    if (result.error) {
      throw new Error(`Compliance check failed: ${result.error}`)
    }

    try {
      const parsed = JSON.parse(result.output) as Partial<ComplianceResult>

      const violationsArray = Array.isArray(parsed.violations) ? parsed.violations : []

      // Immutability: return a new object with the parsed fields
      return {
        status: parsed.status as 'approved' | 'rejected',
        violations: [...violationsArray],
        fixedCopy: parsed.fixedCopy ?? null
      }
    } catch (parseError) {
      const err = parseError instanceof Error ? parseError : new Error(String(parseError))
      // PR Feedback: throw custom error instead of generic Error
      throw new ComplianceParseError(`Failed to parse compliance result: ${err.message}`, parseError)
    }
  }
}
