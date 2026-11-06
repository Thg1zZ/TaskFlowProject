import { expect, Page, test } from "@playwright/test";

const card = (page: Page, title: string) => page.locator("div.group.cursor-pointer").filter({ hasText: title });

test("tarefa com etiquetas e subtarefas guarda o progresso", async ({ page }) => {
  const title = `Release ${Date.now()}`;
  await page.goto("/dashboard/tasks");
  await page.getByRole("button", { name: "Nova Tarefa", exact: true }).click();

  const form = page.locator("#task-form");
  await form.getByLabel("Título", { exact: true }).fill(title);
  const tags = form.getByLabel("Etiquetas", { exact: true });
  await tags.fill("#Backend");
  await tags.press("Enter");
  await tags.fill("deploy");
  await tags.press("Enter");
  const subtask = form.getByPlaceholder("Adicionar subtarefa e pressionar Enter");
  await subtask.fill("Escrever testes");
  await subtask.press("Enter");
  await subtask.fill("Revisar PR");
  await subtask.press("Enter");
  await page.getByRole("button", { name: "Salvar" }).click();

  const created = card(page, title);
  await expect(created.getByText("#backend", { exact: true })).toBeVisible();
  await expect(created.getByText("#deploy", { exact: true })).toBeVisible();
  await expect(created.getByText("0/2")).toBeVisible();

  await created.getByRole("button", { name: "Mostrar subtarefas" }).click();
  const saved = page.waitForResponse((r) => r.url().includes("/subtasks/") && r.request().method() === "PATCH");
  await created.getByRole("checkbox", { name: "Escrever testes" }).check();
  await expect(created.getByText("1/2")).toBeVisible();
  expect((await saved).ok()).toBeTruthy();

  await page.reload();
  await expect(card(page, title).getByText("1/2")).toBeVisible();
});

test("filtros combinados de etiqueta e prioridade", async ({ page }) => {
  const tag = `filtro${Date.now()}`;
  for (const task of [
    { title: `Alta ${tag}`, priority: "HIGH", tags: [tag] },
    { title: `Baixa ${tag}`, priority: "LOW", tags: [tag] },
    { title: `Sem etiqueta ${tag}`, priority: "HIGH" },
  ]) {
    expect((await page.request.post("/api/tasks", { data: task })).ok()).toBeTruthy();
  }

  await page.goto("/dashboard/tasks");
  await page.getByLabel("Filtrar por etiqueta").selectOption(tag);
  await page.getByLabel("Filtrar por prioridade").selectOption("HIGH");

  await expect(card(page, `Alta ${tag}`)).toBeVisible();
  await expect(card(page, `Baixa ${tag}`)).toHaveCount(0);
  await expect(card(page, `Sem etiqueta ${tag}`)).toHaveCount(0);
});

test("concluir tarefa recorrente cria a próxima ocorrência", async ({ page }) => {
  const title = `Relatório ${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  const res = await page.request.post("/api/tasks", {
    data: { title, recurrence: "WEEKLY", startDate: today, endDate: today },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto("/dashboard/tasks");
  await card(page, title).click();
  await page.getByRole("button", { name: "Editar" }).click();
  await page.locator("#task-form").getByLabel("Status", { exact: true }).selectOption("DONE");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(card(page, title)).toHaveCount(2);
  // O card tem um <select> de status; o texto das opções aparece em todos, então confere o valor selecionado
  await expect(card(page, title).filter({ has: page.locator('option[value="TODO"]:checked') })).toHaveCount(1);
  await expect(card(page, title).filter({ has: page.locator('option[value="DONE"]:checked') })).toHaveCount(1);
});
