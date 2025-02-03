import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('home page should have correct title and basic structure', async ({ page }) => {
    // Increase timeout for this specific test
    test.setTimeout(60000);

    try {
      // Navigate to the home page with extended timeout and wait for network idle
      await page.goto('http://localhost:3001', { 
        timeout: 30000,
        waitUntil: 'networkidle' 
      });

      // Wait for the page to be fully loaded
      await page.waitForLoadState('load', { timeout: 15000 });

      // Check page title
      await expect(page).toHaveTitle(/Budget Tracker/i);

      // Check for login button or navigation elements
      const loginButton = await page.getByRole('button', { name: /login/i }).count();
      const navigationLinks = await page.getByRole('link', { 
        name: /tasks|task input|goals|goal input|role management|login/i 
      }).all();
      
      // If no login button, expect at least some navigation links
      if (loginButton === 0) {
        expect(navigationLinks.length).toBeGreaterThan(0);
      }

      // Optional: Check for specific text or elements unique to your app
      const welcomeText = await page.getByText(/Budget Tracker/i);
      await expect(welcomeText).toBeVisible();

      // Additional performance check with more lenient timeout
      const loadTime = page.url() ? await page.evaluate(() => 
        window.performance.timing.loadEventEnd - window.performance.timing.navigationStart
      ) : null;
      expect(loadTime).toBeLessThan(15000); // Page should load in less than 15 seconds

    } catch (error) {
      console.error('Home page test failed:', error);
      throw error;
    }
  });
});
