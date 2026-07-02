import { test, expect } from '@playwright/test';

test.describe('E-Commerce E2E Flow', () => {
  test('User Simulator - Check Workspace and Fulfillment Exception Dashboard', async ({ page }) => {
    test.setTimeout(30000);

    // Workspace Chat Verification
    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    
    // HARD ASSERTIONS: If the UI is blank, this WILL fail.
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Send")')).toBeVisible();

    // Exception Dashboard Verification
    await page.goto('/fulfillment/orchestrator');
    await page.waitForLoadState('networkidle');
    
    // HARD ASSERTIONS: Ensure dashboard loads
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
    
    // Actually interact with the workspace
    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    
    // Test the input
    await page.fill('input[placeholder*="Describe your task"]', 'Hello workspace, let us test this chat');
    await page.click('button:has-text("Send")');
    
    // Wait for the message to appear
    await expect(page.locator('text=Hello workspace, let us test this chat')).toBeVisible();
  });
});
