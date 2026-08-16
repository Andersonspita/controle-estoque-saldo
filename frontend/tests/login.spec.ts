import { expect, test } from "@playwright/test"

test("senha incorreta permanece na tela de login", async ({ page }) => {
  await page.goto("/login")
  await page.getByTestId("email-input").fill("naoexiste@example.com")
  await page.getByTestId("password-input").fill("senhaerrada")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId("email-input")).toBeVisible()
})
