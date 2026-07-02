import { test, expect } from '@playwright/test';

test('App starts and shows Dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=AgentPulse Commerce')).toBeVisible();
});
