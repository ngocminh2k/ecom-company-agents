export async function pluginCommand(args: string[]) {
  const subcommand = args[0]

  switch (subcommand) {
    case 'list':
      console.log('[PLUGIN] Plugin system coming in Phase 2.')
      break
    default:
      console.log('Usage: ecc plugin list')
  }
}
