/**
 * Marketing — campaign creation and ad creative generation.
 * Supports real AI agent dispatch via optional TaskRunner injection.
 */
import type { CampaignRequest, CampaignPlan, TaskRunner } from '../types.js'

export class CampaignCreatorService {
  private runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
  }

  async planCampaign(request: CampaignRequest): Promise<CampaignPlan> {
    if (this.runner) {
      const result = await this.runner.routeTask('campaign-planning', {
        name: request.name,
        platform: request.platform,
        productIds: request.productIds,
        budget: request.budget,
        objective: request.objective,
        targetAudience: request.targetAudience,
      }, {
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            platform: { type: 'string' },
            budget: { type: 'number' },
            objective: { type: 'string' },
            audience: { type: 'string' },
            adFormats: { type: 'array', items: { type: 'string' } },
            creativeBrief: { type: 'string' },
            suggestedBudgetBreakdown: { type: 'array', items: { type: 'object', properties: { channel: { type: 'string' }, percentage: { type: 'number' } } } },
            kpis: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'platform', 'budget', 'objective', 'audience', 'adFormats', 'creativeBrief', 'suggestedBudgetBreakdown', 'kpis'],
        },
      })

      if (!result.error && result.output) {
        try { return JSON.parse(result.output) as CampaignPlan } catch {}
      }
    }

    // Fallback
    const platformFormats: Record<string, string[]> = {
      facebook: ['carousel', 'single-image', 'video'],
      instagram: ['story', 'reel', 'carousel', 'single-image'],
      tiktok: ['video', 'spark-ads'],
      google: ['responsive-display', 'shopping', 'search'],
    }

    return {
      name: request.name,
      platform: request.platform,
      budget: request.budget,
      objective: request.objective,
      audience: request.targetAudience,
      adFormats: platformFormats[request.platform] ?? ['single-image'],
      creativeBrief: `Create ${request.platform} ads targeting ${request.targetAudience}. Focus on ${request.objective}.`,
      suggestedBudgetBreakdown: [
        { channel: request.platform, percentage: 70 },
        { channel: 'retargeting', percentage: 30 },
      ],
      kpis: ['CTR > 2%', 'ROAS > 3x', 'CPA < $15'],
    }
  }
}

export class AdCreativeGenService {
  private runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
  }

  async generateCreative(platform: string, productName: string, description: string): Promise<{
    headline: string
    primaryText: string
    description: string
    callToAction: string
    visualDescription: string
  }> {
    if (this.runner) {
      const result = await this.runner.routeTask('ad-creative', {
        platform, productName, description,
      }, {
        outputSchema: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            primaryText: { type: 'string' },
            description: { type: 'string' },
            callToAction: { type: 'string' },
            visualDescription: { type: 'string' },
          },
          required: ['headline', 'primaryText', 'description', 'callToAction', 'visualDescription'],
        },
      })

      if (!result.error && result.output) {
        try { return JSON.parse(result.output) } catch {}
      }
    }

    // Fallback
    return {
      headline: `Discover ${productName}`,
      primaryText: description.slice(0, 125),
      description: `Shop ${productName} today. Limited stock available.`,
      callToAction: 'Shop Now',
      visualDescription: `Product showcase with ${productName} in lifestyle setting, ${platform}-optimized dimensions.`,
    }
  }
}

export * from './ad-compliance-service.js'
