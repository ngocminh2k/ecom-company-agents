import { test, expect, describe } from 'vitest'
import { AdComplianceValidationService } from './ad-compliance-service.js'
import type { TaskRunner } from '../types.js'

describe('AdComplianceValidationService', () => {
  test('validates compliant ad successfully using AI', async () => {
    const mockRunner: TaskRunner = {
      routeTask: async () => ({
        output: JSON.stringify({
          status: 'approved',
          violations: [],
          fixedCopy: null
        }),
        agentId: 'test-agent',
        durationMs: 100
      })
    }

    const service = new AdComplianceValidationService(mockRunner)

    const asset = {
      copy: 'Buy our cool product!',
      hooks: ['Wow!', 'Amazing!'],
      images: ['image1.jpg']
    }

    const result = await service.validateAsset(asset)

    expect(result).toEqual({
      status: 'approved',
      violations: [],
      fixedCopy: null
    })
  })

  test('returns rejected status and violations when AI detects issues', async () => {
    const mockRunner: TaskRunner = {
      routeTask: async () => ({
        output: JSON.stringify({
          status: 'rejected',
          violations: ['Used banned word "guarantee"'],
          fixedCopy: 'Buy our cool product today!'
        }),
        agentId: 'test-agent',
        durationMs: 100
      })
    }

    const service = new AdComplianceValidationService(mockRunner)

    const asset = {
      copy: 'We guarantee you will love this product!',
      hooks: ['100% Guaranteed!'],
      images: ['image1.jpg']
    }

    const result = await service.validateAsset(asset)

    expect(result).toEqual({
      status: 'rejected',
      violations: ['Used banned word "guarantee"'],
      fixedCopy: 'Buy our cool product today!'
    })
  })

  test('throws an error if AI agent returns an error string', async () => {
    const mockRunner: TaskRunner = {
      routeTask: async () => ({
        output: '',
        error: 'Agent crashed',
        agentId: 'test-agent',
        durationMs: 100
      })
    }

    const service = new AdComplianceValidationService(mockRunner)

    await expect(service.validateAsset({
      copy: 'Test',
      hooks: [],
      images: []
    })).rejects.toThrow('Compliance check failed: Agent crashed')
  })

  test('throws an error if AI response is invalid JSON', async () => {
    const mockRunner: TaskRunner = {
      routeTask: async () => ({
        output: 'not json',
        agentId: 'test-agent',
        durationMs: 100
      })
    }

    const service = new AdComplianceValidationService(mockRunner)

    await expect(service.validateAsset({
      copy: 'Test',
      hooks: [],
      images: []
    })).rejects.toThrow(/Failed to parse compliance result/)
  })

  test('throws an error if task runner is not provided', async () => {
    const service = new AdComplianceValidationService()

    await expect(service.validateAsset({
      copy: 'Test',
      hooks: [],
      images: []
    })).rejects.toThrow('TaskRunner is required for compliance validation')
  })
})
