/**
 * Бот поддержки: отдельный процесс от `bot.ts` (заказы), свой токен `SUPPORT_BOT_TOKEN`.
 * Запуск: `npm run bot:support` (long polling, не трогает webhook основного бота).
 *
 * Требуется: SUPPORT_BOT_TOKEN, ADMIN_ID (Telegram user id админа).
 */
import "dotenv/config";
import { Telegraf } from "telegraf";

const SUPPORT_GREETING =
  "Здравствуйте! Напишите ваш вопрос, мы ответим в ближайшее время.";

const AUTO_HELP_STUB =
  "Пока оператор на связи, кратко опишите ситуацию — с вами свяжутся. Спасибо за обращение!";

function getAdminTgId(): number | null {
  const raw = process.env.ADMIN_ID?.trim();
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getSupportToken(): string | undefined {
  const t = process.env.SUPPORT_BOT_TOKEN?.trim();
  return t && t.length > 0 ? t : undefined;
}

function getMessageText(m: unknown): string | undefined {
  if (m != null && typeof m === "object" && "text" in m) {
    const t = (m as { text?: unknown }).text;
    return typeof t === "string" ? t : undefined;
  }
  return undefined;
}

function isStartCommandText(text: string | undefined): boolean {
  if (text == null) return false;
  return /^\/start(@\w+)?$/i.test(text.trim());
}

async function start(): Promise<void> {
  const token = getSupportToken();
  if (!token) {
    console.error(
      "botsupport: задайте SUPPORT_BOT_TOKEN в .env (см. .env.example)"
    );
    process.exit(1);
  }

  const adminId = getAdminTgId();
  if (adminId == null) {
    console.warn(
      "botsupport: ADMIN_ID не задан — ответы админа и пересылка отключены"
    );
  } else {
    console.log("botsupport: админ (ADMIN_ID):", adminId);
  }

  const bot = new Telegraf(token);

  bot.on("message", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const m = ctx.message;
    if (!m) return;

    // ——— Ответ админа пользователю (reply к пересланному) ———
    if (adminId != null && from.id === adminId) {
      const replyTo =
        "reply_to_message" in m && m.reply_to_message
          ? m.reply_to_message
          : undefined;
      if (replyTo) {
        const ff =
          "forward_from" in replyTo
            ? (replyTo as { forward_from?: { id: number } }).forward_from
            : undefined;
        const target = ff != null && Number.isFinite(ff.id) ? ff.id : undefined;
        if (target != null && target > 0) {
          try {
            await ctx.telegram.copyMessage(target, ctx.chat.id, m.message_id);
            return;
          } catch (e) {
            console.error("botsupport: copyMessage to user failed:", e);
            await ctx
              .reply("Не удалось доставить ответ пользователю. Попробуйте ещё раз.")
              .catch(() => undefined);
            return;
          }
        }
      }
      return;
    }

    if (from.id === adminId) {
      return;
    }

    // ——— /start — только приветствие, без дублирования и без пересылки ———
    const userText = getMessageText(m);
    if (isStartCommandText(userText)) {
      try {
        await ctx.reply(`${SUPPORT_GREETING}\n\n${AUTO_HELP_STUB}`);
      } catch (e) {
        console.error("botsupport: /start reply failed:", e);
      }
      return;
    }

    // ——— остальные команды (не /start) не трогаем в этом боте ———
    if (userText?.trim().startsWith("/")) {
      return;
    }

    // ——— Сообщения пользователей: авто‑ответ (заглушка) + пересылка админу ———
    try {
      await ctx.reply(SUPPORT_GREETING);
      await ctx.reply(AUTO_HELP_STUB);
    } catch (e) {
      console.error("botsupport: reply to user failed:", e);
    }

    if (adminId != null) {
      try {
        await ctx.telegram.forwardMessage(adminId, ctx.chat.id, m.message_id);
      } catch (e) {
        const preview = userText ?? "[не текст]";
        console.error("botsupport: forward to admin failed:", e);
        try {
          await ctx.telegram.sendMessage(
            adminId,
            `Сообщение от user id ${from.id}:\n\n${String(preview).slice(0, 3500)}`
          );
        } catch (e2) {
          console.error("botsupport: fallback send to admin failed:", e2);
        }
      }
    }
  });

  try {
    await bot.launch();
    console.log("botsupport: long polling started");
  } catch (e) {
    console.error("botsupport: launch failed:", e);
    process.exit(1);
  }

  const stop = () => bot.stop("SIGINT");
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

void start();
