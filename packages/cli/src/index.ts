#!/usr/bin/env node

/**
 * `ecc` CLI — ECC OmniStudio command-line interface.
 *
 * Usage:
 *   ecc daemon          Start the daemon
 *   ecc mcp install     Install MCP config for a specific agent
 *   ecc skill list      List installed skills
 *   ecc plugin list     List installed plugins
 *   ecc project create  Create a new project
 *   ecc config          View daemon configuration
 */

const [command, ...args] = process.argv.slice(2)

async function main() {
  switch (command) {
    case 'daemon': {
      const { startDaemon } = await import('./commands/daemon.js')
      await startDaemon(args)
      break
    }
    case 'mcp': {
      const { mcpCommand } = await import('./commands/mcp.js')
      await mcpCommand(args)
      break
    }
    case 'skill': {
      const { skillCommand } = await import('./commands/skill.js')
      await skillCommand(args)
      break
    }
    case 'plugin': {
      const { pluginCommand } = await import('./commands/plugin.js')
      await pluginCommand(args)
      break
    }
    case 'help':
    default:
      showHelp()
  }
}

function showHelp() {
  console.log(`
ECC OmniStudio — AI Agent Harness for E-Commerce

Usage:
  ecc daemon          Start the daemon server
  ecc daemon --dev    Start in dev mode with auto-reload
  ecc mcp install <agent>  Install MCP config for an agent
  ecc skill list      List installed skills
  ecc plugin list     List installed plugins
  ecc help            Show this help
  `)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
