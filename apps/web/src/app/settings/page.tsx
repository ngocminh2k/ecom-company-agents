'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

export default function SettingsPage() {
  const [stripeKey, setStripeKey] = useState('')
  const [vendorKey, setVendorKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load existing keys from local storage
    const storedStripe = localStorage.getItem('byok_stripe_key')
    const storedVendor = localStorage.getItem('byok_vendor_key')
    if (storedStripe) setStripeKey(storedStripe)
    if (storedVendor) setVendorKey(storedVendor)
  }, [])

  const handleSave = () => {
    localStorage.setItem('byok_stripe_key', stripeKey)
    localStorage.setItem('byok_vendor_key', vendorKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">
        Configure your BYOK (Bring Your Own Key) proxy settings and external integrations.
      </p>

      <Card title="API Keys Configuration" padding="lg">
        <div className="space-y-4">
          <div>
            <Input
              label="Stripe Secret Key"
              type="password"
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              placeholder="sk_test_..."
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Used for connecting to your Stripe account for payments and disputes.
            </p>
          </div>

          <div>
            <Input
              label="Vendor API Key"
              type="password"
              value={vendorKey}
              onChange={(e) => setVendorKey(e.target.value)}
              placeholder="Vendor production key..."
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Used for fulfillment and inventory synchronization.
            </p>
          </div>

          <div className="pt-4 flex items-center gap-4">
            <Button onClick={handleSave}>Save Keys</Button>
            {saved && <span className="text-sm text-[var(--success)]">Settings saved successfully.</span>}
          </div>
        </div>
      </Card>
    </div>
  )
}
