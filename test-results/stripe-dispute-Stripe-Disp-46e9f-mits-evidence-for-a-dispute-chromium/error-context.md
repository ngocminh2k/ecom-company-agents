# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stripe-dispute.spec.ts >> Stripe Dispute Handling User Journey >> User configures Stripe key and submits evidence for a dispute
- Location: smoke-tests\stripe-dispute.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('tr').filter({ hasText: 'dp_123_test' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('tr').filter({ hasText: 'dp_123_test' })

```

```yaml
- heading "404" [level=1]
- heading "This page could not be found." [level=2]
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Stripe Dispute Handling User Journey', () => {
  4  |   test('User configures Stripe key and submits evidence for a dispute', async ({ page }) => {
  5  |     // 1. User navigates to Finance / Disputes section
  6  |     await page.goto('/finance/disputes');
  7  |     await page.waitForLoadState('networkidle');
  8  |     
  9  |     // 2. User sees a new dispute needs attention
  10 |     const disputeRow = page.locator('tr').filter({ hasText: 'dp_123_test' });
> 11 |     await expect(disputeRow).toBeVisible();
     |                              ^ Error: expect(locator).toBeVisible() failed
  12 |     
  13 |     // 3. User clicks on "Handle Dispute"
  14 |     await disputeRow.getByRole('button', { name: 'Submit Evidence' }).click();
  15 |     
  16 |     // 4. User fills out evidence form
  17 |     await page.getByLabel('Customer Name').fill('John Doe');
  18 |     await page.getByLabel('Tracking Number').fill('1Z9999999999999999');
  19 |     await page.getByLabel('Carrier').fill('UPS');
  20 |     
  21 |     // 5. User submits the form
  22 |     await page.getByRole('button', { name: 'Submit to Stripe' }).click();
  23 |     
  24 |     // 6. User sees success message
  25 |     await expect(page.getByText('Evidence submitted successfully')).toBeVisible();
  26 |   });
  27 | });
  28 | 
```