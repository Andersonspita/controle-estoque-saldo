import { test, expect } from "@playwright/test"

test("visitante sem sessão é enviado para o login", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("heading", { name: "Entrar na sua conta" })).toBeVisible()
})

test("tela de login exibe e-mail, senha e botão de entrada", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByTestId("email-input")).toBeVisible()
  await expect(page.getByTestId("password-input")).toBeVisible()
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
})
