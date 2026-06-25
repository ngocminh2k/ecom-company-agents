export async function startDaemon(args: string[]) {
  const isDev = args.includes('--dev')

  if (isDev) {
    console.log('[CLI] Starting daemon in dev mode...')
    // In dev mode, use tsx to run the daemon directly
    const { spawn } = await import('node:child_process')
    const child = spawn('npx', ['tsx', 'apps/daemon/src/server.ts'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'development' },
    })
    child.on('exit', (code) => process.exit(code ?? 0))
  } else {
    console.log('[CLI] Starting daemon...')
    console.log('Use: pnpm --filter @ecc/daemon dev for dev mode')
  }
}
