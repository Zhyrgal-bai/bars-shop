/** Telegram Mini App: id всегда через `Number(rawId)`. */
export function getTelegramWebAppUserId(): number {
  if (typeof window === "undefined") {
    return Number(undefined);
  }
  // @ts-expect-error Telegram WebApp
  const tg = window.Telegram?.WebApp;
  const rawId = tg?.initDataUnsafe?.user?.id;
  const userId = Number(rawId);
  console.log("RAW ID:", rawId);
  console.log("USER ID:", userId);
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
