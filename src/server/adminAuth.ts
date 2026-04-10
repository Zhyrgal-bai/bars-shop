import type { Request, Response } from "express";

const ADMIN_IDS = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(",").map((id) => id.trim()).filter(Boolean)
  : [];

export function isAdmin(userId: unknown): boolean {
  console.log("USER ID:", userId);
  console.log("ADMIN IDS:", ADMIN_IDS);

  if (userId === undefined || userId === null) return false;
  if (typeof userId === "string" && userId.trim() === "") return false;

  return ADMIN_IDS.includes(String(userId));
}

/** Все admin endpoint: проверка `req.body.userId`. */
export function denyIfNotAdmin(req: Request, res: Response): boolean {
  if (!isAdmin(req.body?.userId)) {
    res.status(403).json({ message: "Нет прав" });
    return false;
  }
  return true;
}
