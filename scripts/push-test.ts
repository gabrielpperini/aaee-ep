import "dotenv/config";
import webpush from "web-push";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Dispara uma notificação push real pros dispositivos de um usuário.
 * Uso: pnpm tsx scripts/push-test.ts <userId> "<mensagem>"
 *
 * Standalone (não importa src/lib/push.ts que é server-only do Next), mas
 * replica a mesma lógica: envia, limpa 410/404, ignora preferências.
 */
async function main() {
  const userId = process.argv[2];
  const message = process.argv[3] ?? "Notificação de teste 🔔";
  if (!userId) {
    throw new Error('Uso: pnpm tsx scripts/push-test.ts <userId> "<mensagem>"');
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT ausentes no .env");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) {
    console.log(`Nenhuma subscription pro userId=${userId}.`);
    await prisma.$disconnect();
    return;
  }

  const payload = JSON.stringify({
    title: "AAEE Engenharia",
    body: message,
    url: "/dashboard",
    tag: "push-test",
  });

  let sent = 0;
  let cleaned = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent += 1;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        cleaned += 1;
        console.log(`Subscription inválida removida (${statusCode}): ${sub.endpoint.slice(0, 50)}…`);
      } else {
        console.error("Erro ao enviar:", statusCode, (err as Error).message);
      }
    }
  }

  console.log(`Enviadas: ${sent} · Removidas: ${cleaned}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
