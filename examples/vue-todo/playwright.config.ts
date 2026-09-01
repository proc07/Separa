import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:5175",
  },
  webServer: {
    command: "npx vite --port 5175",
    url: "http://localhost:5175",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
