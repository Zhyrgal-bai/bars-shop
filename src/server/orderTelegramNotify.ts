import { bot, getNotifyTargetChatId } from "../bot/bot.js";
import type { OrderStatus } from "./orderStatus.js";

function customerTextForStatus(status: OrderStatus): string | null {
  if (status === "ACCEPTED") return "Заказ принят";
  if (status === "CONFIRMED") return "Оплата подтверждена";
  if (status === "SHIPPED") return "Отправлено";
  return null;
}

async function sendTelegramText(
  chatId: string | number,
  text: string
): Promise<void> {
  const token = process.env.BOT_TOKEN;
  if (!token) return;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (!res.ok || json.ok === false) {
      console.error("TELEGRAM sendMessage failed", res.status, json);
    }
  } catch (e) {
    console.error("TELEGRAM sendMessage error:", e);
  }
}

/**
 * После смены статуса через API (мини-апп / админка): уведомить клиента и админ-чат.
 * Пути бота (callback) сами шлют сообщения — эта функция только для HTTP PUT.
 */
export async function notifyAfterOrderStatusChangeFromApi(order: {
  id: number;
  status: string;
  user: { telegramId: bigint };
}): Promise<void> {
  const status = order.status as OrderStatus;
  const text = customerTextForStatus(status);
  const tgId = Number(order.user.telegramId);

  if (text != null && Number.isFinite(tgId) && tgId > 0) {
    if (bot) {
      try {
        await bot.telegram.sendMessage(tgId, text);
      } catch (e) {
        console.error("notify customer (bot):", e);
      }
    } else {
      await sendTelegramText(tgId, text);
    }
  }

  const adminChat = getNotifyTargetChatId();
  if (adminChat == null) return;

  const adminLine = `📱 Заказ #${order.id} → ${order.status}\n(обновлено в приложении)`;
  if (bot) {
    try {
      await bot.telegram.sendMessage(adminChat, adminLine);
    } catch (e) {
      console.error("notify admin (bot):", e);
    }
  } else {
    await sendTelegramText(adminChat, adminLine);
  }
}
