import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./examples",
  testMatch: "**/e2e/**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "react-todo",
      testDir: "./examples/react-todo/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
      },
    },
    {
      name: "vue-todo",
      testDir: "./examples/vue-todo/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5175",
      },
    },
    {
      name: "react-ballcraft",
      testDir: "./examples/react-ballcraft/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5176",
      },
    },
    {
      name: "vue-ballcraft",
      testDir: "./examples/vue-ballcraft/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5177",
      },
    },
    {
      name: "react-cart",
      testDir: "./examples/react-cart/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5178",
      },
    },
    {
      name: "vue-cart",
      testDir: "./examples/vue-cart/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5179",
      },
    },
  ],
  webServer: [
    {
      command: "cd examples/react-todo && npx vite --port 5174",
      url: "http://localhost:5174",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "cd examples/vue-todo && npx vite --port 5175",
      url: "http://localhost:5175",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "cd examples/react-ballcraft && npx vite --port 5176",
      url: "http://localhost:5176",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "cd examples/vue-ballcraft && npx vite --port 5177",
      url: "http://localhost:5177",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "cd examples/react-cart && npx vite --port 5178",
      url: "http://localhost:5178",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "cd examples/vue-cart && npx vite --port 5179",
      url: "http://localhost:5179",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
