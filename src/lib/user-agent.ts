/**
 * Parser simples de user-agent → rótulo amigável tipo "Chrome no Android".
 * Não é exaustivo — só o suficiente pra distinguir dispositivos na lista do /perfil.
 */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Dispositivo desconhecido";

  let browser = "Navegador";
  if (/Edg/.test(ua)) browser = "Edge";
  else if (/OPR|Opera/.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet";
  else if (/Firefox|FxiOS/.test(ua)) browser = "Firefox";
  else if (/Chrome|Chromium|CriOS/.test(ua)) browser = "Chrome";
  else if (/Safari/.test(ua)) browser = "Safari";

  let os = "dispositivo";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "Mac";
  else if (/Linux/.test(ua)) os = "Linux";

  return `${browser} no ${os}`;
}
