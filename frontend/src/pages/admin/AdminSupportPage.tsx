import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSupportInbox,
  fetchSupportThread,
  postSupportReply,
  type SupportInboxThread,
  type SupportMessageRow,
} from "../../services/supportApi";
import { getWebAppUserId } from "../../utils/telegramUserId";
import { useMediaMd } from "../../utils/useMediaMd";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type MobilePanel = "inbox" | "thread";

export default function AdminSupportPage() {
  const adminId = getWebAppUserId();
  const isMd = useMediaMd();
  const [threads, setThreads] = useState<SupportInboxThread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [reply, setReply] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("inbox");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isMd) setMobilePanel("inbox");
  }, [isMd]);

  const loadInbox = useCallback(async () => {
    if (!Number.isFinite(adminId) || adminId <= 0) return;
    try {
      const list = await fetchSupportInbox(adminId);
      setThreads(list);
      setError(null);
    } catch {
      setError("Не удалось загрузить список.");
    } finally {
      setLoadingList(false);
    }
  }, [adminId]);

  const loadChat = useCallback(
    async (userId: string) => {
      if (!Number.isFinite(adminId) || adminId <= 0) return;
      setLoadingChat(true);
      try {
        const rows = await fetchSupportThread({
          userId: Number(userId),
          viewerId: adminId,
        });
        setMessages(rows);
        setError(null);
      } catch {
        setError("Не удалось загрузить чат.");
      } finally {
        setLoadingChat(false);
      }
    },
    [adminId]
  );

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!Number.isFinite(adminId) || adminId <= 0) return;
    const id = window.setInterval(() => {
      void loadInbox();
      if (selected) void loadChat(selected);
    }, 5000);
    return () => window.clearInterval(id);
  }, [loadInbox, loadChat, selected, adminId]);

  useEffect(() => {
    if (selected) void loadChat(selected);
  }, [selected, loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const openThread = (userId: string) => {
    setSelected(userId);
    if (!isMd) setMobilePanel("thread");
  };

  const backToInbox = () => {
    setMobilePanel("inbox");
  };

  const sendReply = async () => {
    const t = reply.trim();
    if (!selected || !t || !Number.isFinite(adminId) || adminId <= 0) return;
    setSending(true);
    setError(null);
    try {
      const row = await postSupportReply({
        adminUserId: adminId,
        targetUserId: selected,
        message: t,
      });
      setReply("");
      setMessages((prev) => [...prev, row]);
      void loadInbox();
    } catch {
      setError("Не удалось отправить.");
    } finally {
      setSending(false);
    }
  };

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return (
      <div className="admin-dash-page">
        <p className="admin-dash-page__muted">Нет Telegram user id.</p>
      </div>
    );
  }

  const showInbox = isMd || mobilePanel === "inbox";
  const showChat = isMd || mobilePanel === "thread";

  return (
    <div
      className={
        "admin-dash-page mx-auto box-border flex w-full max-w-6xl flex-col " +
        "min-h-0 min-h-[calc(100dvh-5.75rem)] md:min-h-[min(100dvh,860px)]"
      }
    >
      <header className="mb-3 mt-0 shrink-0 border-b border-white/5 pb-3 md:mb-4">
        <h1 className="m-0 text-lg font-extrabold tracking-wide text-zinc-100 md:text-xl">
          Поддержка
        </h1>
        <p className="m-0 mt-0.5 text-xs text-zinc-500">Чаты из Mini App · ответы видны у клиентов</p>
      </header>

      {error && (
        <div
          className="mb-2 shrink-0 rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,32%)_minmax(0,1fr)] md:gap-3">
        {/* —— Список диалогов —— */}
        <aside
          className={
            "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 " +
            (showInbox
              ? "flex max-md:h-full"
              : "max-md:hidden md:flex")
          }
          aria-label="Диалоги"
        >
          <div className="shrink-0 border-b border-white/10 px-3 py-3 md:px-4">
            <p className="m-0 text-sm font-semibold text-zinc-200">Диалоги</p>
            <p className="m-0 mt-0.5 text-[10px] text-zinc-500">Красный индикатор — непрочитано от клиента</p>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2 md:p-3">
            {loadingList && (
              <div className="flex justify-center py-8" role="status" aria-label="Загрузка">
                <span className="h-1 w-14 animate-pulse rounded-full bg-zinc-600" />
              </div>
            )}
            {!loadingList && threads.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-zinc-500">Нет сообщений</p>
            )}
            {!loadingList &&
              threads.map((th) => (
                <button
                  key={th.userId}
                  type="button"
                  onClick={() => openThread(th.userId)}
                  className={
                    "flex w-full min-h-12 flex-col items-stretch justify-center rounded-xl border px-3 py-2.5 text-left " +
                    "touch-manipulation transition-colors " +
                    (selected === th.userId
                      ? "border-sky-500/60 bg-sky-500/10"
                      : "border-transparent bg-white/[0.04] active:bg-white/[0.08]")
                  }
                >
                  <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-zinc-300">
                    {th.hasUnread ? (
                      <>
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/30"
                          title="Непрочитанное сообщение"
                          aria-hidden
                        />
                        <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-300">
                          Новое
                        </span>
                      </>
                    ) : null}
                    <span>ID {th.userId}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-zinc-400">{th.lastMessage}</span>
                  <span className="text-[11px] text-zinc-500">
                    {formatTime(th.lastAt)}
                    {th.lastFromAdmin ? " · вы" : " · клиент"}
                  </span>
                </button>
              ))}
          </div>
        </aside>

        {/* —— Чат —— */}
        <section
          className={
            "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 " +
            "bg-zinc-900/40 max-md:max-h-[calc(100dvh-5.75rem-3.5rem)] " +
            (showChat
              ? "flex max-md:h-full"
              : "max-md:hidden md:flex")
          }
          aria-label="Переписка"
        >
          {isMd && !selected && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-10">
              <span className="text-5xl opacity-50" aria-hidden>
                💬
              </span>
              <p className="m-0 text-center text-sm font-medium text-zinc-400">Выберите чат слева</p>
              <p className="m-0 max-w-[16rem] text-center text-xs leading-relaxed text-zinc-600">
                Непрочитанные обращения отмечены меткой «Новое».
              </p>
            </div>
          )}

          {selected && (
            <>
              <div className="flex h-12 min-h-12 shrink-0 items-center gap-1 border-b border-white/10 px-1 md:px-3">
                {!isMd && (
                  <button
                    type="button"
                    onClick={backToInbox}
                    className="inline-flex h-12 min-w-12 items-center justify-center rounded-xl text-lg text-zinc-200 touch-manipulation active:bg-white/10"
                    aria-label="Назад к списку"
                  >
                    ←
                  </button>
                )}
                <div className="min-w-0 flex-1 px-1">
                  <p className="m-0 truncate text-sm font-semibold text-zinc-100">Клиент</p>
                  <p className="m-0 truncate text-xs text-zinc-500">ID {selected}</p>
                </div>
              </div>

              <div
                className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3"
                role="log"
                aria-live="polite"
              >
                {loadingChat && (
                  <div className="flex justify-center py-8" role="status" aria-label="Загрузка">
                    <span className="h-1 w-14 animate-pulse rounded-full bg-zinc-600" />
                  </div>
                )}
                {!loadingChat && messages.length === 0 && (
                  <p className="py-6 text-center text-sm text-zinc-500">Переписка пуста</p>
                )}
                {!loadingChat &&
                  messages.map((m) => {
                    const fromAdmin = m.isFromAdmin;
                    return (
                      <div
                        key={m.id}
                        className={
                          "flex max-w-[min(92%,28rem)] flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug " +
                          (fromAdmin
                            ? "self-start rounded-bl-md bg-zinc-700/80 text-zinc-100"
                            : "self-end rounded-br-md bg-sky-600/90 text-white")
                        }
                      >
                        <p className="m-0 whitespace-pre-wrap break-words">{m.message}</p>
                        <time
                          className="self-end text-[11px] opacity-80"
                          dateTime={m.createdAt}
                        >
                          {formatTime(m.createdAt)}
                        </time>
                      </div>
                    );
                  })}
                <div ref={bottomRef} className="h-0 w-px shrink-0" aria-hidden />
              </div>

              <div className="shrink-0 border-t border-white/10 bg-zinc-900/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    className={
                      "min-h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-black/25 px-3.5 py-3 " +
                      "text-base text-zinc-100 placeholder:text-zinc-500 outline-none " +
                      "focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 " +
                      "disabled:opacity-50"
                    }
                    placeholder="Введите ответ…"
                    value={reply}
                    maxLength={4000}
                    disabled={sending}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                    aria-label="Текст ответа"
                  />
                  <button
                    type="button"
                    className={
                      "inline-flex min-h-12 min-w-[3.5rem] shrink-0 items-center justify-center " +
                      "rounded-xl bg-gradient-to-b from-red-600 to-red-700 px-3 text-lg font-bold text-white " +
                      "shadow-md transition active:scale-[0.97] " +
                      "touch-manipulation disabled:cursor-not-allowed disabled:opacity-45"
                    }
                    disabled={sending || !reply.trim()}
                    onClick={() => void sendReply()}
                    aria-busy={sending}
                    aria-label={sending ? "Отправка…" : "Отправить"}
                  >
                    {sending ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <span aria-hidden>➤</span>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
