import type { AgentRoutingRule, CoAgentMessage, AgentRoutingMatrix } from './types.js'

/**
 * Agent-to-Agent Routing Matrix
 *
 * Enables any agent to delegate sub-tasks to other specialized agents.
 * This is the core of the multi-agent orchestration system.
 *
 * Example:
 *   A POD Designer agent can ask the Market Research agent for trend data,
 *   then ask the Ad Optimizer to create campaigns for the designed product.
 */
export class RoutingMatrix {
  private rules: AgentRoutingRule[] = []
  private agentTaskMap: Map<string, Set<string>> = new Map()

  constructor(rules: AgentRoutingRule[] = []) {
    this.addRules(rules)
  }

  /** Add a routing rule */
  addRule(rule: AgentRoutingRule): void {
    this.rules.push(rule)
    this.indexRule(rule)
  }

  /** Add multiple rules at once */
  addRules(rules: AgentRoutingRule[]): void {
    for (const rule of rules) {
      this.addRule(rule)
    }
  }

  /** Remove a rule by id */
  removeRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id)
    this.rebuildIndex()
  }

  /**
   * Find agents that can handle a specific task type for a given source agent.
   * Returns target agent IDs sorted by priority.
   */
  resolve(sourceAgentId: string, taskType: string): AgentRoutingRule[] {
    const matched = this.rules.filter(
      (r) =>
        r.fromAgentId === sourceAgentId &&
        r.toAgentIds.length > 0 &&
        r.taskType === taskType
    )
    return matched.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Find agents that can handle a task type regardless of source.
   * Used when the system needs to find the best specialist for a job.
   */
  findSpecialists(taskType: string): AgentRoutingRule[] {
    return this.rules
      .filter((r) => r.taskType === taskType)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Check if agent A can delegate task type to agent B.
   */
  canDelegate(fromAgent: string, toAgent: string, taskType: string): boolean {
    return this.rules.some(
      (r) =>
        r.fromAgentId === fromAgent &&
        r.toAgentIds.includes(toAgent) &&
        r.taskType === taskType
    )
  }

  /**
   * Create a CoAgentMessage for agent-to-agent communication.
   */
  createMessage(
    from: string,
    to: string,
    taskType: string,
    payload: unknown,
    type: CoAgentMessage['type'] = 'request'
  ): CoAgentMessage {
    return {
      from,
      to,
      type,
      taskType,
      payload,
      correlationId: `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get all task types an agent can handle (incoming rules).
   */
  getAgentCapabilities(agentId: string): string[] {
    const tasks: string[] = []
    for (const [agent, taskSet] of this.agentTaskMap) {
      if (agent === agentId) {
        tasks.push(...taskSet)
      }
    }
    return [...new Set(tasks)]
  }

  /**
   * Get all agents that can handle a given task type.
   */
  getAgentsForTask(taskType: string): string[] {
    const agents = new Set<string>()
    for (const rule of this.rules) {
      if (rule.taskType === taskType) {
        rule.toAgentIds.forEach((id) => agents.add(id))
      }
    }
    return [...agents]
  }

  /** Export the full routing matrix */
  toMatrix(): AgentRoutingMatrix {
    const matrix = new Map<string, AgentRoutingRule[]>()
    for (const rule of this.rules) {
      const key = `${rule.fromAgentId}:${rule.taskType}`
      if (!matrix.has(key)) {
        matrix.set(key, [])
      }
      matrix.get(key)!.push(rule)
    }
    return matrix
  }

  /** Serialize to JSON (for storage/config) */
  toJSON(): AgentRoutingRule[] {
    return [...this.rules]
  }

  private indexRule(rule: AgentRoutingRule): void {
    for (const targetId of rule.toAgentIds) {
      if (!this.agentTaskMap.has(targetId)) {
        this.agentTaskMap.set(targetId, new Set())
      }
      this.agentTaskMap.get(targetId)!.add(rule.taskType)
    }
  }

  private rebuildIndex(): void {
    this.agentTaskMap.clear()
    for (const rule of this.rules) {
      this.indexRule(rule)
    }
  }
}

/**
 * Default routing rules for e-commerce agents.
 * Defines which agents can delegate to which other agents.
 */
export function createDefaultRoutingRules(): AgentRoutingRule[] {
  return [
    // POD Designer → can call Market Research and Ad Optimizer
    {
      id: 'pod-to-market-research',
      fromAgentId: 'pod-designer',
      toAgentIds: ['market-researcher'],
      taskType: 'trend-analysis',
      priority: 100,
    },
    {
      id: 'pod-to-ad-optimizer',
      fromAgentId: 'pod-designer',
      toAgentIds: ['ad-optimizer'],
      taskType: 'ad-generation',
      priority: 90,
    },
    // Dropship Researcher → can call SEO and Store Architect
    {
      id: 'dropship-to-seo',
      fromAgentId: 'dropship-researcher',
      toAgentIds: ['ecommerce-seo'],
      taskType: 'seo-optimization',
      priority: 100,
    },
    {
      id: 'dropship-to-store',
      fromAgentId: 'dropship-researcher',
      toAgentIds: ['store-architect'],
      taskType: 'store-setup',
      priority: 80,
    },
    // Ad Optimizer → calls creative generator
    {
      id: 'ad-to-creative',
      fromAgentId: 'ad-optimizer',
      toAgentIds: ['creative-generator'],
      taskType: 'creative-generation',
      priority: 100,
    },
    // Marketing campaign → can call multiple
    {
      id: 'campaign-to-all',
      fromAgentId: 'campaign-creator',
      toAgentIds: ['ad-optimizer', 'creative-generator', 'ecommerce-seo', 'pod-designer'],
      taskType: 'campaign-execution',
      priority: 100,
    },
    // Sales → can call support and marketing
    {
      id: 'sales-to-support',
      fromAgentId: 'sales-agent',
      toAgentIds: ['support-agent'],
      taskType: 'customer-followup',
      priority: 90,
    },
    {
      id: 'sales-to-marketing',
      fromAgentId: 'sales-agent',
      toAgentIds: ['campaign-creator'],
      taskType: 'lead-generation',
      priority: 80,
    },
    // Support → can call order processor
    {
      id: 'support-to-orders',
      fromAgentId: 'support-agent',
      toAgentIds: ['order-processor'],
      taskType: 'order-lookup',
      priority: 100,
    },
    // Supply Chain → can call order processor and reports
    {
      id: 'supply-chain-to-orders',
      fromAgentId: 'supply-chain-agent',
      toAgentIds: ['order-processor'],
      taskType: 'inventory-check',
      priority: 100,
    },
    {
      id: 'supply-chain-to-reports',
      fromAgentId: 'supply-chain-agent',
      toAgentIds: ['analytics-agent'],
      taskType: 'report-generation',
      priority: 80,
    },
  ]
}
