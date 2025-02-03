import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for all tests in this suite
    test.setTimeout(60000);
  });

  test('login page should load correctly', async ({ page }) => {
    try {
      // Navigate to the login page with extended timeout
      await page.goto('http://localhost:3001/login', { 
        timeout: 30000,
        waitUntil: 'networkidle' 
      });
      
      // Wait for the page to be fully loaded with extended timeout
      await page.waitForLoadState('networkidle', { timeout: 20000 });

      // Log page content for debugging
      const pageContent = await page.content();
      console.log('Page Content:', pageContent);

      // Try multiple strategies to find the login form
      const loginFormSelectors = [
        'form[data-testid="login-form"]',
        'form.login-form',
        'form#login-form',
        'form[name="login"]',
        'form'
      ];

      let loginForm = null;
      for (const selector of loginFormSelectors) {
        try {
          loginForm = await page.locator(selector).first();
          await expect(loginForm).toBeVisible({ timeout: 10000 });
          break;
        } catch {
          continue;
        }
      }

      // If no form found, throw detailed error
      if (!loginForm) {
        throw new Error(`Login form not found. Page content: ${pageContent}`);
      }
      
      // Check for email and password inputs
      const emailInput = page.getByLabel(/email/i).first();
      const passwordInput = page.getByLabel(/password/i).first();
      const loginButton = page.getByRole('button', { name: /sign in/i }).first();

      // Expect inputs and button to be visible and interactable
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await expect(passwordInput).toBeVisible({ timeout: 10000 });
      await expect(loginButton).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error('Login page test failed:', error);
      throw error;
    }
  });

  test('should prevent login with invalid credentials', async ({ page }) => {
    try {
      // Navigate to the login page with extended timeout
      await page.goto('http://localhost:3001/login', { 
        timeout: 30000,
        waitUntil: 'networkidle' 
      });
      
      // Wait for the page to be fully loaded with extended timeout
      await page.waitForLoadState('networkidle', { timeout: 20000 });

      // Find inputs and button
      const emailInput = page.getByLabel(/email/i).first();
      const passwordInput = page.getByLabel(/password/i).first();
      const loginButton = page.getByRole('button', { name: /sign in/i }).first();

      // Ensure inputs are visible and interactable
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await expect(passwordInput).toBeVisible({ timeout: 10000 });
      await expect(loginButton).toBeVisible({ timeout: 10000 });

      // Fill out form with invalid credentials
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      await loginButton.click();

      // Wait for potential error message
      await page.waitForSelector('div[role="alert"]', { timeout: 10000 });

      // Check for error message with more flexible selector
      const errorMessages = await page.getByText(/invalid credentials|error|login failed/i).all();
      expect(errorMessages.length).toBeGreaterThan(0);
      
      // Ensure error message is visible
      const errorMessage = page.getByText(/invalid credentials|error|login failed/i).first();
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error('Invalid login test failed:', error);
      throw error;
    }
  });
}); 