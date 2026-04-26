/**
 * API чата поддержки внутри Mini App (отдельно от заказов и Telegram-бота).
 */
import type { Express, Request, Response } from "express";
import { prisma } from "./db.js";
import {
  denyIfNotAdmin,
  denyIfNotAdminQuery,
  isAdmin,
} from "./adminAuth.js";

const MAX_MESSAGE_LEN = 4000;

function normalizeUserId(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(n);
}

function viewerIdFromQuery(req: Request): string | null {
  const raw = req.query.viewerId;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return normalizeUserId(v);
}

export function registerSupportRoutes(app: Express): void {
  /** Отправка сообщения от пользователя */
  app.post("/support/message", async (req: Request, res: Response) => {
    try {
      const userId = normalizeUserId(req.body?.userId);
      const message = String(req.body?.message ?? "").trim();
      if (userId == null) {
        return res.status(400).json({ error: "Нужен userId (Telegram)" });
      }
      if (message.length === 0) {
        return res.status(400).json({ error: "Пустое сообщение" });
      }
      if (message.length > MAX_MESSAGE_LEN) {
        return res.status(400).json({ error: "Слишком длинное сообщение" });
      }

      const row = await prisma.supportMessage.create({
        data: {
          userId,
          message,
          isFromAdmin: false,
        },
      });
      console.log("POST /support/message userId=%s id=%s", userId, row.id);
      return res.status(201).json(row);
    } catch (e) {
      console.error("POST /support/message:", e);
      return res.status(500).json({ error: "Ошибка сохранения" });
    }
  });

  /** История чата по userId (клиент — только свой; админ — любой при viewerId админа) */
  app.get("/support/:userId", async (req: Request, res: Response) => {
    try {
      const targetId = normalizeUserId(req.params.userId);
      if (targetId == null) {
        return res.status(400).json({ error: "Неверный userId" });
      }
      const viewerId = viewerIdFromQuery(req);
      if (viewerId == null) {
        return res.status(400).json({ error: "Нужен query viewerId (Telegram)" });
      }

      const admin = isAdmin(viewerId);
      if (!admin && viewerId !== targetId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const items = await prisma.supportMessage.findMany({
        where: { userId: targetId },
        orderBy: { createdAt: "asc" },
        take: 500,
      });
      return res.json(items);
    } catch (e) {
      console.error("GET /support/:userId:", e);
      return res.status(500).json({ error: "Ошибка загрузки" });
    }
  });

  /**
   * Ответ администратора пользователю.
   * Тело: { userId: <telegram id админа>, targetUserId: <id клиента>, message: string }
   */
  app.post("/support/reply", async (req: Request, res: Response) => {
    if (!denyIfNotAdmin(req, res)) return;
    try {
      const userId = normalizeUserId(req.body?.targetUserId);
      const message = String(req.body?.message ?? "").trim();
      if (userId == null) {
        return res.status(400).json({ error: "Нужен targetUserId (получатель)" });
      }
      if (message.length === 0) {
        return res.status(400).json({ error: "Пустое сообщение" });
      }
      if (message.length > MAX_MESSAGE_LEN) {
        return res.status(400).json({ error: "Слишком длинное сообщение" });
      }

      const row = await prisma.supportMessage.create({
        data: {
          userId,
          message,
          isFromAdmin: true,
        },
      });
      console.log("POST /support/reply → userId=%s id=%s", userId, row.id);
      return res.status(201).json(row);
    } catch (e) {
      console.error("POST /support/reply:", e);
      return res.status(500).json({ error: "Ошибка сохранения" });
    }
  });

  /** Список диалогов для админки (последнее сообщение по каждому userId) */
  app.get("/support/inbox/list", async (req: Request, res: Response) => {
    if (!denyIfNotAdminQuery(req, res)) return;
    try {
      const recent = await prisma.supportMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      const seen = new Set<string>();
      const threads: {
        userId: string;
        lastMessage: string;
        lastAt: string;
        lastFromAdmin: boolean;
      }[] = [];
      for (const m of recent) {
        if (seen.has(m.userId)) continue;
        seen.add(m.userId);
        threads.push({
          userId: m.userId,
          lastMessage: m.message.length > 120 ? m.message.slice(0, 117) + "…" : m.message,
          lastAt: m.createdAt.toISOString(),
          lastFromAdmin: m.isFromAdmin,
        });
      }
      return res.json(threads);
    } catch (e) {
      console.error("GET /support/inbox/list:", e);
      return res.status(500).json({ error: "Ошибка inbox" });
    }
  });
}
