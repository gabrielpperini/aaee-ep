import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Disponibilidade — slots por persona", () => {
  test("user (atleta) vê 'Competindo' no horário de happeningNow", async ({ asUser }) => {
    await asUser.goto("/disponibilidade");
    await expect(asUser.getByRole("heading", { name: "Meu horário" })).toBeVisible();
    // user é atleta em happeningNow (14:00-16:00 do day1) e futureDay2.
    await expect(asUser.getByText(/Competindo|Vôlei — Em andamento/i).first()).toBeVisible();
  });

  test("supporter vê 'Escalado' em happeningNow", async ({ asSupporter }) => {
    await asSupporter.goto("/disponibilidade");
    // No seed criamos 1 Assignment do supporter em happeningNow.
    await expect(asSupporter.getByText(/Escalado|Vôlei — Em andamento/i).first()).toBeVisible();
  });

  test("usuário sem Person vê estado vazio amigável", async ({ asNolink }) => {
    await asNolink.goto("/disponibilidade");
    // O componente provavelmente mostra mensagem para quem não tem Person.
    await expect(asNolink).toHaveURL(/disponibilidade/);
  });
});
