/**
 * BYOK Proxy — forward LLM requests to any OpenAI-compatible endpoint.
 *
 * POST /api/proxy/{provider}/stream
 * Body: { baseUrl?, apiKey?, model, messages }
 *
 * Supports: anthropic, openai, azure, google, ollama
 * SSRF guard: blocks internal IP ranges.
 */
import { Router, type Router as RouterType } from 'express'
import { getConfig } from '../config.js'

export const proxyRouter: RouterType = Router()

const PROVIDER_MAP: Record<string, { defaultUrl: string; apiKeyEnv: string }> = {
  anthropic: { defaultUrl: 'https://api.anthropic.com/v1/messages', apiKeyEnv: 'ANTHROPIC_API_KEY' },
  openai:    { defaultUrl: 'https://api.openai.com/v1/chat/completions', apiKeyEnv: 'OPENAI_API_KEY' },
  google:    { defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/models', apiKeyEnv: 'GEMINI_API_KEY' },
  azure:     { defaultUrl: '', apiKeyEnv: 'OPENAI_API_KEY' },
  ollama:    { defaultUrl: 'http://localhost:11434/api/chat', apiKeyEnv: '' },
}

/** Naïve SSRF guard — reject IPs in private/link-local ranges */
function isBlockedHost(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    return /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.0\.0\.0|localhost$|::1$)/.test(host) &&
      !host.startsWith('127.0.0.1') // allow localhost proxy for Ollama
  } catch { return true }
}

proxyRouter.post('/:provider/stream', async (req: any, res) => {
  const { provider } = req.params
  const config = PROVIDER_MAP[provider]
  if (!config) {
    return res.status(400).json({ error: true, message: `Unsupported provider: ${provider}. Supported: ${Object.keys(PROVIDER_MAP).join(', ')}` })
  }

  const { baseUrl, apiKey, model, messages, ...rest } = req.body
  const targetUrl = baseUrl || config.defaultUrl
  if (!targetUrl) {
    return res.status(400).json({ error: true, message: `baseUrl required for ${provider}` })
  }

  // SSRF guard
  if (isBlockedHost(targetUrl)) {
    return res.status(403).json({ error: true, message: 'Blocked: target URL resolves to a private/internal network' })
  }

  const effectiveApiKey = apiKey || (config.apiKeyEnv ? process.env[config.apiKeyEnv] : '')
  if (!effectiveApiKey && provider !== 'ollama') {
    return res.status(400).json({ error: true, message: `API key required for ${provider}. Pass in body or set ${config.apiKeyEnv}` })
  }

  // Build headers per provider
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (provider === 'anthropic') {
    headers['x-api-key'] = effectiveApiKey
    headers['anthropic-version'] = '2023-06-01'
  } else if (provider === 'google') {
    // key goes in URL for Google
  } else {
    headers['Authorization'] = `Bearer ${effectiveApiKey}`
  }

  // Build body per provider
  let body: any
  if (provider === 'anthropic') {
    body = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      stream: true,
      messages: messages || [{ role: 'user', content: 'Hello' }],
      ...rest,
    }
  } else {
    body = {
      model: model || 'gpt-4o',
      stream: true,
      messages: messages || [{ role: 'user', content: 'Hello' }],
      ...rest,
    }
  }

  const googleKey = provider === 'google' ? `?key=${effectiveApiKey}` : ''
  const fetchUrl = provider === 'google'
    ? `${targetUrl}/${model || 'gemini-2.0-flash'}:streamGenerateContent${googleKey}`
    : targetUrl

  // SSE response
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error')
      res.write(`data: ${JSON.stringify({ type: 'error', message: `${response.status}: ${errText.slice(0, 200)}` })}\n\n`)
      res.end()
      return
    }

    const reader = response.body?.getReader()
    if (!reader) { res.end(); return }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          res.write(`data: ${line.slice(6)}\n\n`)
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', reason: 'completed' })}\n\n`)
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
  }

  res.end()
})
