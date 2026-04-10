import { API_BASE_URL } from "../services/api";

/** ID пользователя из Telegram Mini App (как в App.tsx). */
export function getTelegramWebAppUserId(): number | undefined {
  if (typeof window === "undefined") return undefined;
  // @ts-expect-error Telegram WebApp
  const tg = window.Telegram?.WebApp;
  const id = tg?.initDataUnsafe?.user?.id;
  return typeof id === "number" && Number.isFinite(id) ? id : undefined;
}

/** Проверка по ADMIN_IDS на сервере (POST /check-admin). */
export async function checkIsAdmin(): Promise<boolean> {
  const userId = getTelegramWebAppUserId();
  if (userId == null) return false;
  try {
    const url = `${API_BASE_URL.replace(/\/$/, "")}/check-admin`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = (await res.json()) as { isAdmin?: boolean };
    return Boolean(data.isAdmin);
  } catch {
    return false;
  }
}
