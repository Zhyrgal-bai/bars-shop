import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSupportThread,
  postSupportMessage,
  type SupportMessageRow,
} from "../services/supportApi";
import { getWebAppUserId } from "../utils/telegramUserId";

const POLL_MS = 3000;

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

function LoadingDots() {
  return (
    <div className="flex justify-center py-10" role="status" aria-label="Загрузка">
      <span className="h-1 w-16 animate-pulse rounded-full bg-zinc-600" />
    </div>
  );
}

export default function SupportPage() {
  const [items, setItems] = useState<SupportMessageRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const firstLoadRef = useRef(true);
  const lastThreadSnapshotRef = useRef<{ count: number; lastId: number | null }>({
    count: 0,
    lastId: null,
  });
  const uid = getWebAppUserId();

  const load = useCallback(async () => {
    if (!Number.isFinite(uid) || uid <= 0) {
      setLoading(false);
      setError("Войдите через Telegram.");
      return;
    }
    const isBackground = !firstLoadRef.current;
    if (isBackground) setIsSyncing(true);
    try {
      const rows = await fetchSupportThread({ userId: uid, viewerId: uid });
      setItems(rows);
      setError(null);
    } catch {
      setError("Не удалось загрузить чат. Потяните вниз для обновления.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
      firstLoadRef.current = false;
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!Number.isFinite(uid) || uid <= 0) return;
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load, uid]);

  useEffect(() => {
    if (items.length === 0) {
      lastThreadSnapshotRef.current = { count: 0, lastId: null };
      return;
    }
    const lastId = items[items.length - 1]?.id ?? null;
    const prev = lastThreadSnapshotRef.current;
    const hasNewMessage = items.length > prev.count || lastId !== prev.lastId;
    lastThreadSnapshotRef.current = { count: items.length, lastId };
    if (!hasNewMessage) return;
    queueMicrotask(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [items]);

  const send = async () => {
    const t = text.trim();
    if (!t || !Number.isFinite(uid) || uid <= 0) return;
    setSending(true);
    setError(null);
    try {
      const row = await postSupportMessage({ userId: uid, message: t });
      setText("");
      setItems((prev) => [...prev, row]);
      inputRef.current?.focus();
    } catch {
      setError("Не удалось отправить. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  };

  if (!Number.isFinite(uid) || uid <= 0) {
    return (
      <div className="box-border w-full max-w-3xl px-4 py-8 text-center md:mx-auto">
        <p className="m-0 text-sm leading-relaxed text-red-200/90">
          Поддержка доступна внутри Telegram Mini App.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        "mx-auto box-border flex w-full max-w-3xl flex-col " +
        "h-[calc(100dvh-5.5rem)] min-h-0 max-h-[calc(100dvh-5.5rem)] " +
        "px-3 text-zinc-100 md:px-4"
      }
    >
      <header className="relative shrink-0 border-b border-white/5 pb-3 pt-1">
        {isSyncing && (
          <div
            className="absolute bottom-0 left-1/2 h-0.5 w-12 -translate-x-1/2 animate-pulse rounded-full bg-sky-500/80"
            aria-hidden
          />
        )}
        <h1 className="m-0 text-center text-lg font-bold tracking-wide text-white md:text-xl">
          Поддержка
        </h1>
        <p className="m-0 mt-1 text-center text-xs text-zinc-500">
          Обычно отвечаем в течение дня
        </p>
      </header>

      {error && (
        <div
          className="mb-2 mt-1 shrink-0 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-center"
          role="alert"
        >
          <p className="m-0 text-sm text-red-200">{error}</p>
        </div>
      )}

      <div
        className={
          "mt-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain rounded-2xl " +
          "border border-white/5 bg-[#0d1320]/50 py-2 pl-1 pr-2 md:pl-2 md:pr-3"
        }
        role="log"
        aria-live="polite"
      >
        {loading && <LoadingDots />}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <span className="text-4xl" aria-hidden>
              💬
            </span>
            <p className="m-0 max-w-xs text-base font-medium text-zinc-300">
              Напишите нам — ответим здесь
            </p>
            <p className="m-0 max-w-xs text-sm leading-relaxed text-zinc-500">
              Сообщения синхронизируются с поддержкой, как в мессенджере.
            </p>
          </div>
        )}
        {items.map((m) => {
          const isUser = !m.isFromAdmin;
          const isUnreadFromSupport = m.isFromAdmin && m.isRead === false;
          return (
            <div
              key={m.id}
              className={
                "flex max-w-[min(88%,20rem)] flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug " +
                "shadow-sm " +
                (isUser
                  ? "self-end rounded-br-md bg-gradient-to-b from-red-600 to-red-800 text-white "
                  : "self-start rounded-bl-md border border-white/10 bg-zinc-800/90 text-zinc-100")
              }
            >
              {isUnreadFromSupport && (
                <span className="mb-0.5 inline-flex max-w-full items-center gap-1.5 self-start text-[10px] font-bold uppercase tracking-wide text-sky-300">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-400" />
                  Новое
                </span>
              )}
              <p className="m-0 whitespace-pre-wrap break-words">{m.message}</p>
              <time className="self-end text-[11px] opacity-70" dateTime={m.createdAt}>
                {formatTime(m.createdAt)}
              </time>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-px w-full shrink-0" aria-hidden />
      </div>

      <div
        className={
          "shrink-0 border-t border-white/10 bg-[#0b0f1a]/95 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] " +
          "pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] backdrop-blur-md"
        }
      >
        <p className="mb-1.5 text-center text-[10px] uppercase tracking-wider text-zinc-600">
          Сообщение увидит поддержка
        </p>
        <div className="flex items-stretch gap-2.5">
          <input
            ref={inputRef}
            type="text"
            className={
              "min-h-12 min-w-0 flex-1 rounded-2xl border border-white/12 bg-white/[0.08] " +
              "px-3.5 py-3 text-base text-white outline-none " +
              "placeholder:text-zinc-500 " +
              "focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            }
            placeholder="Введите сообщение…"
            value={text}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
            autoComplete="off"
            enterKeyHint="send"
            disabled={sending}
            aria-label="Текст сообщения"
          />
          <button
            type="button"
            className={
              "inline-flex min-h-12 min-w-[3.5rem] shrink-0 items-center justify-center " +
              "rounded-2xl bg-gradient-to-b from-red-500 to-red-700 px-4 text-sm font-bold text-white " +
              "shadow-lg shadow-red-900/30 transition active:scale-[0.98] " +
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none " +
              "touch-manipulation"
            }
            disabled={sending || !text.trim()}
            onClick={() => void send()}
            aria-busy={sending}
            aria-label={sending ? "Отправка…" : "Отправить"}
          >
            {sending ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <span className="text-lg" aria-hidden>
                ➤
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
