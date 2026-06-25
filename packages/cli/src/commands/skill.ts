export async function skillCommand(args: string[]) {
  const subcommand = args[0]

  switch (subcommand) {
    case 'list':
      console.log('[SKILL] Scanning for installed skills...')
      try {
        const res = await fetch('http://localhost:7456/api/skills')
        const data: any = await res.json()
        if (data.skills?.length > 0) {
          console.log(`\nFound ${data.skills.length} skills:\n`)
          for (const skill of data.skills) {
            console.log(`  ${skill.name.padEnd(30)} ${skill.mode ?? 'general'}`)
            console.log(`  ${' '.repeat(30)} ${skill.description.slice(0, 80)}`)
            console.log()
          }
        } else {
          console.log('No skills found.')
        }
      } catch {
        console.log('Daemon not running. Start with: ecc daemon')
      }
      break

    default:
      console.log('Usage: ecc skill list')
  }
}
