/** Telegram Mini App + fallback `VITE_ADMIN_ID` (локальная отладка). */
export function getTelegramWebAppUserId(): number | undefined {
  if (typeof window === "undefined") return undefined;
  // @ts-expect-error Telegram WebApp
  const tg = window.Telegram?.WebApp;
  let userId: number | undefined = tg?.initDataUnsafe?.user?.id;

  if (typeof userId !== "number" || !Number.isFinite(userId)) {
    const raw = import.meta.env.VITE_ADMIN_ID;
    const first =
      typeof raw === "string"
        ? raw.split(",")[0]?.trim() ?? ""
        : String(raw ?? "");
    const n = Number(first);
    userId = Number.isFinite(n) ? n : undefined;
  }

  console.log("FRONT USER ID:", userId);
  return userId;
}

export const getTelegramUser = () => {
  // @ts-expect-error Telegram WebApp
  const tg = window.Telegram?.WebApp;

  if (!tg) {
    console.log("NO TELEGRAM");
    return null;
  }

  console.log("INIT DATA:", tg.initData);
  console.log("INIT DATA UNSAFE:", tg.initDataUnsafe);

  return tg.initDataUnsafe?.user || null;
};