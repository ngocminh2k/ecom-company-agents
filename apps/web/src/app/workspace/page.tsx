'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { Send, Bot, User, Square, Terminal, MessageSquarePlus, Trash2, MessageSquare } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  agentId?: string
  durationMs?: number
}

interface Conversation {
  id: string
  title: string
  created_at: string
  message_count: number
}

export default function WorkspacePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<any[]>([])
  const [selectedSkill, setSelectedSkill] = useState<string>('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load skills and conversations on mount
  useEffect(() => {
    api.skills.list().then(r => setSkills(r.skills)).catch(() => {})
    loadConversations()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadConversations = async () => {
    try {
      const res = await api.conversations.list()
      setConversations(res.conversations || [])
    } catch (err) {
      console.error('Failed to load conversations', err)
      setErrorMsg('Failed to load conversations. Please check your connection or daemon.')
    }
  }

  const loadMessages = async (conversationId: string) => {
    setActiveConversationId(conversationId)
    setMessages([])
    setLoading(true)
    try {
      const res = await api.conversations.messages.list(conversationId)
      const formatted = Array.isArray(res.data) ? res.data.map((m: any) => ({
        role: m.role,
        content: m.content,
        agentId: m.agent_id || m.agentId
      })) : []
      setMessages(formatted)
    } catch (err) {
      setMessages([{ role: 'system', content: 'Failed to load messages.' }])
    } finally {
      setLoading(false)
    }
  }

  const createNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setInput('')
    setSelectedSkill('')
  }

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await api.conversations.delete(id)
      if (activeConversationId === id) {
        createNewChat()
      }
      setConversations(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Failed to delete conversation', err)
      setErrorMsg('Failed to delete conversation. Please try again.')
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)

    let skillId = selectedSkill
    if (!skillId) {
      setMessages(prev => [...prev, { role: 'system', content: 'Detecting best agent...' }])
      try {
        const routeRes = await api.skills.route(userMsg)
        skillId = routeRes.skillId
      } catch (err) {
        console.error('Failed to route skill', err)
      }
      setMessages(prev => prev.filter(m => m.content !== 'Detecting best agent...'))
    }

    if (!skillId) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'No skills available yet. Try again in a moment.', agentId: 'system' }])
      setLoading(false)
      return
    }

    // Determine or create conversation
    let currentConvId = activeConversationId
    let isNewConv = false
    if (!currentConvId) {
      try {
        const title = userMsg.length > 40 ? userMsg.substring(0, 40) + '...' : userMsg
        const res = await api.conversations.create({ title, skillId })
        currentConvId = res.data.id
        setActiveConversationId(currentConvId)
        isNewConv = true
      } catch (err) {
        console.error('Failed to create conversation', err)
      }
    }

    // Add a placeholder message we'll stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '', agentId: skillId }])

    const controller = new AbortController()
    abortRef.current = controller
    const startTime = Date.now()

    let fullContent = ''
    let outputAgentId = skillId

    try {
      const res = await fetch(
        `/api/chat?skill=${encodeURIComponent(skillId)}&message=${encodeURIComponent(userMsg)}`,
        { signal: controller.signal }
      )

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.message || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text_delta') {
              fullContent += event.text || ''
              setMessages(prev => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: fullContent }
                }
                return next
              })
            } else if (event.type === 'done') {
              outputAgentId = event.runId || outputAgentId
            }
          } catch { /* skip malformed lines */ }
        }
      }

      // Final update with timing
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = {
            ...last,
            durationMs: Date.now() - startTime,
            agentId: outputAgentId,
          }
        }
        return next
      })

    } catch (e: any) {
      if (e.name === 'AbortError') {
        setMessages(prev => [...prev, { role: 'system', content: '⏹ Cancelled by user.' }])
      } else {
        console.error('Chat stream error', e)
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Daemon offline or agent unavailable. Please try again.',
          agentId: 'error',
        }])
        setErrorMsg('Error during chat. Please check your connection.')
      }
    } finally {
      // Save the message pair to the database even on abort/error
      if (currentConvId) {
        try {
          await api.conversations.messages.create(currentConvId, {
            userMessage: userMsg,
            assistantMessage: fullContent, // saves whatever partial content we received
            agentId: outputAgentId
          })
          if (isNewConv) {
            loadConversations() // reload to get the new conversation in the list
          }
        } catch (saveErr) {
          console.error('Failed to save messages to DB:', saveErr)
        }
      }
    }

    abortRef.current = null
    setLoading(false)
  }

  const cancelRun = () => {
    abortRef.current?.abort()
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] max-w-[1400px] mx-auto border-x border-[var(--border-light)] bg-[var(--bg-panel)]">
      {/* Sidebar - Conversations List */}
      <div className="w-64 shrink-0 flex flex-col border-r border-[var(--border-light)] bg-[var(--bg-base)]">
        <div className="p-4 border-b border-[var(--border-light)]">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <MessageSquarePlus size={16} />
            New Chat
          </button>
        </div>
        {errorMsg && (
          <div className="mx-2 mt-2 p-2 bg-[var(--error-bg)] border border-[var(--error)] text-[var(--error)] text-xs rounded-lg flex justify-between items-start">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">×</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-xs text-center text-[var(--text-tertiary)] mt-4 p-4">
              No conversations yet.
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadMessages(conv.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeConversationId === conv.id
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <MessageSquare size={14} className="shrink-0 text-[var(--text-tertiary)]" />
                <div className="flex-1 truncate text-sm">
                  {conv.title}
                </div>
                <button
                  onClick={(e) => deleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-[var(--error)] text-[var(--text-tertiary)] transition-all shrink-0 p-1 rounded-md hover:bg-[var(--bg-subtle)]"
                  title="Delete conversation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border-light)] shrink-0 bg-[var(--bg-panel)]">
          <Bot size={18} className="text-[var(--accent)]" />
          <h1 className="font-semibold text-sm truncate flex-1">
            {activeConversationId
              ? conversations.find(c => c.id === activeConversationId)?.title || 'Conversation'
              : 'New Chat'}
          </h1>
          <select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)}
            className="h-8 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-base)] px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] max-w-[200px]">
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
                  ? `${skills.length} skills available — messages stream in real-time`
                  : 'Skills loading...'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {['Design a POD product', 'Research pet niche', 'Write Etsy SEO copy', 'Create ad creative'].map(tip => (
                  <button key={tip}
                    onClick={() => { setInput(tip) }}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors bg-[var(--bg-base)]">
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
              <div className={`max-w-3xl rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white'
                  : msg.role === 'system'
                  ? 'bg-[var(--warning-bg)] border border-[var(--warning)] text-sm'
                  : 'bg-[var(--bg-base)] border border-[var(--border-light)]'
              }`}>
                <pre className="text-sm whitespace-pre-wrap font-sans">{msg.content || (loading && i === messages.length - 1 ? '▊' : '')}</pre>
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

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border-light)] p-4 bg-[var(--bg-panel)] shrink-0">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="Describe your task — e.g. 'Design a cat mug for POD' or 'Research pet toy niche'"
              className="flex-1 h-10 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-base)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
              disabled={loading}
            />
            {loading ? (
              <button onClick={cancelRun}
                className="h-10 px-4 rounded-lg bg-[var(--error)] text-white hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium shrink-0">
                <Square size={14} />
                Stop
              </button>
            ) : (
              <button onClick={sendMessage} disabled={!input.trim()}
                className="h-10 px-4 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2 text-sm font-medium shrink-0">
                <Send size={14} />
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
