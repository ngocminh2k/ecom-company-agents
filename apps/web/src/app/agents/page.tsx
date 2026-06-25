'use client'

import { useEffect, useState } from 'react'

export default function AgentsPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('http://localhost:7456/api/agents')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }, [])

  if (!data) return <div className="p-8 text-gray-400">Loading agents...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Home</a>
      <h1 className="text-2xl font-bold mt-4 mb-2">Agents</h1>
      <p className="text-sm text-gray-500 mb-8">
        {data.personalities?.total} personalities across {data.personalities?.divisions} divisions
        • {data.adapters?.filter((a: any) => a.detected).length} CLI adapters
      </p>

      <div className="space-y-6">
        {data.personalities?.byDivision?.map((div: any) => (
          <div key={div.division}>
            <h2 className="font-semibold capitalize mb-3 text-sm text-gray-500">{div.division} ({div.count})</h2>
            <div className="grid grid-cols-3 gap-2">
              {div.agents?.slice(0, 6).map((agent: any) => (
                <div key={agent.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <div className="font-medium truncate">{agent.name}</div>
                  <div className="text-gray-400 text-xs truncate mt-1">{agent.description?.slice(0, 60)}</div>
                </div>
              ))}
              {div.count > 6 && (
                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-400 flex items-center justify-center">
                  +{div.count - 6} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
