/**
 * Ссылка на бота поддержки: публичный @username, не токен.
 * `?start=app` — открывает сразу чат с ботом (deep link), а не экран профиля.
 * Задаётся в .env: VITE_SUPPORT_BOT_USERNAME=MySupportBot (без https://, можно с @)
 */
const DEFAULT_SUPPORT_BOT = "bars_kg_support_bot";
const DEEP_LINK_START = "app";

function supportChatUrl(): string {
  const raw = import.meta.env.VITE_SUPPORT_BOT_USERNAME?.trim();
  const name = (raw && raw.length > 0 ? raw : DEFAULT_SUPPORT_BOT).replace(
    /^@/,
    ""
  );
  return `https://t.me/${name}?start=${encodeURIComponent(DEEP_LINK_START)}`;
}

/**
 * Открыть чат с ботом поддержки в Telegram (в Mini App — нативно).
 */
export function openSupportLink(): void {
  const url = supportChatUrl();
  if (window.Telegram?.WebApp) {
    const open = window.Telegram.WebApp.openTelegramLink;
    if (typeof open === "function") {
      open(url);
      return;
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
