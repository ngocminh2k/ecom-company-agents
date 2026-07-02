# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> App starts and shows Dashboard
- Location: e2e\tests\app.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=AgentPulse Commerce')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=AgentPulse Commerce')

```

```yaml
- heading "9Router" [level=1]
- paragraph: Enter your password to access the dashboard
- text: Password
- textbox "Enter password"
- button "Login"
- paragraph:
  - text: Default password is
  - code: "123456"
- paragraph: "Security risk: no password set. You will be asked to set one when logging in remotely."
- alert
```

# Test source

```ts
  1 | import { test, expect } from '@playwright/test';
  2 | 
  3 | test('App starts and shows Dashboard', async ({ page }) => {
  4 |   await page.goto('/');
> 5 |   await expect(page.locator('text=AgentPulse Commerce')).toBeVisible();
    |                                                          ^ Error: expect(locator).toBeVisible() failed
  6 | });
  7 | 
```