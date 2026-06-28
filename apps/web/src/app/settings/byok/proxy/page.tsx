'use client'

import { useState } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

export default function ProxySettingsPage() {
  const [proxyUrl, setProxyUrl] = useState('')
  const [proxyAuth, setProxyAuth] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Note: Since this is just UI, we mimic saving
    localStorage.setItem('byok_proxy_url', proxyUrl)
    localStorage.setItem('byok_proxy_auth', proxyAuth)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <a href="/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">&larr; Back to Settings</a>
        <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">BYOK Proxy Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure proxy details for your Bring Your Own Key integrations to route requests securely.
        </p>
      </div>

      <Card title="Proxy Configuration" padding="lg">
        <div className="space-y-4">
          <div>
            <Input
              label="Proxy Server URL"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://proxy.yourcompany.com"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              The base URL of your forward proxy.
            </p>
          </div>

          <div>
            <Input
              label="Proxy Authentication Header (Optional)"
              type="password"
              value={proxyAuth}
              onChange={(e) => setProxyAuth(e.target.value)}
              placeholder="Bearer ..."
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Used if your proxy requires an authorization header.
            </p>
          </div>

          <div className="pt-4 flex items-center gap-4">
            <Button onClick={handleSave}>Save Proxy Settings</Button>
            {saved && <span className="text-sm text-[var(--success)]">Settings saved successfully.</span>}
          </div>
        </div>
      </Card>
    </div>
  )
}
