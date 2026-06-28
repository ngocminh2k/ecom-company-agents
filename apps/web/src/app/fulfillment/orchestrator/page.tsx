'use client'

import { useState } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PlayCircle, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default function OrchestratorPage() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  
  const runOrchestrator = () => {
    setRunning(true)
    setLogs(['Initiating Exception Orchestrator...'])
    
    // Simulate orchestration run
    setTimeout(() => {
      setLogs(prev => [...prev, 'Scanning for stranded orders...'])
    }, 1000)
    
    setTimeout(() => {
      setLogs(prev => [...prev, 'Found 2 orders stuck in pending_review.'])
      setLogs(prev => [...prev, 'Evaluating vendor routing...'])
    }, 2000)
    
    setTimeout(() => {
      setLogs(prev => [...prev, 'Rerouted ord-001 to backup vendor Printify.'])
      setLogs(prev => [...prev, 'Order ord-002 requires manual intervention.'])
    }, 3500)
    
    setTimeout(() => {
      setLogs(prev => [...prev, 'Run complete.'])
      setRunning(false)
    }, 4500)
  }
  
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <a href="/fulfillment" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">&larr; Back to Fulfillment</a>
          <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Exception Orchestrator</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Automatically resolve stranded orders and reroute to backup vendors.
          </p>
        </div>
        <Button onClick={runOrchestrator} loading={running}>
          <PlayCircle size={16} /> Run Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title="Stranded Orders" className="flex-1">
          <div className="text-3xl font-bold">12</div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Requiring attention</p>
        </Card>
        <Card title="Auto-Resolved" className="flex-1">
          <div className="text-3xl font-bold text-[var(--success)]">143</div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Last 7 days</p>
        </Card>
        <Card title="Resolution Rate" className="flex-1">
          <div className="text-3xl font-bold text-[var(--accent)]">92%</div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Target: &gt;90%</p>
        </Card>
      </div>

      <Card title="Run Logs" padding="lg">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">
            Ready to run.
          </div>
        ) : (
          <div className="space-y-2 font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className={`flex items-start gap-2 ${log.includes('complete') ? 'text-[var(--success)]' : log.includes('manual') ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)]'}`}>
                <span className="text-[var(--text-tertiary)]">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] mt-2">
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
