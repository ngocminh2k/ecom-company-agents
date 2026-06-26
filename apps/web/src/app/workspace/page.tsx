'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { Send, Bot, User, Sparkles, Loader2, Terminal, AlertCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  agentId?: string
  durationMs?: number
}

export default function WorkspacePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<any[]>([])
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.skills.list().then(r => setSkills(r.skills)).catch(() => {})
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const findBestSkill = (query: string): string | null => {
    const q = query.toLowerCase()
    for (const s of skills) {
      if (s.triggers?.some((t: string) => q.includes(t.toLowerCase()))) return s.id
      if (s.name && q.includes(s.name.toLowerCase().split(' ').slice(0, 2).join(' '))) return s.id
    }
    return skills.length > 0 ? skills[0].id : null
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)

    const skillId = selectedSkill || findBestSkill(userMsg)

    try {
      const res = await fetch(`/api/skills/${skillId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            productName: userMsg,
            niche: userMsg,
            features: userMsg,
            description: userMsg,
            query: userMsg,
          },
        }),
      })
      const data = await res.json()
      const result = data.result || data

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.output || `[${result.agentId || 'unknown'}] ${result.warning || 'No output'}`,
        agentId: result.agentId,
        durationMs: result.durationMs,
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Daemon offline or agent unavailable:\n${e.message}`,
        agentId: 'error',
      }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border-light)] shrink-0">
        <Bot size={18} className="text-[var(--accent)]" />
        <h1 className="font-semibold text-sm">Agent Workspace</h1>
        <div className="flex-1" />
        <select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)}
          className="h-8 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]">
          <option value="">Auto-detect skill</option>
          {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-16">
            <Bot size={40} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-lg font-medium text-[var(--text-secondary)] mb-1">What do you want to work on?</p>
            <p className="text-sm text-[var(--text-tertiary)]">
              {skills.length > 0
                ? `${skills.length} skills available — describe your task and an agent will handle it`
                : 'Skills loading...'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['Design a POD product', 'Research pet niche', 'Write Etsy SEO copy', 'Create ad creative'].map(tip => (
                <button key={tip} onClick={() => { setInput(tip); setTimeout(sendMessage, 100) }}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                  {tip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-[var(--accent)]" />
              </div>
            )}
            <div className={`max-w-2xl rounded-xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-hover)] border border-[var(--border-light)]'
            }`}>
              <pre className="text-sm whitespace-pre-wrap font-sans">{msg.content}</pre>
              {msg.durationMs && (
                <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-tertiary)]">
                  <Terminal size={10} />
                  <span>{(msg.durationMs / 1000).toFixed(1)}s</span>
                  <span>· {msg.agentId || 'unknown'}</span>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-[var(--text-secondary)]" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0">
              <Loader2 size={16} className="text-[var(--accent)] animate-spin" />
            </div>
            <div className="bg-[var(--bg-hover)] rounded-xl px-4 py-3 border border-[var(--border-light)]">
              <p className="text-sm text-[var(--text-secondary)]">Agent is working...</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border-light)] p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Describe your task — e.g. 'Design a cat mug for POD' or 'Research pet toy niche'"
            className="flex-1 h-10 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            className="h-10 px-4 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2 text-sm font-medium">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
