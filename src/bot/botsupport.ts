/**
 * Бот поддержки: токен SUPPORT_BOT_TOKEN (не BOT_TOKEN), отдельно от bot.ts.
 * Старт при импорте модуля (см. import в server/index.ts) или: npm run bot:support
 */
import "dotenv/config";
import { Telegraf } from "telegraf";

const AUTO_HELP_STUB =
  "Пока вы ждёте, кратко опишите ситуацию — с вами свяжутся в ближайшее время.";

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

/** /start, /start@bot, /start app (из Mini App ?start=app) */
function isStartCommand(text: string | undefined): boolean {
  if (text == null) return false;
  return /^\/start(@\S*)?(\s+|$)/i.test(text.trim());
}

function isUnknownCommand(text: string | undefined): boolean {
  if (text == null) return false;
  if (isStartCommand(text)) return false;
  return text.trim().startsWith("/");
}

export async function startSupportBot(): Promise<void> {
  const token = getSupportToken();
  if (!token) {
    console.warn(
      "Support bot: SUPPORT_BOT_TOKEN not set — support bot is disabled"
    );
    return;
  }

  const adminId = getAdminTgId();
  if (adminId == null) {
    console.warn(
      "Support bot: ADMIN_ID not set — no forwarding, user replies still work"
    );
  } else {
    console.log("Support bot: admin ADMIN_ID =", adminId);
  }

  const bot = new Telegraf(token);

  bot.on("message", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const m = ctx.message;
    if (!m) return;
    const userText = getMessageText(m);

    if (adminId != null && from.id === adminId) {
      const replyTo =
        "reply_to_message" in m && m.reply_to_message
          ? m.reply_to_message
          : undefined;
      if (replyTo) {
        const ff = (
          replyTo as { forward_from?: { id: number } }
        ).forward_from;
        const target = ff != null && Number.isFinite(ff.id) ? ff.id : undefined;
        if (target != null && target > 0) {
          try {
            await ctx.telegram.copyMessage(
              target,
              ctx.chat.id,
              m.message_id
            );
            return;
          } catch (e) {
            console.error("Support bot: copyMessage to user failed:", e);
            await ctx
              .reply("Не удалось доставить ответ пользователю.")
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

    if (userText != null && isStartCommand(userText)) {
      try {
        await ctx.reply("Здравствуйте! Напишите ваш вопрос 👇\n\n" + AUTO_HELP_STUB);
      } catch (e) {
        console.error("Support bot: /start reply failed:", e);
      }
      return;
    }

    if (userText != null && isUnknownCommand(userText)) {
      try {
        await ctx.reply("Напишите обычным текстом, без /команд. Спасибо.");
      } catch (e) {
        console.error("Support bot: /command reply failed:", e);
      }
      return;
    }

    if (userText != null) {
      const userMessage = userText;
      try {
        await ctx.reply(
          "Мы получили ваш вопрос: " +
            userMessage +
            "\n\nСкоро ответим ✅"
        );
      } catch (e) {
        console.error("Support bot: text reply failed:", e);
      }
      if (adminId == null) return;
      try {
        await ctx.telegram.forwardMessage(
          adminId,
          ctx.chat.id,
          m.message_id
        );
      } catch (e) {
        console.error("Support bot: forward to admin failed:", e);
        try {
          await ctx.telegram.sendMessage(
            adminId,
            `Сообщение от user id ${from.id}:\n\n${String(userMessage).slice(0, 3500)}`
          );
        } catch (e2) {
          console.error("Support bot: fallback to admin failed:", e2);
        }
      }
      return;
    }

    try {
      await ctx.reply(
        "Мы получили ваше сообщение. Скоро ответим. Спасибо! ✅\n\n" + AUTO_HELP_STUB
      );
    } catch (e) {
      console.error("Support bot: media reply failed:", e);
    }
    if (adminId == null) return;
    try {
      await ctx.telegram.forwardMessage(adminId, ctx.chat.id, m.message_id);
    } catch (e) {
      console.error("Support bot: forward media to admin failed:", e);
    }
  });

  try {
    await bot.launch();
    console.log("Support bot started (long polling)");
  } catch (e) {
    console.error("Support bot: launch failed:", e);
  }
}

void startSupportBot().catch((e) => {
  console.error("Support bot: unhandled", e);
});
