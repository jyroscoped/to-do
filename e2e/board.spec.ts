import { expect, test, type Page } from "@playwright/test";

test("the static mobile board can create a task", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "OfficeOps" })).toBeVisible();
  await expect(page.getByRole("button", { name: /new task/i })).toBeVisible();
  await page.getByRole("button", { name: /new task/i }).click();
  await page.getByLabel("What needs doing?").fill("Restock safety supplies");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.locator("#tasks").getByText("Restock safety supplies")).toBeVisible();
  await page.getByRole("button", { name: /start tracking/i }).click();
  await expect(page.getByRole("button", { name: /stop & log/i })).toBeVisible();
  await page.getByRole("button", { name: /stop & log/i }).click();
  await expect(page.getByText("0.00 h")).toBeVisible();
});

// Stands in for the Google Apps Script Web App described in instructions.md.
async function mockAppsScript(page: Page, store: { state: unknown }, key = "shared-sync-key-123") {
  await page.route("https://sync.example.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      if (body.token === key && body.action === "saveState") store.state = body.state;
      return route.fulfill({ status: 200, body: "{}" });
    }
    const params = new URL(request.url()).searchParams;
    const response = params.get("token") === key ? { ok: true, state: store.state } : { ok: false, error: "Unauthorized" };
    return route.fulfill({ status: 200, contentType: "application/javascript", body: `${params.get("callback")}(${JSON.stringify(response)});` });
  });
}

async function connect(page: Page, key = "shared-sync-key-123") {
  await page.getByRole("button", { name: "Google Sheets" }).click();
  await page.getByLabel("Apps Script Web App URL").fill("https://sync.example.test/exec");
  await page.getByLabel("Shared sync key").fill(key);
  await page.getByRole("button", { name: "Save connection" }).click();
}

test("a second computer loads the shared board without overwriting it", async ({ browser }) => {
  const store: { state: unknown } = { state: null };

  const first = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  await mockAppsScript(first, store);
  await first.goto("/");
  await first.getByRole("button", { name: /new task/i }).click();
  await first.getByLabel("What needs doing?").fill("Replace lobby light bulbs");
  await first.getByRole("button", { name: "Create task" }).click();
  await connect(first);
  await expect(first.getByText("Synced with Google Sheets.")).toBeVisible();

  const second = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  await mockAppsScript(second, store);
  await second.goto("/");
  await expect(second.getByText("Saved in this browser only.", { exact: false })).toBeVisible();
  await expect(second.locator("#tasks").getByText("Replace lobby light bulbs")).toHaveCount(0);
  await connect(second);
  await expect(second.locator("#tasks").getByText("Replace lobby light bulbs")).toBeVisible();
  await expect(second.getByText("Synced with Google Sheets.")).toBeVisible();

  await second.getByRole("button", { name: /new task/i }).click();
  await second.getByLabel("What needs doing?").fill("Order printer toner");
  await second.getByRole("button", { name: "Create task" }).click();
  await expect.poll(() => JSON.stringify(store.state)).toContain("Order printer toner");
  await expect(second.getByText("Synced with Google Sheets.")).toBeVisible();

  await first.reload();
  await expect(first.locator("#tasks").getByText("Order printer toner")).toBeVisible();
  await expect(first.locator("#tasks").getByText("Replace lobby light bulbs")).toBeVisible();
});

test("a wrong sync key never overwrites the shared board", async ({ page }) => {
  const store: { state: unknown } = { state: { tasks: [], timeEntries: [], activeTimer: null, rev: "x" } };
  await mockAppsScript(page, store);
  await page.goto("/");
  await connect(page, "wrong-key-000000000");
  await expect(page.getByText("Google Sheets rejected the sync key.", { exact: false })).toBeVisible();
  expect(store.state).toEqual({ tasks: [], timeEntries: [], activeTimer: null, rev: "x" });
});
