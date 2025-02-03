export default {
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    headless: true,
    baseURL: 'http://localhost:3001', // change if your app runs on a different port
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo: 100 // Add a slight delay between actions to improve test stability
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        channel: 'chrome' // Use Chrome instead of Chromium
      },
    },
    {
      name: 'firefox',
      use: { 
        browserName: 'firefox',
        permissions: ['clipboard-read', 'clipboard-write']
      },
    },
    {
      name: 'webkit',
      use: { 
        browserName: 'webkit',
        viewport: { width: 1024, height: 768 } // Slightly different viewport for WebKit
      },
    },
  ],
};
