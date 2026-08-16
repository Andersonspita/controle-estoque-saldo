import path from "node:path"

import { config as loadEnv } from "dotenv"
import { defineConfig, devices } from "@playwright/test"

loadEnv({ path: path.join(import.meta.dirname, ".env.e2e") })

const dockerBase = process.env.PLAYWRIGHT_BASE_URL
const localRun = !dockerBase
const backendDir = path.join(import.meta.dirname, "..", "backend")
const chromium = { ...devices["Desktop Chrome"] }

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: dockerBase || "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "public",
      use: chromium,
      testMatch: /(dashboard|login)\.spec\.ts/,
    },
    {
      name: "setup",
      use: chromium,
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "authenticated",
      use: {
        ...chromium,
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /authenticated\.spec\.ts/,
    },
  ],
  webServer: localRun
    ? [
        {
          command: "uv run fastapi dev --host 127.0.0.1 --port 8000",
          url: "http://127.0.0.1:8000/health",
          reuseExistingServer: !process.env.CI,
          cwd: backendDir,
          timeout: 120_000,
          env: {
            ...process.env,
            PYTHONUTF8: "1",
            PYTHONIOENCODING: "utf-8",
          },
        },
        {
          command: "npm run dev",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ]
    : undefined,
})
