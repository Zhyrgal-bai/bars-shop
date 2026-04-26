/**
 * Бот поддержки: токен SUPPORT_BOT_TOKEN (не BOT_TOKEN), отдельно от bot.ts.
 * user → бот (ack) → ADMIN_ID (sendMessage) | админ: reply <id> <текст> → user
 */
import "dotenv/config";
import { Telegraf } from "telegraf";

const AUTO_HELP_STUB =
  "Пока вы ждёте, кратко опишите ситуацию — с вами свяжутся в ближайшее время.";

const ADMIN_ID = Number(process.env.ADMIN_ID);

function getSupportToken(): string | undefined {
  const t = process.env.SUPPORT_BOT_TOKEN?.trim();
  return t && t.length > 0 ? t : undefined;
}

function isValidAdminId(n: number): n is number {
  return Number.isFinite(n) && n > 0;
}

function getMessageText(m: unknown): string | undefined {
  if (m != null && typeof m === "object" && "text" in m) {
    const t = (m as { text?: unknown }).text;
    return typeof t === "string" ? t : undefined;
  }
  return undefined;
}

/** /start, /start@bot, /start app */
function isStartCommand(text: string | undefined): boolean {
  if (text == null) return false;
  return /^\/start(@\S*)?(\s+|$)/i.test(text.trim());
}

function isUnknownUserCommand(text: string | undefined): boolean {
  if (text == null) return false;
  if (isStartCommand(text)) return false;
  return text.trim().startsWith("/");
}

function parseAdminReplyCommand(text: string):
  | { ok: true; targetId: number; message: string }
  | { ok: false } {
  const t = text.trim();
  if (!/^reply\s/i.test(t)) {
    return { ok: false };
  }
  const parts = t.split(/\s+/);
  if (parts.length < 3) {
    return { ok: false };
  }
  const head = (parts[0] ?? "").toLowerCase();
  if (head !== "reply") {
    return { ok: false };
  }
  const targetId = Number(parts[1]);
  if (!Number.isFinite(targetId) || targetId <= 0) {
    return { ok: false };
  }
  const message = parts.slice(2).join(" ");
  if (message.length === 0) {
    return { ok: false };
  }
  return { ok: true, targetId, message };
}

function formatIncomingForAdmin(params: {
  userId: number;
  username: string;
  text: string;
}): string {
  return `📩 НОВОЕ СООБЩЕНИЕ В ПОДДЕРЖКУ

👤 User ID: ${params.userId}
👤 Username: @${params.username}

💬 Сообщение:
${params.text}`;
}

export async function startSupportBot(): Promise<void> {
  const token = getSupportToken();
  if (!token) {
    console.warn(
      "Support bot: SUPPORT_BOT_TOKEN not set — support bot is disabled"
    );
    return;
  }

  if (!isValidAdminId(ADMIN_ID)) {
    console.error(
      "Support bot: ERROR — ADMIN_ID is missing or invalid. Admin will NOT receive support messages. Set ADMIN_ID in .env"
    );
  } else {
    console.log("Support bot: ADMIN_ID =", ADMIN_ID);
  }

  const bot = new Telegraf(token);

  bot.on("text", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const text = ctx.message.text;
    if (text == null) return;

    // ——— Админ ———
    if (isValidAdminId(ADMIN_ID) && from.id === ADMIN_ID) {
      const adminReply = parseAdminReplyCommand(text);
      if (adminReply.ok) {
        try {
          await ctx.telegram.sendMessage(
            adminReply.targetId,
            "💬 Ответ поддержки:\n\n" + adminReply.message
          );
          await ctx.reply("Ответ отправлен ✅");
          console.log(
            "Support bot: admin reply sent to",
            adminReply.targetId
          );
        } catch (e) {
          console.error("Support bot: admin reply to user failed:", e);
          await ctx
            .reply("Не удалось доставить ответ. Проверьте id пользователя и что он /start-ал бота.")
            .catch(() => undefined);
        }
        return;
      }

      const m = ctx.message;
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
            console.log("Support bot: admin copyMessage → user", target);
            return;
          } catch (e) {
            console.error("Support bot: copyMessage to user failed:", e);
            await ctx
              .reply("Не удалось доставить. Или используйте: reply <userId> <текст>")
              .catch(() => undefined);
            return;
          }
        }
      }
      return;
    }

    // ——— Клиенты: /start ———
    if (isStartCommand(text)) {
      try {
        await ctx.reply("Здравствуйте! Напишите ваш вопрос 👇\n\n" + AUTO_HELP_STUB);
      } catch (e) {
        console.error("Support bot: /start reply failed:", e);
      }
      return;
    }

    if (isUnknownUserCommand(text)) {
      try {
        await ctx.reply("Напишите обычным текстом, без /команд. Спасибо.");
      } catch (e) {
        console.error("Support bot: unknown /command failed:", e);
      }
      return;
    }

    // ——— Обычный текст: ack + письмо админу ———
    const userId = from.id;
    const username = from.username && from.username.length > 0
      ? from.username
      : "без_username";

    try {
      await ctx.reply(
        "Мы получили ваш вопрос: " + text + "\n\nСкоро ответим ✅"
      );
    } catch (e) {
      console.error("Support bot: user ack failed:", e);
    }

    if (!isValidAdminId(ADMIN_ID)) {
      return;
    }

    const body = formatIncomingForAdmin({ userId, username, text });
    try {
      await ctx.telegram.sendMessage(ADMIN_ID, body);
      console.log("Support bot: sent support ticket to admin, user", userId);
    } catch (e) {
      console.error("Support bot: sendMessage to admin failed:", e);
      try {
        await ctx
          .reply("Сообщение принято, но сейчас не удалось связаться с администратором. Попробуйте позже.")
          .catch(() => undefined);
      } catch {
        /* ignore */
      }
    }
  });

  bot.on("message", async (ctx) => {
    if ("text" in ctx.message) {
      return;
    }

    const from = ctx.from;
    if (!from) return;
    const m = ctx.message;
    if (!m) return;

    if (isValidAdminId(ADMIN_ID) && from.id === ADMIN_ID) {
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
            console.log("Support bot: admin media copyMessage →", target);
            return;
          } catch (e) {
            console.error("Support bot: copyMessage (media) failed:", e);
          }
        }
      }
      return;
    }

    if (from.id === ADMIN_ID) {
      return;
    }

    const userId = from.id;
    const username = from.username && from.username.length > 0
      ? from.username
      : "без_username";

    try {
      await ctx.reply(
        "Мы получили ваше сообщение. Скоро ответим. Спасибо! ✅\n\n" + AUTO_HELP_STUB
      );
    } catch (e) {
      console.error("Support bot: media user ack failed:", e);
    }

    if (!isValidAdminId(ADMIN_ID)) {
      return;
    }

    const cap =
      "caption" in m && typeof m.caption === "string" ? m.caption : null;
    const label = cap
      ? String(cap)
      : "[медиа / вложение без подписи]";
    const body = formatIncomingForAdmin({ userId, username, text: label });
    try {
      await ctx.telegram.sendMessage(ADMIN_ID, body);
    } catch (e) {
      console.error("Support bot: sendMessage (media) to admin failed:", e);
    }
    try {
      await ctx.telegram.forwardMessage(ADMIN_ID, ctx.chat.id, m.message_id);
      console.log("Support bot: media forwarded to admin, user", userId);
    } catch (e) {
      console.error("Support bot: forward to admin (media) failed:", e);
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
