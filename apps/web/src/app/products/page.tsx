'use client'

import { useEffect, useState } from 'react'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', type: 'pod', description: '', price: '' })

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    try {
      const r = await fetch('http://localhost:7456/api/products')
      const d = await r.json()
      setProducts(d.products ?? [])
    } catch {}
  }

  const createProduct = async () => {
    if (!form.name) return
    await fetch('http://localhost:7456/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: form.price ? parseFloat(form.price) : null }),
    })
    setForm({ name: '', type: 'pod', description: '', price: '' })
    loadProducts()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Home</a>
      <h1 className="text-2xl font-bold mt-4 mb-8">Products</h1>

      <div className="rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold mb-4">New Product</h2>
        <div className="grid grid-cols-4 gap-3">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Product name" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="pod">POD</option>
            <option value="dropshipping">Dropshipping</option>
          </select>
          <button onClick={createProduct} className="bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600">
            Create
          </button>
        </div>
        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Description (optional)" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div className="space-y-3">
        {products.map((p: any) => (
          <div key={p.id} className="rounded-lg border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-500">{p.type} • ${p.price ?? '—'}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              p.status === 'active' ? 'bg-green-100 text-green-700' :
              p.status === 'draft' ? 'bg-gray-100 text-gray-600' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {p.status}
            </span>
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-400 text-center py-8">No products yet</p>}
      </div>
    </div>
  )
}
