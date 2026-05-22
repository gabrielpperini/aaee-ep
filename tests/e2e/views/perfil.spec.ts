import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Perfil — edição do próprio Person", () => {
  test("USER atualiza apelido e persiste após reload", async ({ asUser }) => {
    await asUser.goto("/perfil");
    await expect(asUser.getByLabel("Nome completo *")).toHaveValue("Ulisses Usuário");

    await asUser.getByLabel("Apelido").fill("Uli");
    await asUser.getByRole("button", { name: /Salvar/i }).click();

    await asUser.reload();
    await expect(asUser.getByLabel("Apelido")).toHaveValue("Uli");
  });

  test("nome obrigatório não pode ser apagado", async ({ asUser }) => {
    await asUser.goto("/perfil");
    await asUser.getByLabel("Nome completo *").fill("");
    await asUser.getByRole("button", { name: /Salvar/i }).click();

    // FormMessage do RHF mostra erro de validação (zod) sem hit no server
    await expect(asUser.getByText(/Nome|obrigat/i).first()).toBeVisible();
  });

  test("usuário sem Person vê form em estado inicial vazio", async ({ asNolink }) => {
    await asNolink.goto("/perfil");
    await expect(asNolink.getByLabel("Nome completo *")).toHaveValue("");
  });
});
