import { test, expect } from "../fixtures";

// O fluxo de signup completo (preencher nome/apelido/telefone/curso/semestre)
// envolve Combobox e Select do base-ui, que têm quirks. Cobrimos abaixo o
// caminho crítico end-to-end: a chamada de `/api/e2e/signup` faz o que o
// `supabase.auth.signUp` faria + auto-link de Person via getCurrentUser.

test.describe("Signup — auto-link com Person existente", () => {
  test("usuário novo com email de Person pendente é auto-linkado", async ({ guest, reseed }) => {
    await reseed();

    // Hit direto no endpoint que o browser-shim usa internamente — simula o
    // resultado de signUp sem precisar lidar com Combobox/Select.
    const res = await guest.request.post("/api/e2e/signup", {
      data: { email: "pending@test.local", password: "test-password" },
    });
    expect(res.ok()).toBeTruthy();

    // /perfil força getCurrentUser, que faz o auto-link com Pedro Pendente.
    await guest.goto("/perfil");
    await expect(guest.getByText("Pedro Pendente")).toBeVisible();
  });

  test("signup com email já cadastrado falha", async ({ guest }) => {
    const res = await guest.request.post("/api/e2e/signup", {
      data: { email: "director@test.local", password: "x" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

test.describe("Signup UI — campos básicos", () => {
  test("página carrega com todos os campos visíveis", async ({ guest }) => {
    await guest.goto("/signup");
    await expect(guest.getByLabel("Nome completo")).toBeVisible();
    await expect(guest.getByLabel("Apelido")).toBeVisible();
    await expect(guest.getByLabel("Telefone (WhatsApp)")).toBeVisible();
    await expect(guest.getByLabel("Curso")).toBeVisible();
    await expect(guest.getByLabel("Semestre")).toBeVisible();
    await expect(guest.getByLabel("Email")).toBeVisible();
    await expect(guest.getByLabel("Senha")).toBeVisible();
  });
});
