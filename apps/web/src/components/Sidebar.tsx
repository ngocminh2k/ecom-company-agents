'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, Bot, MessageSquare,
  Truck, BarChart3, Settings, ChevronLeft,
  FileSpreadsheet, Rocket, AlertTriangle, HeadphonesIcon, DollarSign,
} from 'lucide-react'
import { useState } from 'react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/workspace', label: 'Workspace', icon: MessageSquare },
  { href: '/research', label: 'Research', icon: FileSpreadsheet },
  { href: '/launch', label: 'Launch', icon: Rocket },
  { href: '/bi/logs', label: 'BI Logs', icon: BarChart3 },
  { href: '/bi/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/fulfillment', label: 'Fulfillment', icon: Truck },
  { href: '/support/tickets', label: 'Support', icon: HeadphonesIcon },
  { href: '/finance', label: 'Finance', icon: DollarSign },
]

export default function Sidebar() {
  const path = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`flex flex-col bg-[var(--bg-sidebar)] text-[var(--text-inverse)] transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className="flex items-center gap-2 h-14 px-4 border-b border-white/10 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-xs font-bold shrink-0">
          E
        </div>
        {!collapsed && <span className="font-semibold text-sm tracking-tight">AgentPulse</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? path === '/' : path?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/5'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center w-full h-9 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  )
}
