'use client'

import { useState } from 'react'

export default function WorkspacePage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:7456/api/skills')
      const data = await res.json()
      const skills = data.skills ?? []
      const msg = `Found ${skills.length} available skills. ${input}`
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Daemon offline. Start with: ecc daemon' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Home</a>
        <h1 className="font-semibold">Workspace</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-xl mb-2">Ask about POD, dropshipping, or campaigns</p>
            <p className="text-sm">Or pick a skill from the panel</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg rounded-xl px-4 py-2 ${
              msg.role === 'user'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm">Thinking...</div>}
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about products, campaigns, or analytics..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={sendMessage}
            className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
