import { defineConfig, devices } from "@playwright/test";

export const STORE = process.env.STORE_URL ?? "http://localhost:3000";
export const API = process.env.API_URL ?? "http://127.0.0.1:8000";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // the suite mutates cart/session state; keep it serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: STORE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
    { name: "tablet", use: { ...devices["iPad Mini"] } },
    { name: "api", use: { baseURL: API } },
  ],
});
