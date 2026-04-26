/**
 * Ссылка на бота поддержки: публичный @username, не токен.
 * Задаётся в .env: VITE_SUPPORT_BOT_USERNAME=MySupportBot (без https://, можно с @)
 */
function supportTelegramUrl(): string {
  const raw = import.meta.env.VITE_SUPPORT_BOT_USERNAME?.trim();
  const name = (raw && raw.length > 0 ? raw : "YOUR_SUPPORT_BOT_USERNAME").replace(
    /^@/,
    ""
  );
  return `https://t.me/${name}`;
}

/**
 * Открыть чат поддержки: в Mini App — через openTelegramLink, иначе — новая вкладка.
 */
export function openSupportLink(): void {
  const url = supportTelegramUrl();
  const tg = window.Telegram?.WebApp;
  if (typeof tg?.openTelegramLink === "function") {
    tg.openTelegramLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
