'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Bot, Sparkles, Search, Zap, ArrowRight, Cpu, BookOpen, Store, DollarSign, HeadphonesIcon, Truck, Rocket, BarChart3, FileSpreadsheet, LayoutDashboard, ShoppingCart, Package } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'

export default function HomePage() {
  const [daemonStatus, setDaemonStatus] = useState<string>('checking...')
  const [skills, setSkills] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('http://127.0.0.1:7456/api/health')
      .then(r => r.json())
      .then(data => setDaemonStatus(`v${data.version} — online`))
      .catch(() => setDaemonStatus('offline'))

    api.skills.list().then(r => setSkills(r.skills)).catch(() => {})
  }, [])

  const isOnline = daemonStatus !== 'offline'

  const quickNav = [
    { href: '/workspace', label: 'Chat Workspace', icon: Bot, desc: 'Talk to AI agents' },
    { href: '/skills', label: 'Skills', icon: Sparkles, desc: 'Run agent skills', badge: `${skills.length}` },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Analytics & KPIs' },
    { href: '/products', label: 'Products', icon: Package, desc: 'Manage products' },
    { href: '/orders', label: 'Orders', icon: ShoppingCart, desc: 'Order management' },
  ]

  const appNav = [
    { href: '/research', label: 'Research', icon: FileSpreadsheet, desc: 'Product research & scoring' },
    { href: '/launch', label: 'Launch', icon: Rocket, desc: 'Launch pipeline (5-stage)' },
    { href: '/listings', label: 'Listings', icon: Store, desc: 'Etsy, Shopify, Amazon' },
    { href: '/fulfillment', label: 'Fulfillment', icon: Truck, desc: 'Orders & QC & vendors' },
    { href: '/support/tickets', label: 'Support', icon: HeadphonesIcon, desc: 'Tickets & refunds' },
    { href: '/finance', label: 'Finance', icon: DollarSign, desc: 'PnL & reconciliation' },
    { href: '/bi/logs', label: 'BI Logs', icon: BarChart3, desc: '7 log types & SLA' },
  ]

  const filteredSkills = search
    ? skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : skills.slice(0, 6)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AgentPulse <span className="text-[var(--accent)]">Commerce</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            AI Agent Harness for E-Commerce — POD & Dropshipping
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
          <span className="text-[var(--text-secondary)]">
            {isOnline ? `Daemon ${daemonStatus}` : 'Daemon offline'}
          </span>
          <Link href="/agents" className="text-xs text-[var(--accent)] hover:underline ml-1">238 agents</Link>
        </div>
      </div>

      {/* Quick search + skill launch */}
      <Card padding="lg" className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Search size={18} className="text-[var(--text-tertiary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search skills — e.g. 'Etsy', 'POD', 'Finance'..."
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[var(--text-tertiary)]" />
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredSkills.length > 0 ? filteredSkills.map(s => (
              <Link key={s.id} href={`/skills?skill=${s.id}`}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] hover:opacity-80 transition-opacity">
                <Zap size={12} />
                {s.name}
              </Link>
            )) : search && (
              <p className="text-xs text-[var(--text-tertiary)]">No skills match &quot;{search}&quot;</p>
            )}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {quickNav.map(item => (
          <Link key={item.href} href={item.href}>
            <Card padding="lg" className="h-full hover:border-[var(--accent)]/30 transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center">
                  <item.icon size={16} className="text-[var(--accent)]" />
                </div>
                {item.badge && <Badge variant="accent" className="ml-auto">{item.badge}</Badge>}
              </div>
              <div className="font-medium text-sm">{item.label}</div>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Applications */}
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">Applications</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {appNav.map(item => (
          <Link key={item.href} href={item.href}>
            <Card padding="sm" className="hover:border-[var(--accent)]/30 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center">
                  <item.icon size={15} className="text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{item.desc}</p>
                </div>
                <ArrowRight size={12} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
