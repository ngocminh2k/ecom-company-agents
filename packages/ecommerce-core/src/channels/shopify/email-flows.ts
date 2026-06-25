/**
 * Shopify Channel — Email Flow Templates
 *
 * Pre-built email sequences for welcome, abandoned cart, post-purchase,
 * winback, and seasonal campaigns.
 *
 * KHONG dung agent. Code thuan — template structures only.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string
  previewText: string
  bodyHtml: string
}

export interface TimingRule {
  trigger: 'immediately' | 'after_delay'
  delayHours?: number
  delayDays?: number
}

export interface EmailFlowStep {
  order: number
  template: EmailTemplate
  timing: TimingRule
}

export interface EmailFlow {
  name: string
  description: string
  steps: EmailFlowStep[]
}

// ─── Helper: Build a styled email body ───────────────────────────────────────

function buildBody(contentHtml: string, footerHtml: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1a1a2e; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 32px 24px; color: #333333; line-height: 1.6; font-size: 16px; }
    .body h2 { color: #1a1a2e; font-size: 20px; margin-top: 24px; }
    .body p { margin: 12px 0; }
    .cta { text-align: center; margin: 24px 0; }
    .cta a { display: inline-block; background: #e94560; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: 600; font-size: 16px; }
    .footer { background: #f4f4f4; padding: 24px; text-align: center; color: #888888; font-size: 12px; }
    .badge { display: inline-block; background: #ffd700; color: #1a1a2e; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 14px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${shopName}</h1>
    </div>
    <div class="body">
      ${contentHtml}
    </div>
    <div class="footer">
      ${footerHtml || '<p>You received this email because you subscribed or shopped with us.</p><p><a href="{{unsubscribe_url}}" style="color:#888888;">Unsubscribe</a></p>'}
    </div>
  </div>
</body>
</html>`
}

const shopName = '{{shop_name}}'

// ─── 1. Welcome Flow ────────────────────────────────────────────────────────

export function welcomeFlow(): EmailFlow {
  return {
    name: 'Welcome Series',
    description: 'Onboard new subscribers with brand story and first-purchase incentive.',
    steps: [
      {
        order: 1,
        timing: { trigger: 'immediately' },
        template: {
          subject: `Welcome to ${shopName} — here is 10% off your first order!`,
          previewText: `Thank you for subscribing! Enjoy your exclusive discount.`,
          bodyHtml: buildBody(`
            <h2>Welcome to the Family!</h2>
            <p>Thank you for subscribing to ${shopName}. We are thrilled to have you on board.</p>
            <p>As a welcome gift, enjoy <strong>10% off</strong> your first order:</p>
            <div class="cta">
              <a href="{{discount_url}}">SHOP NOW — GET 10% OFF</a>
            </div>
            <p>Use code: <span class="badge">WELCOME10</span></p>
            <p>We create {{product_description}} — each piece is designed with care and attention to detail.</p>
          `, `
            <p>${shopName} — {{shop_address}}</p>
            <p>Discount expires in 14 days. One use per customer.</p>
          `),
        },
      },
      {
        order: 2,
        timing: { trigger: 'after_delay', delayDays: 2 },
        template: {
          subject: `What makes ${shopName} different?`,
          previewText: `Our story, our values, and our commitment to quality.`,
          bodyHtml: buildBody(`
            <h2>Our Story</h2>
            <p>Every product at ${shopName} starts with a simple idea: create something beautiful that makes life better.</p>
            <p>We carefully select materials, work with skilled artisans, and test every design before it reaches your doorstep.</p>
            <h2>Why Our Customers Love Us</h2>
            <ul>
              <li>Premium quality materials</li>
              <li>Handcrafted with attention to detail</li>
              <li>Fast shipping worldwide</li>
              <li>30-day satisfaction guarantee</li>
            </ul>
            <div class="cta">
              <a href="{{collection_url}}">EXPLORE BESTSELLERS</a>
            </div>
          `),
        },
      },
      {
        order: 3,
        timing: { trigger: 'after_delay', delayDays: 5 },
        template: {
          subject: `Last chance! Your 10% off is expiring soon`,
          previewText: `Dont miss out — your welcome discount expires in 7 days.`,
          bodyHtml: buildBody(`
            <h2>Dont Miss Out!</h2>
            <p>Your <strong>10% off</strong> welcome discount is about to expire. This is your last chance to use it.</p>
            <div class="cta">
              <a href="{{discount_url}}">USE MY 10% OFF BEFORE IT EXPIRES</a>
            </div>
            <p>Code: <span class="badge">WELCOME10</span></p>
            <p>Not sure what to get? Check out our {{bestseller_link}} or browse by {{category_link}}.</p>
          `),
        },
      },
    ],
  }
}

// ─── 2. Abandoned Cart Flow (3 emails) ──────────────────────────────────────

export function abandonedCartFlow(): EmailFlow {
  return {
    name: 'Abandoned Cart Recovery',
    description: 'Recover lost sales with a 3-email sequence: gentle reminder, social proof, urgency.',
    steps: [
      {
        order: 1,
        timing: { trigger: 'after_delay', delayHours: 1 },
        template: {
          subject: `You left something in your cart at ${shopName}`,
          previewText: `Your items are still waiting — complete your order now.`,
          bodyHtml: buildBody(`
            <h2>Forgot Something?</h2>
            <p>You added items to your cart but did not complete the purchase. They are still waiting for you!</p>
            <div class="cta">
              <a href="{{cart_url}}">RETURN TO CART</a>
            </div>
            <p><strong>In your cart:</strong></p>
            <p>{{cart_summary}}</p>
            <p>Questions? Reply to this email — we are happy to help!</p>
          `),
        },
      },
      {
        order: 2,
        timing: { trigger: 'after_delay', delayHours: 24 },
        template: {
          subject: `Still thinking about it? Here is what others say`,
          previewText: `See why customers love our products.`,
          bodyHtml: buildBody(`
            <h2>Customer Reviews</h2>
            <p>Here is what our customers are saying about the items in your cart:</p>
            <blockquote style="border-left: 4px solid #e94560; padding-left: 16px; margin: 16px 0; color: #555;">
              "Absolutely love it! The quality exceeded my expectations. Fast shipping too." — Sarah M.
            </blockquote>
            <blockquote style="border-left: 4px solid #e94560; padding-left: 16px; margin: 16px 0; color: #555;">
              "Bought this as a gift and they adored it. Will definitely order again." — James K.
            </blockquote>
            <div class="cta">
              <a href="{{cart_url}}">SEE WHAT OTHERS LOVE</a>
            </div>
          `),
        },
      },
      {
        order: 3,
        timing: { trigger: 'after_delay', delayHours: 72 },
        template: {
          subject: `Your cart is expiring — grab it now with free shipping!`,
          previewText: `Last call! Free shipping on your abandoned items.`,
          bodyHtml: buildBody(`
            <h2>Free Shipping Just for You!</h2>
            <p>We noticed you have not completed your purchase yet. As a courtesy, we are offering <strong>free shipping</strong> on your cart items — but this offer expires soon.</p>
            <div class="cta">
              <a href="{{cart_url}}">COMPLETE ORDER — FREE SHIPPING</a>
            </div>
            <p>Use code: <span class="badge">FREESHIP</span></p>
            <p>Dont wait — your items are popular and库存 is limited.</p>
          `),
        },
      },
    ],
  }
}

// ─── 3. Post-Purchase Flow (thank you + review) ─────────────────────────────

export function postPurchaseFlow(): EmailFlow {
  return {
    name: 'Post-Purchase Follow-Up',
    description: 'Thank customer, request review, and encourage repeat purchase.',
    steps: [
      {
        order: 1,
        timing: { trigger: 'after_delay', delayDays: 1 },
        template: {
          subject: `Thank you for your order at ${shopName}!`,
          previewText: `We are preparing your items with care.`,
          bodyHtml: buildBody(`
            <h2>Thank You for Your Order!</h2>
            <p>Your order <strong>#{{order_number}}</strong> has been received and is being processed.</p>
            <p><strong>Order Summary:</strong></p>
            <p>{{order_summary}}</p>
            <p>You will receive a shipping confirmation with tracking information once your order ships.</p>
            <p>Estimated delivery: <strong>{{estimated_delivery}}</strong></p>
            <p>In the meantime, explore our {{new_arrivals_link}} or {{bestseller_link}}.</p>
          `),
        },
      },
      {
        order: 2,
        timing: { trigger: 'after_delay', delayDays: 7 },
        template: {
          subject: `How do you like your ${shopName} purchase?`,
          previewText: `Share your feedback and help other shoppers.`,
          bodyHtml: buildBody(`
            <h2>We Value Your Feedback</h2>
            <p>We hope you are enjoying your purchase! Could you take a moment to leave a review?</p>
            <p>Your honest feedback helps other customers make informed decisions and helps us improve.</p>
            <div class="cta">
              <a href="{{review_url}}">WRITE A REVIEW</a>
            </div>
            <p>As a thank you, reviewers get <strong>5% off</strong> their next purchase!</p>
          `),
        },
      },
    ],
  }
}

// ─── 4. Winback Flow (30/60/90 days inactive) ───────────────────────────────

export function winbackFlow(): EmailFlow {
  return {
    name: 'Winback Series',
    description: 'Re-engage inactive customers with incentives and new arrivals.',
    steps: [
      {
        order: 1,
        timing: { trigger: 'after_delay', delayDays: 30 },
        template: {
          subject: `We miss you at ${shopName}! Here is 15% off`,
          previewText: `Come back and see what is new — plus a special discount just for you.`,
          bodyHtml: buildBody(`
            <h2>We Miss You!</h2>
            <p>It has been a while since your last visit. We have added many new products and would love to welcome you back.</p>
            <p>Here is a <strong>15% off</strong> coupon exclusively for you:</p>
            <div class="cta">
              <a href="{{discount_url}}">COME BACK — 15% OFF</a>
            </div>
            <p>Code: <span class="badge">MISSYOU15</span></p>
            <p>Check out our latest {{new_arrivals_link}}.</p>
          `),
        },
      },
      {
        order: 2,
        timing: { trigger: 'after_delay', delayDays: 60 },
        template: {
          subject: `Is ${shopName} still your style? Here is 20% off`,
          previewText: `We updated our collection — see what is new.`,
          bodyHtml: buildBody(`
            <h2>New Collection Just Dropped</h2>
            <p>We have refreshed our catalog with new designs and products. As a valued customer, enjoy <strong>20% off</strong> your next order.</p>
            <div class="cta">
              <a href="{{collection_url}}">SHOP NEW ARRIVALS — 20% OFF</a>
            </div>
            <p>Code: <span class="badge">WELCOMEBACK20</span></p>
          `),
        },
      },
      {
        order: 3,
        timing: { trigger: 'after_delay', delayDays: 90 },
        template: {
          subject: `Dont miss out! Final chance for 25% off at ${shopName}`,
          previewText: `Last chance for your exclusive discount before we remove it.`,
          bodyHtml: buildBody(`
            <h2>Last Chance — 25% Off</h2>
            <p>This is our final offer. We would love to see you back, but if we do not hear from you, we will stop sending emails.</p>
            <p>Take <strong>25% off</strong> your entire order with the code below:</p>
            <div class="cta">
              <a href="{{discount_url}}">FINAL OFFER — 25% OFF</a>
            </div>
            <p>Code: <span class="badge">COMEBACK25</span></p>
            <p>If you no longer wish to receive emails, {{unsubscribe_link}}.</p>
          `),
        },
      },
    ],
  }
}

// ─── 5. Seasonal Campaign Template ──────────────────────────────────────────

export interface SeasonalCampaignConfig {
  season: string
  occasion: string
  discountPercent: number
  urgencyDays: number
}

export function seasonalCampaignFlow(config: SeasonalCampaignConfig): EmailFlow {
  return {
    name: `${config.occasion} Campaign`,
    description: `Seasonal campaign for ${config.occasion} with themed content and urgency.`,
    steps: [
      {
        order: 1,
        timing: { trigger: 'after_delay', delayDays: 14 },
        template: {
          subject: `${config.occasion} is Coming — Get Ready with ${shopName}!`,
          previewText: `Shop early for the best selection and exclusive deals.`,
          bodyHtml: buildBody(`
            <h2>${config.occasion} is Almost Here!</h2>
            <p>Get ahead of the season with our curated ${config.occasion.toLowerCase()} collection. Shop early for the best selection.</p>
            <p>Enjoy <strong>${config.discountPercent}% off</strong> sitewide with code <span class="badge">${config.occasion.toUpperCase().replace(/\s+/g, '')}</span></p>
            <div class="cta">
              <a href="{{collection_url}}">SHOP ${config.occasion.toUpperCase()}</a>
            </div>
            <p>Free shipping on orders over $50. Offer valid until {{offer_end_date}}.</p>
          `),
        },
      },
      {
        order: 2,
        timing: { trigger: 'after_delay', delayDays: 7 },
        template: {
          subject: `Gift Guide: Perfect ${config.occasion} Gifts from ${shopName}`,
          previewText: `Curated gift ideas for everyone on your list.`,
          bodyHtml: buildBody(`
            <h2>${config.occasion} Gift Guide</h2>
            <p>Not sure what to get? We have curated gift ideas for everyone:</p>
            <h3>For Her</h3>
            <p>{{gift_for_her}}</p>
            <h3>For Him</h3>
            <p>{{gift_for_him}}</p>
            <h3>For Kids</h3>
            <p>{{gift_for_kids}}</p>
            <div class="cta">
              <a href="{{gift_guide_url}}">VIEW FULL GIFT GUIDE</a>
            </div>
          `),
        },
      },
      {
        order: 3,
        timing: { trigger: 'after_delay', delayDays: 3 },
        template: {
          subject: `⏰ Last Minute: ${config.occasion} Gifts — Order Now for On-Time Delivery`,
          previewText: `Time is running out! Order by {{last_order_date}} for guaranteed delivery.`,
          bodyHtml: buildBody(`
            <h2>Last Call for ${config.occasion}!</h2>
            <p>Time is running out! Order by <strong>{{last_order_date}}</strong> for guaranteed on-time delivery.</p>
            <p>Use code <span class="badge">${config.occasion.toUpperCase().replace(/\s+/g, '')}</span> for <strong>${config.discountPercent}% off</strong>.</p>
            <div class="cta">
              <a href="{{collection_url}}">ORDER NOW — LAST CHANCE</a>
            </div>
            <p>Already ordered? Track your {{order_status_link}}.</p>
          `),
        },
      },
    ],
  }
}

// ─── Flow registry ──────────────────────────────────────────────────────────

export const EMAIL_FLOWS = {
  welcome: welcomeFlow,
  abandonedCart: abandonedCartFlow,
  postPurchase: postPurchaseFlow,
  winback: winbackFlow,
  seasonal: seasonalCampaignFlow,
} as const

export type EmailFlowName = keyof typeof EMAIL_FLOWS
