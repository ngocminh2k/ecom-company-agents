const fs = require('fs');
const file = 'packages/ecommerce-core/src/finance/reconciliation-service.ts';
let code = fs.readFileSync(file, 'utf8');

// remove duplicate comments
code = code.replace(/\/\*\*\s*\n\s*\*\s*Compute true SKU-level margin across multi-channel inputs\.\s*\n\s*\*\/\s*\n\s*\/\*\*\s*\n\s*\*\s*Compute true SKU-level margin across multi-channel inputs\.\s*\n\s*\*\s*PR Feedback: Use strict immutability - mapping function returning new object instead of mutating map entries\.\s*\n\s*\*\//g, `/**\n   * Compute true SKU-level margin across multi-channel inputs.\n   * PR Feedback: Use strict immutability - mapping function returning new object instead of mutating map entries.\n   */`);

code = code.replace(/const withRevenues = revenues\.reduce\(\(acc, rev\) => \{\s*const current = acc\.get\(rev\.sku\) \|\| getEmptyReport\(rev\.sku\)\s*const next = new Map\(acc\)\s*next\.set\(rev\.sku, \{\s*\.\.\.current,\s*unitsSold: current\.unitsSold \+ rev\.quantity,\s*grossRevenue: current\.grossRevenue \+ Math\.round\(rev\.grossRevenue \* 100\),\s*platformFees: current\.platformFees \+ Math\.round\(rev\.platformFee \* 100\),\s*paymentProcessingFees: current\.paymentProcessingFees \+ Math\.round\(\(rev\.paymentProcessingFee \?\? 0\) \* 100\)\s*\}\)\s*return next\s*\}, initialMap\)\s* \/\/ Process costs\s*const withCosts = costs\.reduce\(\(acc, cost\) => \{\s*const current = acc\.get\(cost\.sku\) \|\| getEmptyReport\(cost\.sku\)\s*const next = new Map\(acc\)\s*next\.set\(cost\.sku, \{\s*\.\.\.current,\s*cogs: current\.cogs \+ Math\.round\(cost\.cogs \* 100\),\s*shippingCost: current\.shippingCost \+ Math\.round\(cost\.shippingCost \* 100\)\s*\}\)\s*return next\s*\}, withRevenues\)\s* \/\/ Process ads\s*const withAds = ads\.reduce\(\(acc, ad\) => \{\s*const current = acc\.get\(ad\.sku\) \|\| getEmptyReport\(ad\.sku\)\s*const next = new Map\(acc\)\s*next\.set\(ad\.sku, \{\s*\.\.\.current,\s*adSpend: current\.adSpend \+ Math\.round\(ad\.spend \* 100\)\s*\}\)\s*return next\s*\}, withCosts\)\s* \/\/ Process refunds\s*const finalMap = refunds\.reduce\(\(acc, ref\) => \{\s*const current = acc\.get\(ref\.sku\) \|\| getEmptyReport\(ref\.sku\)\s*const next = new Map\(acc\)\s*next\.set\(ref\.sku, \{\s*\.\.\.current,\s*refundsAndRemakes: current\.refundsAndRemakes \+ Math\.round\(ref\.amount \* 100\)\s*\}\)\s*return next\s*\}, withAds\)/, `// Process revenues
    for (const rev of revenues) {
      const current = initialMap.get(rev.sku) || getEmptyReport(rev.sku)
      initialMap.set(rev.sku, {
        ...current,
        unitsSold: current.unitsSold + rev.quantity,
        grossRevenue: current.grossRevenue + Math.round(rev.grossRevenue * 100),
        platformFees: current.platformFees + Math.round(rev.platformFee * 100),
        paymentProcessingFees: current.paymentProcessingFees + Math.round((rev.paymentProcessingFee ?? 0) * 100)
      })
    }

    // Process costs
    for (const cost of costs) {
      const current = initialMap.get(cost.sku) || getEmptyReport(cost.sku)
      initialMap.set(cost.sku, {
        ...current,
        cogs: current.cogs + Math.round(cost.cogs * 100),
        shippingCost: current.shippingCost + Math.round(cost.shippingCost * 100)
      })
    }

    // Process ads
    for (const ad of ads) {
      const current = initialMap.get(ad.sku) || getEmptyReport(ad.sku)
      initialMap.set(ad.sku, {
        ...current,
        adSpend: current.adSpend + Math.round(ad.spend * 100)
      })
    }

    // Process refunds
    for (const ref of refunds) {
      const current = initialMap.get(ref.sku) || getEmptyReport(ref.sku)
      initialMap.set(ref.sku, {
        ...current,
        refundsAndRemakes: current.refundsAndRemakes + Math.round(ref.amount * 100)
      })
    }
    const finalMap = initialMap;`);

fs.writeFileSync(file, code);
