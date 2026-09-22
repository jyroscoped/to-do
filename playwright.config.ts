import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium" },
  webServer: { command: "PATH=\"$PWD/.tools/bin:$PATH\" npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: true }
});
