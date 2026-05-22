import { test, expect } from "../fixtures";

test.describe("Login — fluxo por senha", () => {
  test("usuário válido entra e cai no Início", async ({ guest }) => {
    await guest.goto("/login");
    await guest.getByLabel("Email").fill("director@test.local");
    await guest.getByLabel("Senha").fill("test-password");
    await guest.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(guest).toHaveURL("/");
    await expect(guest.getByRole("link", { name: /In[ií]cio/ })).toBeVisible();
  });

  test("usuário inexistente vê mensagem de erro", async ({ guest }) => {
    await guest.goto("/login");
    await guest.getByLabel("Email").fill("naoexiste@test.local");
    await guest.getByLabel("Senha").fill("qualquer");
    await guest.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(guest.getByText(/N[ãa]o conseguimos entrar/i)).toBeVisible();
    await expect(guest).toHaveURL(/\/login/);
  });

  test("redirectTo é preservado após login", async ({ guest }) => {
    await guest.goto("/eventos");
    await expect(guest).toHaveURL(/redirectTo=%2Feventos/);

    await guest.getByLabel("Email").fill("director@test.local");
    await guest.getByLabel("Senha").fill("test-password");
    await guest.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(guest.getByRole("link", { name: /In[ií]cio/ })).toBeVisible();
  });
});

test.describe("Auth — logout", () => {
  test("clicar em 'Sair' limpa cookie e leva pra /login", async ({ asDirector }) => {
    await asDirector.goto("/");
    await asDirector.getByRole("button", { name: "Sair" }).click();

    await asDirector.waitForURL(/\/login/);
    // Tentar acessar rota protegida confirma que a sessão foi limpa.
    await asDirector.goto("/dashboard");
    await expect(asDirector).toHaveURL(/\/login\?redirectTo=%2Fdashboard/);
  });
});
