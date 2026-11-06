import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("idioma escolhido continua após recarregar", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Minhas Tarefas" })).toBeVisible();

  await page.getByLabel("Idioma").selectOption("en");
  await expect(page.getByRole("link", { name: "My Tasks" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("link", { name: "My Tasks" })).toBeVisible();
});

test("exportação LGPD baixa os dados do usuário em JSON", async ({ page }) => {
  await page.goto("/dashboard/profile");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar Meus Dados" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("taskflow-meus-dados.json");
  const data = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(data.profile.email).toMatch(/@taskflow\.test$/);
  expect(Array.isArray(data.tasks)).toBe(true);
});
