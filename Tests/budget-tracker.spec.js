import { test, expect } from '@playwright/test';

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

// Helper function to login
async function login(page, email, password) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

test.describe('Budget Tracker E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from a clean slate - go to homepage
    await page.goto('/');
  });

  test('landing page loads correctly', async ({ page }) => {
    // Verify main elements are present
    await expect(page.getByRole('heading', { name: /budget tracker/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('user can navigate to login page', async ({ page }) => {
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('shows validation errors for invalid login', async ({ page }) => {
    await page.goto('/login');
    // Try to login without entering credentials
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('handles invalid credentials correctly', async ({ page }) => {
    await login(page, 'wrong@email.com', 'wrongpassword');
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('successful login and navigation flow', async ({ page }) => {
    // Login with valid credentials
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(TEST_USER.name)).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('budget creation and management', async ({ page }) => {
    // Login first
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to budget creation
    await page.click('text=Create Budget');
    
    // Fill budget form
    await page.fill('input[name="title"]', 'Monthly Budget');
    await page.fill('input[name="amount"]', '5000');
    await page.click('button[type="submit"]');
    
    // Verify budget appears in list
    await expect(page.getByText('Monthly Budget')).toBeVisible();
    await expect(page.getByText('$5,000')).toBeVisible();
  });

  test('expense tracking workflow', async ({ page }) => {
    // Login and navigate to expenses
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.click('text=Expenses');
    
    // Add new expense
    await page.click('text=Add Expense');
    await page.fill('input[name="description"]', 'Groceries');
    await page.fill('input[name="amount"]', '150.50');
    await page.selectOption('select[name="category"]', 'Food');
    await page.click('button[type="submit"]');
    
    // Verify expense appears in list
    await expect(page.getByText('Groceries')).toBeVisible();
    await expect(page.getByText('$150.50')).toBeVisible();
  });

  test('budget analytics and reporting', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.click('text=Analytics');
    
    // Verify charts and reports are visible
    await expect(page.getByRole('region', { name: /spending overview/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /monthly trend/i })).toBeVisible();
    
    // Test date range selection
    await page.click('text=Last 30 Days');
    await expect(page.getByRole('region', { name: /spending overview/i })).toBeVisible();
  });

  test('user profile management', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to profile
    await page.click('text=Profile');
    
    // Verify profile information
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
    await expect(page.getByText(TEST_USER.name)).toBeVisible();
    
    // Test profile update
    await page.click('text=Edit Profile');
    await page.fill('input[name="name"]', 'Updated Name');
    await page.click('button[type="submit"]');
    
    // Verify update
    await expect(page.getByText('Updated Name')).toBeVisible();
  });

  test('logout flow', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Perform logout
    await page.click('text=Logout');
    
    // Verify redirect to home and login button visible
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });
}); 