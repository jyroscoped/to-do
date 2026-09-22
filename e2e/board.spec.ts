import { expect, test } from "@playwright/test";

test("the mobile board presents an actionable empty state", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OfficeOps" })).toBeVisible();
  await expect(page.getByRole("button", { name: /new task/i })).toBeVisible();
  await expect(page.getByText(/No open tasks/i)).toBeVisible();
});
