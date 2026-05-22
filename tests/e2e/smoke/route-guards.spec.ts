import { test, expect } from "../fixtures";

test.describe("Route guards", () => {
  test("guest é redirecionado para /login com redirectTo", async ({ guest }) => {
    await guest.goto("/dashboard");
    await expect(guest).toHaveURL(/\/login\?redirectTo=%2Fdashboard/);
  });

  test("USER tentando /admin/usuarios é redirecionado para /", async ({ asUser }) => {
    await asUser.goto("/admin/usuarios");
    await expect(asUser).toHaveURL("/");
  });

  test("USER tentando /dashboard é redirecionado para /", async ({ asUser }) => {
    await asUser.goto("/dashboard");
    await expect(asUser).toHaveURL("/");
  });

  test("DIRECTOR pode entrar em /dashboard e /eventos, mas não /admin/usuarios", async ({ asDirector }) => {
    await asDirector.goto("/dashboard");
    await expect(asDirector).toHaveURL("/dashboard");

    await asDirector.goto("/eventos");
    await expect(asDirector).toHaveURL("/eventos");

    await asDirector.goto("/admin/usuarios");
    await expect(asDirector).toHaveURL("/");
  });

  test("ADMIN entra em /admin/usuarios sem redirect", async ({ asAdmin }) => {
    await asAdmin.goto("/admin/usuarios");
    await expect(asAdmin).toHaveURL("/admin/usuarios");
  });

  test("usuário logado em /login é redirecionado pra /", async ({ asDirector }) => {
    await asDirector.goto("/login");
    await expect(asDirector).toHaveURL("/");
  });
});
