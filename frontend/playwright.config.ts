import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * E2E contra frontend + backend reais. O backend precisa estar rodando (API_URL aponta para ele).
 * Um único worker e sem retries: o rate limit permite 5 cadastros/hora por IP.
 */
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    locale: "pt-BR",
    storageState: "e2e/.auth/user.json",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Build de produção também localmente: no `next dev` o selo de diagnóstico cobre o botão "Sair"
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
