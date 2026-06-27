import { test, expect } from '@playwright/test';

test.describe('Stripe Dispute Handling User Journey', () => {
  test('User configures Stripe key and submits evidence for a dispute', async ({ page }) => {
    // 1. User navigates to Finance / Disputes section
    await page.goto('/finance/disputes');
    await page.waitForLoadState('networkidle');
    
    // 2. User sees a new dispute needs attention
    const disputeRow = page.locator('tr').filter({ hasText: 'dp_123_test' });
    await expect(disputeRow).toBeVisible();
    
    // 3. User clicks on "Handle Dispute"
    await disputeRow.getByRole('button', { name: 'Submit Evidence' }).click();
    
    // 4. User fills out evidence form
    await page.getByLabel('Customer Name').fill('John Doe');
    await page.getByLabel('Tracking Number').fill('1Z9999999999999999');
    await page.getByLabel('Carrier').fill('UPS');
    
    // 5. User submits the form
    await page.getByRole('button', { name: 'Submit to Stripe' }).click();
    
    // 6. User sees success message
    await expect(page.getByText('Evidence submitted successfully')).toBeVisible();
  });
});
