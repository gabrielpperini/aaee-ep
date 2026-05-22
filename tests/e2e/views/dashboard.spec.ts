import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Dashboard — agregações com tempo congelado", () => {
  test("renderiza com persona DIRECTOR e mostra cards principais", async ({ asDirector }) => {
    await asDirector.goto("/dashboard");
    await expect(asDirector.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(asDirector.getByText(/O que est[áa] acontecendo agora/)).toBeVisible();
  });

  test("happeningNow aparece no card 'Acontecendo agora'", async ({ asDirector }) => {
    await asDirector.goto("/dashboard");
    await expect(asDirector.getByText("Vôlei — Em andamento").first()).toBeVisible();
  });

  test("upcomingSoon (Basquete - Próximo) aparece dentro de 3h", async ({ asDirector }) => {
    await asDirector.goto("/dashboard");
    await expect(asDirector.getByText("Basquete — Próximo").first()).toBeVisible();
  });

  test("eventos finalizados não aparecem", async ({ asDirector }) => {
    await asDirector.goto("/dashboard");
    await expect(asDirector.getByText("Atletismo — Finalizado")).not.toBeVisible();
  });

  test("crítico sem torcida aparece em prioritários", async ({ asDirector }) => {
    await asDirector.goto("/dashboard");
    await expect(asDirector.getByText("Basquete — Final crítica").first()).toBeVisible();
  });
});
