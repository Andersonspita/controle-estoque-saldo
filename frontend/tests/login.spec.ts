import { expect, test } from "@playwright/test"

import { e2eAdmin } from "./credentials"

test("senha incorreta permanece na tela de login", async ({ page }) => {
  await page.goto("/login")
  await page.getByTestId("email-input").fill(e2eAdmin.email)
  await page.getByTestId("password-input").fill("senhaerrada")
  await page.getByRole("button", { name: "Log In" }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId("email-input")).toBeVisible()
})
