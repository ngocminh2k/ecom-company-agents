'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [daemonStatus, setDaemonStatus] = useState<string>('checking...')

  useEffect(() => {
    fetch('http://localhost:7456/api/health')
      .then(r => r.json())
      .then(data => setDaemonStatus(`v${data.version} — online`))
      .catch(() => setDaemonStatus('offline'))
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          ECC <span className="text-indigo-500">OmniStudio</span>
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          AI Agent Harness for E-Commerce — POD & Dropshipping
        </p>

        <div className="flex items-center justify-center gap-2 mb-12 text-sm">
          <span className={`w-2 h-2 rounded-full ${daemonStatus === 'offline' ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-gray-500">Daemon {daemonStatus}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          <Link href="/workspace"
            className="rounded-xl border border-gray-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
            <div className="font-semibold mb-1">Chat Workspace</div>
            <div className="text-sm text-gray-500">Chat with AI agents</div>
          </Link>
          <Link href="/dashboard"
            className="rounded-xl border border-gray-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
            <div className="font-semibold mb-1">Dashboard</div>
            <div className="text-sm text-gray-500">Analytics & KPIs</div>
          </Link>
          <Link href="/products"
            className="rounded-xl border border-gray-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
            <div className="font-semibold mb-1">Products</div>
            <div className="text-sm text-gray-500">POD & dropshipping</div>
          </Link>
          <Link href="/agents"
            className="rounded-xl border border-gray-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
            <div className="font-semibold mb-1">Agents</div>
            <div className="text-sm text-gray-500">230 personalities</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
