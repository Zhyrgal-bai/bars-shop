/// <reference types="vite/client" />

/** Telegram Mini App (telegram-web-app.js) */
interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    query_id?: string;
    auth_date?: string;
    hash?: string;
  };
  ready: () => void;
  /** Opens `https://t.me/...` inside Telegram when available */
  openTelegramLink?: (url: string) => void;
}

interface ImportMetaEnv {
  readonly VITE_ADMIN_IDS?: string;
  readonly VITE_API_URL?: string;
  /** Номер MBank для экрана оплаты (по умолчанию 0556996312). */
  readonly VITE_MBANK_PHONE?: string;
  /**
   * @username бота поддержки (без токена), например: BarsSupportBot
   * → откроется https://t.me/BarsSupportBot
   */
  readonly VITE_SUPPORT_BOT_USERNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
