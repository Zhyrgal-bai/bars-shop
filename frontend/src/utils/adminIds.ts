/** Список админских Telegram ID из `VITE_ADMIN_IDS` (через запятую). */
export function parseViteAdminIds(): number[] {
  const raw = import.meta.env.VITE_ADMIN_IDS;
  const ADMIN_IDS = raw
    ? raw
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((n) => Number.isFinite(n))
    : [];
  console.log("ADMIN IDS:", ADMIN_IDS);
  return ADMIN_IDS;
}
