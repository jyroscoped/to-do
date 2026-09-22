import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium" },
  webServer: { command: "python3 -m http.server 3000 --bind 127.0.0.1", url: "http://127.0.0.1:3000", reuseExistingServer: true }
});
