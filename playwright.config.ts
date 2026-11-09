import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://127.0.0.1:4174',
    env: { HOST: '127.0.0.1', PORT: '4174', ORIGIN: 'http://127.0.0.1:4174', NO_PROXY: '127.0.0.1,localhost' },
    reuseExistingServer: false,
    timeout: 120000,
  },
});
