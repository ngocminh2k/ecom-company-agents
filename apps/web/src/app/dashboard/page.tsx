'use client'

import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    fetch('http://localhost:7456/api/ecommerce/summary')
      .then(r => r.json())
      .then(d => setSummary(d.summary))
      .catch(() => {})
  }, [])

  const cards = summary ? [
    { label: 'Revenue', value: `$${summary.revenue?.toLocaleString()}`, color: 'text-green-600' },
    { label: 'Orders', value: summary.orders, color: 'text-blue-600' },
    { label: 'AOV', value: `$${summary.aov}`, color: 'text-purple-600' },
    { label: 'Conversion', value: `${summary.conversionRate}%`, color: 'text-indigo-600' },
    { label: 'Ad ROAS', value: `${summary.roas}x`, color: 'text-orange-600' },
    { label: 'Customers', value: summary.customers, color: 'text-teal-600' },
  ] : []

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Home</a>
      <h1 className="text-2xl font-bold mt-4 mb-8">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">{card.label}</div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 rounded-xl border border-gray-200">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <a href="/products" className="p-3 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium text-center hover:bg-indigo-100">
            Manage Products
          </a>
          <a href="/workspace" className="p-3 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium text-center hover:bg-indigo-100">
            Chat with Agents
          </a>
          <a href="/agents" className="p-3 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium text-center hover:bg-indigo-100">
            Browse Agents
          </a>
        </div>
      </div>
    </div>
  )
}
