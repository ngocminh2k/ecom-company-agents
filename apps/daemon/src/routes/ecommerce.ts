import { Router, type Router as RouterType } from 'express'

export const ecommerceRouter: RouterType = Router()

ecommerceRouter.get('/summary', (req: any, res) => {
  const db = req.daemonContext?.pool ? undefined : null
  // Will aggregate across products, orders, campaigns
  res.json({
    summary: {
      products: 0,
      orders: 0,
      campaigns: 0,
      revenue: 0,
    },
    message: 'E-commerce dashboard coming in Phase 5',
  })
})
