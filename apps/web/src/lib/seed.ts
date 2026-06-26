/**
 * Seed the daemon DB with sample data via the API proxy.
 */
const BASE = '/api'

interface SeedProduct { name: string; type: string; price: number; description: string }

const SEED_PRODUCTS: SeedProduct[] = [
  { name: 'Saigon Soul Tee', type: 'pod', price: 29.99, description: 'Bella+Canvas 3001, DTG print — vintage Saigon design' },
  { name: 'Dragon Embroidered Jacket', type: 'pod', price: 89.99, description: 'Premium zip hoodie, embroidered back panel' },
  { name: 'Matcha Phone Grip', type: 'pod', price: 12.99, description: 'Universal ring grip, matcha swirl pattern' },
  { name: 'Bamboo Bluetooth Earbuds', type: 'dropshipping', price: 49.99, description: 'Eco-friendly bamboo finish, 8hr battery' },
  { name: 'Cork Elite Yoga Mat', type: 'dropshipping', price: 68.00, description: 'Natural cork, 6mm, non-slip' },
  { name: 'Urban Calm Tote Bag', type: 'pod', price: 24.99, description: 'Heavy canvas tote, screen-printed' },
  { name: 'Hanoi Nights Hoodie', type: 'pod', price: 59.99, description: 'Oversized pullover, neon sign print' },
  { name: 'Pho Spice Set', type: 'dropshipping', price: 34.99, description: 'Premium Vietnamese pho spice kit, 6 packs' },
  { name: 'Ao Dai Silk Scarf', type: 'pod', price: 44.99, description: 'Silk twill scarf, traditional Ao Dai pattern' },
  { name: 'Coffee Phin Drip Set', type: 'dropshipping', price: 28.99, description: 'Vietnamese traditional phin coffee brewer' },
]

export async function seedProducts(): Promise<number> {
  const existing = await fetch(`${BASE}/products`).then(r => r.json())
  const count = existing.products?.length ?? 0
  if (count > 0) return count

  let seeded = 0
  for (const p of SEED_PRODUCTS) {
    try {
      const r = await fetch(`${BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
      if (r.ok) seeded++
    } catch { /* daemon offline */ }
  }
  return seeded
}
