/**
 * ECC MCP Server — stdio MCP protocol server.
 *
 * Exposes the ECC design filesystem and agent harness to any MCP-compatible agent.
 * Tools:
 *   - ecc_search_files   — search across projects
 *   - ecc_get_file       — read DESIGN.md / SKILL.md
 *   - ecc_get_artifact   — fetch latest rendered output
 *   - ecc_run_skill      — execute a skill workflow
 *   - ecc_agent_detect   — detect available CLI agents
 */

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

const tools: McpTool[] = [
  {
    name: 'ecc_search_files',
    description: 'Search across ECC project files by pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (glob or text)' },
      },
      required: ['pattern'],
    },
    handler: async (args) => {
      // Will connect to daemon API in Phase 2
      return { files: [], message: 'Search via daemon API' }
    },
  },
  {
    name: 'ecc_get_file',
    description: 'Read a specific file (DESIGN.md, SKILL.md, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path within the project' },
      },
      required: ['path'],
    },
    handler: async (args) => {
      return { content: null, message: 'File read via daemon API — coming in Phase 2' }
    },
  },
  {
    name: 'ecc_agent_detect',
    description: 'Detect available CLI agents on this machine',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      // Will connect to daemon for live detection
      return { agents: ['claude-code', 'codex', 'cursor'], detected: false }
    },
  },
]

/**
 * Handle a single MCP JSON-RPC request (stdin/stdout transport).
 */
export function handleMcpRequest(request: {
  jsonrpc: '2.0'
  method: string
  params?: { name?: string; arguments?: Record<string, unknown> }
  id: string | number | null
}): string {
  const { method, params, id } = request

  switch (method) {
    case 'initialize':
      return JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: 'ecc-mcp-server',
            version: '0.1.0',
          },
        },
      })

    case 'tools/list':
      return JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      })

    case 'tools/call': {
      const toolName = params?.name ?? ''
      const toolArgs = params?.arguments ?? {}
      const tool = tools.find((t) => t.name === toolName)
      if (!tool) {
        return JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Tool not found: ${toolName}` },
        })
      }
      // Execute handler (async — simplified for stdio MCP)
      tool.handler(toolArgs).then((result) => {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(result) }] },
        }) + '\n')
      })
      return '' // Response sent async
    }

    case 'notifications/initialized':
      return ''

    default:
      return JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      })
  }
}

/**
 * Start the MCP stdio server — reads JSON-RPC requests from stdin.
 */
export function startMcpServer(): void {
  process.stdin.setEncoding('utf-8')
  let buffer = ''

  process.stdin.on('data', (chunk: string) => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const request = JSON.parse(trimmed)
        const response = handleMcpRequest(request)
        if (response) {
          process.stdout.write(response + '\n')
        }
      } catch (err) {
        process.stderr.write(`[MCP] Parse error: ${err}\n`)
      }
    }
  })

  process.stderr.write('[MCP] ECC MCP server started (stdio)\n')
}

// Run directly
if (process.argv[1]?.endsWith('mcp-server')) {
  startMcpServer()
}
