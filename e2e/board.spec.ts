import { expect, test } from "@playwright/test";

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
