import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4312",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHROME ? "chrome" : undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4312",
    reuseExistingServer: !process.env.CI,
  },
});
