export async function mcpCommand(args: string[]) {
  const subcommand = args[0]
  const agent = args[1]

  if (subcommand === 'install' && agent) {
    console.log(`[MCP] Installing MCP config for ${agent}...`)

    const configs: Record<string, object> = {
      'claude-code': {
        command: 'npx',
        args: ['-y', '@ecc/mcp-server'],
        description: 'ECC OmniStudio MCP server — agent harness for e-commerce',
      },
      'codex': {
        command: 'npx',
        args: ['-y', '@ecc/mcp-server'],
        description: 'ECC OmniStudio MCP server',
      },
      'cursor': {
        command: 'npx',
        args: ['-y', '@ecc/mcp-server'],
        description: 'ECC OmniStudio MCP server',
      },
    }

    const config = configs[agent]
    if (!config) {
      console.error(`Unknown agent: ${agent}`)
      console.log(`Supported: ${Object.keys(configs).join(', ')}`)
      return
    }

    console.log(`MCP config for ${agent}:`)
    console.log(JSON.stringify(config, null, 2))
    console.log('\nCopy this into your MCP config file.')
  } else {
    console.log('Usage: ecc mcp install <agent>')
    console.log('Agents: claude-code, codex, cursor')
  }
}
