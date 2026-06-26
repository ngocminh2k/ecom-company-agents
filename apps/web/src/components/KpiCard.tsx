import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  value: string
  change?: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

export function KpiCard({ label, value, change, icon: Icon, iconColor, iconBg }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-card hover:shadow-elevated transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {change && <div className="text-xs text-emerald-600 font-medium mt-1">{change} vs last month</div>}
    </div>
  )
}
