/**
 * Launch Checklist Service — 17-item pre-launch checklist (SOP Section 23).
 *
 * Moi san pham phai qua 17 buoc kiem tra truoc khi launch.
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export interface LaunchChecklistItem {
  id: string
  productId: string
  itemId: number
  itemName: string
  completed: boolean
  completedAt?: string
  completedBy?: string
  notes?: string
}

export const LAUNCH_CHECKLIST_ITEMS: Array<{ id: number; name: string }> = [
  { id: 1,  name: 'Product research sheet completed' },
  { id: 2,  name: 'Competitor analysis completed' },
  { id: 3,  name: 'Margin estimate approved' },
  { id: 4,  name: 'IP check completed' },
  { id: 5,  name: 'Creative brief approved' },
  { id: 6,  name: 'Listing assets ready' },
  { id: 7,  name: 'Ad assets ready' },
  { id: 8,  name: 'Production files correct' },
  { id: 9,  name: 'Vendor confirmed capable' },
  { id: 10, name: 'Etsy listing published (if chosen)' },
  { id: 11, name: 'Shopify page published (if chosen)' },
  { id: 12, name: 'Amazon listing ready (if chosen)' },
  { id: 13, name: 'Tracking pixel checked' },
  { id: 14, name: 'Support macros ready' },
  { id: 15, name: 'Fulfillment workflow tested' },
  { id: 16, name: 'Dashboard has SKU' },
  { id: 17, name: 'Channel owners assigned' },
]

export interface LaunchChecklistStorage {
  findByProductId(productId: string): LaunchChecklistItem[]
  findById(id: string): LaunchChecklistItem | undefined
  insert(item: LaunchChecklistItem): void
  update(id: string, updates: Partial<LaunchChecklistItem>): void
}

export class LaunchChecklistService {
  constructor(private storage: LaunchChecklistStorage) {}

  initChecklist(productId: string): LaunchChecklistItem[] {
    if (!productId) throw new Error('productId is required')

    const existing = this.storage.findByProductId(productId)
    if (existing.length > 0) {
      return existing
    }

    const now = new Date().toISOString()
    const items: LaunchChecklistItem[] = LAUNCH_CHECKLIST_ITEMS.map((template) => ({
      id: crypto.randomUUID(),
      productId,
      itemId: template.id,
      itemName: template.name,
      completed: false,
      notes: undefined,
      completedAt: undefined,
      completedBy: undefined,
    }))

    for (const item of items) {
      this.storage.insert(item)
    }

    return items
  }

  completeItem(id: string, completedBy?: string, notes?: string): LaunchChecklistItem {
    const item = this.storage.findById(id)
    if (!item) throw new Error(`Checklist item ${id} not found`)

    const now = new Date().toISOString()
    const updated: Partial<LaunchChecklistItem> = {
      completed: true,
      completedAt: now,
      completedBy: completedBy ?? undefined,
      notes: notes ?? undefined,
    }
    this.storage.update(id, updated)
    return { ...item, ...updated }
  }

  uncompleteItem(id: string): LaunchChecklistItem {
    const item = this.storage.findById(id)
    if (!item) throw new Error(`Checklist item ${id} not found`)

    const updated: Partial<LaunchChecklistItem> = {
      completed: false,
      completedAt: undefined,
      completedBy: undefined,
    }
    this.storage.update(id, updated)
    return { ...item, ...updated }
  }

  getProgress(productId: string): { total: number; completed: number; percentage: number; items: LaunchChecklistItem[] } {
    const items = this.storage.findByProductId(productId)
    const completed = items.filter((i) => i.completed).length
    return {
      total: items.length,
      completed,
      percentage: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
      items,
    }
  }

  getBlockedItems(productId: string): LaunchChecklistItem[] {
    return this.storage.findByProductId(productId).filter((i) => !i.completed)
  }
}
