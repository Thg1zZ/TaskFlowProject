import { FullConfig, request } from "@playwright/test";

export const E2E_PASSWORD = "E2e!Senha2026";

/** Cria um usuário novo para os testes, pula o tour inicial e salva a sessão (cookie) para os specs. */
export default async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const api = await request.newContext({ baseURL });

  const email = `e2e-${Date.now()}@taskflow.test`;
  const res = await api.post("/api/auth/register", {
    data: { name: "Pessoa E2E", email, password: E2E_PASSWORD, acceptedTerms: true },
  });
  if (!res.ok()) throw new Error(`Cadastro do usuário de teste falhou: ${res.status()} ${await res.text()}`);

  await api.post("/api/users/me/onboarding");
  await api.storageState({ path: storageState as string });
  await api.dispose();
}
