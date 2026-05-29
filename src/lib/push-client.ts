"use client";

import { subscribePush, unsubscribePush } from "@/app/(app)/perfil/push-actions";

/** Converte a chave pública VAPID (base64url) em buffer pro PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** True se o browser suporta push (SW + PushManager + Notification). */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Subscription atual deste device, se existir. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "error" };

/**
 * Pede permissão, subscreve no PushManager e persiste no servidor.
 * Best-effort — devolve um resultado tipado em vez de lançar.
 */
export async function enablePush(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, reason: "error" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return { ok: false, reason: "error" };

    const res = await subscribePush({
      endpoint,
      p256dh,
      auth,
      userAgent: navigator.userAgent,
    });
    return res.ok ? { ok: true } : { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Cancela a subscription deste device (local + servidor). */
export async function disablePushOnThisDevice(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.toJSON().endpoint;
    await sub.unsubscribe().catch(() => undefined);
    if (endpoint) await unsubscribePush({ endpoint });
  } catch {
    // ignora — best-effort
  }
}
