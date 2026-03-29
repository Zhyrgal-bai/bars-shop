export const getTelegramUser = () => {
  // @ts-expect-error - Telegram Web App SDK is not typed
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
};