import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("operator login", () => {
  test.skip(!adminEmail || !adminPassword, "E2E_ADMIN_EMAIL/PASSWORD not set");

  test("can log in and see dashboard shell", async ({ page }) => {
    await page.goto("/auth/login?next=%2Fdashboard");

    await page.fill('input[name="email"]', adminEmail as string);
    await page.fill('input[name="password"]', adminPassword as string);
    await page.getByRole("button", { name: /sign in to dashboard/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Production operations console|Admissions operations/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
