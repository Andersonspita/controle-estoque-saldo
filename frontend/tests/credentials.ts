export const e2eAdmin = {
  email: process.env.E2E_EMAIL ?? "",
  password: process.env.E2E_PASSWORD ?? "",
}

if (!e2eAdmin.email || !e2eAdmin.password) {
  throw new Error(
    "Defina E2E_EMAIL e E2E_PASSWORD (arquivo frontend/.env.e2e ou variáveis de ambiente). Não commite senhas no repositório.",
  )
}
