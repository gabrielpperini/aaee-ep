import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3001);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: false, // tests resetam o DB; rodam sequencialmente por padrão
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  globalSetup: require.resolve("./tests/e2e/global-setup.ts"),
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Sobe Next dev na 3001 com .env.test carregado. `reuseExistingServer`
    // pra acelerar o loop local — em CI, sempre boot novo.
    command: "pnpm test:dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
});
