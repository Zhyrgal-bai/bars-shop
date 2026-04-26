/**
 * API чата поддержки внутри Mini App (отдельно от заказов и Telegram-бота).
 */
import type { Express, Request, Response } from "express";
import { bot } from "../bot/bot.js";
import { prisma } from "./db.js";
import {
  denyIfNotAdmin,
  denyIfNotAdminQuery,
  isAdmin,
  listAdminTelegramIds,
} from "./adminAuth.js";

const MAX_MESSAGE_LEN = 4000;
const TELEGRAM_ADMIN_NOTIFY_MAX = 3500;

/** Пауза перед автоответом, если админ ещё не написал после этого сообщения пользователя. */
const SUPPORT_AUTO_REPLY_DELAY_MS = 10_000;
const SUPPORT_AUTO_REPLY_TEXT =
  "Здравствуйте! Мы получили ваш вопрос и скоро ответим 🙌";

/**
 * Через `SUPPORT_AUTO_REPLY_DELAY_MS` создаёт авто-сообщение (isFromAdmin: true), если
 * к этому моменту нет ответа админа/бота с createdAt **после** сообщения пользователя.
 */
function scheduleAutoReplyIfNoAdminSince(userId: string, afterUserMessageAt: Date) {
  setTimeout(() => {
    void (async () => {
      try {
        const adminOrAutoReply = await prisma.supportMessage.findFirst({
          where: {
            userId,
            isFromAdmin: true,
            createdAt: { gt: afterUserMessageAt },
          },
        });
        if (adminOrAutoReply) return;

        await prisma.supportMessage.create({
          data: {
            userId,
            message: SUPPORT_AUTO_REPLY_TEXT,
            isFromAdmin: true,
          },
        });
        console.log("support: auto-reply sent userId=%s (no admin in %sms)", userId, SUPPORT_AUTO_REPLY_DELAY_MS);
      } catch (e) {
        console.error("support: auto-reply error userId=%s", userId, e);
      }
    })();
  }, SUPPORT_AUTO_REPLY_DELAY_MS);
}

async function notifyAdminsOfSupportMessage(params: {
  userId: string;
  message: string;
}): Promise<void> {
  const { userId, message } = params;
  const ids = listAdminTelegramIds();
  if (ids.length === 0) {
    console.warn(
      "support: нет адресатов (ADMIN_IDS / ADMIN_ID) — уведомление в Telegram пропущено"
    );
    return;
  }
  if (!bot) {
    console.warn("support: BOT_TOKEN нет — уведомление в Telegram пропущено");
    return;
  }
  const body = message
    .length > TELEGRAM_ADMIN_NOTIFY_MAX
    ? message.slice(0, TELEGRAM_ADMIN_NOTIFY_MAX) + "…"
    : message;
  const text =
    "📩 Новое сообщение поддержки\n\n" +
    `👤 User ID: ${userId}\n\n` +
    `💬 ${body}\n\n` +
    "👉 Ответь так:\n" +
    `reply ${userId} текст`;
  for (const idStr of ids) {
    const chatId = Number(idStr);
    if (!Number.isFinite(chatId) || chatId <= 0) {
      console.error("support: невалидный admin id в env:", idStr);
      continue;
    }
    try {
      await bot.telegram.sendMessage(chatId, text);
      console.log("support: уведомление отправлено admin chat", chatId);
    } catch (e) {
      console.error("support: sendMessage admin failed chat=%s", chatId, e);
    }
  }
}

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
      try {
        await notifyAdminsOfSupportMessage({ userId, message });
      } catch (e) {
        console.error("POST /support/message notifyAdminsOfSupportMessage:", e);
      }
      scheduleAutoReplyIfNoAdminSince(userId, row.createdAt);
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

      if (admin) {
        const marked = await prisma.supportMessage.updateMany({
          where: {
            userId: targetId,
            isFromAdmin: false,
            isRead: false,
          },
          data: { isRead: true },
        });
        if (marked.count > 0) {
          console.log(
            "GET /support/:userId admin read user msgs userId=%s count=%s",
            targetId,
            marked.count
          );
        }
      }

      const items = await prisma.supportMessage.findMany({
        where: { userId: targetId },
        orderBy: { createdAt: "asc" },
        take: 500,
      });

      if (!admin && viewerId === targetId) {
        res.once("finish", () => {
          void prisma.supportMessage
            .updateMany({
              where: {
                userId: targetId,
                isFromAdmin: true,
                isRead: false,
              },
              data: { isRead: true },
            })
            .then((r) => {
              if (r.count > 0) {
                console.log(
                  "GET /support/:userId client read admin msgs userId=%s count=%s",
                  targetId,
                  r.count
                );
              }
            })
            .catch((e) => {
              console.error("GET /support/:userId mark admin messages read:", e);
            });
        });
      }

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
      const [recent, unreads] = await Promise.all([
        prisma.supportMessage.findMany({
          orderBy: { createdAt: "desc" },
          take: 2000,
        }),
        prisma.supportMessage.findMany({
          where: { isFromAdmin: false, isRead: false },
          select: { userId: true },
        }),
      ]);
      const unreadByUser = new Set(unreads.map((u) => u.userId));
      const seen = new Set<string>();
      const threads: {
        userId: string;
        lastMessage: string;
        lastAt: string;
        lastFromAdmin: boolean;
        hasUnread: boolean;
      }[] = [];
      for (const m of recent) {
        if (seen.has(m.userId)) continue;
        seen.add(m.userId);
        threads.push({
          userId: m.userId,
          lastMessage: m.message.length > 120 ? m.message.slice(0, 117) + "…" : m.message,
          lastAt: m.createdAt.toISOString(),
          lastFromAdmin: m.isFromAdmin,
          hasUnread: unreadByUser.has(m.userId),
        });
      }
      return res.json(threads);
    } catch (e) {
      console.error("GET /support/inbox/list:", e);
      return res.status(500).json({ error: "Ошибка inbox" });
    }
  });
}
