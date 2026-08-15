import fs from "node:fs"
import path from "node:path"

import { expect, test as setup } from "@playwright/test"

import { e2eAdmin } from "./credentials"

const authFile = path.join(import.meta.dirname, "..", "playwright", ".auth", "admin.json")

setup("autenticar administrador", async ({ page, request }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  const loginUrl = "http://127.0.0.1:8000/login/access-token"
  const probe = await request.post(loginUrl, {
    form: { username: e2eAdmin.email, password: e2eAdmin.password },
    failOnStatusCode: false,
  })
  if (!probe.ok()) {
    throw new Error(
      `Login E2E recusado em ${loginUrl} (status ${probe.status()}). ` +
        "Suba o Postgres (banco controle_estoque) e confira E2E_EMAIL/E2E_PASSWORD.",
    )
  }

  await page.goto("/login")
  await page.getByTestId("email-input").fill(e2eAdmin.email)
  await page.getByTestId("password-input").fill(e2eAdmin.password)
  await page.getByRole("button", { name: "Entrar" }).click()

  await expect(page).toHaveURL("/")
  await expect(page.getByTestId("dashboard-greeting")).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByTestId("dashboard-greeting")).not.toHaveText(/Olá,\s*👋/, {
    timeout: 20_000,
  })

  await page.context().storageState({ path: authFile })
})
