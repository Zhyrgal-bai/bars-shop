import { getTelegramUser } from "./telegram";

export const isAdmin = () => {
  const user = getTelegramUser();
  const ADMIN_ID = import.meta.env.VITE_ADMIN_ID;

  console.log("USER:", user?.id);
  console.log("ADMIN_ID:", ADMIN_ID);

  return String(user?.id) === String(ADMIN_ID);
};