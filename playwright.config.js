export default {
  testDir: './Tests',
  timeout: 30000,
  use: {
    headless: true,
    baseURL: 'http://localhost:3001', // Updated base URL to match the client port
    screenshot: 'only-on-failure',
    video: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
};
