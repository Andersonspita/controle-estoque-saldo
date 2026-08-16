import { expect, test } from "@playwright/test"

test("administrador entra no dashboard autenticado", async ({ page }) => {
  await page.goto("/")
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByTestId("dashboard-greeting")).toBeVisible()
  await expect(
    page.getByText(/situação dos contratos ativos e das baixas de nf/i),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible({
    timeout: 15_000,
  })
})

test("administrador abre a gestão de usuários", async ({ page }) => {
  await page.goto("/admin")
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByRole("heading", { name: /usuários/i })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByRole("button", { name: "Novo usuário" })).toBeVisible()
  await expect(page.getByText("Oops!")).toHaveCount(0)
})

test("administrador vê o cadastro de contrato", async ({ page }) => {
  await page.goto("/contratos")
  await expect(page.getByRole("heading", { name: /contratos/i })).toBeVisible()
  await expect(page.getByRole("button", { name: "Novo Contrato" })).toBeVisible({
    timeout: 15_000,
  })
})
