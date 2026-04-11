/**
 * Видимость админки: WebApp `initDataUnsafe.user.id` + `VITE_ADMIN_IDS`.
 * Без VITE_ADMIN_ID, без process.env.
 */
export function isAdminPanelVisible(): boolean {
  if (typeof window === "undefined") return false;

  // @ts-expect-error Telegram WebApp
  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;

  console.log(typeof userId, userId);

  const rawAdminIds = import.meta.env.VITE_ADMIN_IDS;
  const ADMIN_IDS: number[] = rawAdminIds
    ? rawAdminIds.split(",").map((id) => Number(id.trim()))
    : [];

  const isAdmin = ADMIN_IDS.includes(Number(userId));

  console.log("USER ID:", userId);
  console.log("ADMIN IDS:", ADMIN_IDS);
  console.log("IS ADMIN:", isAdmin);

  return isAdmin;
}
