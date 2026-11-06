import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./global-setup";

test.use({ storageState: { cookies: [], origins: [] } });

test("cadastro, tour, logout, senha errada e login", async ({ page }) => {
  const email = `e2e-ui-${Date.now()}@taskflow.test`;

  await page.goto("/register");
  await page.locator("#name").fill("Cadastro E2E");
  await page.locator("#email").fill(email);
  await page.locator("#confirmEmail").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.locator("#confirmPassword").fill(E2E_PASSWORD);
  await page.locator("#acceptedTerms").check();
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible();

  // Tour de boas-vindas aparece só na primeira vez
  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: /^Próximo/ }).click();
  await page.getByRole("button", { name: /^Concluir/ }).click();

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.locator("#email").fill(email);
  await page.locator("#password").fill("SenhaErrada!123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Credenciais inválidas")).toBeVisible();

  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: /^Próximo/ })).toHaveCount(0);
});

test("termos e política ficam acessíveis sem login, a partir do aviso do Google", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Termos de Uso e a Política de Privacidade" }).click();

  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(page.getByRole("heading", { name: "Política de Privacidade", exact: true })).toBeVisible();
  await expect(page.getByText("thiagogomes1337@gmail.com")).toBeVisible();
});

test("rota protegida sem sessão volta para o login", async ({ page }) => {
  await page.goto("/dashboard/tasks");
  await expect(page).toHaveURL(/\/login$/);
});
