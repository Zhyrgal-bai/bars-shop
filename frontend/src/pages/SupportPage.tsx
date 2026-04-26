import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSupportThread,
  postSupportMessage,
  type SupportMessageRow,
} from "../services/supportApi";
import { getWebAppUserId } from "../utils/telegramUserId";
import "./SupportPage.css";

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

export default function SupportPage() {
  const [items, setItems] = useState<SupportMessageRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const uid = getWebAppUserId();

  const load = useCallback(async () => {
    if (!Number.isFinite(uid) || uid <= 0) {
      setLoading(false);
      setError("Войдите через Telegram, чтобы писать в поддержку.");
      return;
    }
    try {
      const rows = await fetchSupportThread({ userId: uid, viewerId: uid });
      setItems(rows);
      setError(null);
    } catch {
      setError("Не удалось загрузить чат. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!Number.isFinite(uid) || uid <= 0) return;
    const id = window.setInterval(() => {
      void load();
    }, 4000);
    return () => window.clearInterval(id);
  }, [load, uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || !Number.isFinite(uid) || uid <= 0) return;
    setSending(true);
    setError(null);
    try {
      const row = await postSupportMessage({ userId: uid, message: t });
      setText("");
      setItems((prev) => [...prev, row]);
    } catch {
      setError("Не удалось отправить. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  };

  if (!Number.isFinite(uid) || uid <= 0) {
    return (
      <div className="support-page">
        <p className="support-page__err">
          Поддержка доступна внутри Telegram Mini App.
        </p>
      </div>
    );
  }

  return (
    <div className="support-page">
      <header className="support-page__head">
        <h1 className="support-page__title">Поддержка</h1>
        <p className="support-page__sub">Мы обычно отвечаем в течение дня</p>
      </header>

      {error && <p className="support-page__err">{error}</p>}

      <div className="support-page__thread" role="log" aria-live="polite">
        {loading && <p className="support-page__hint">Загрузка…</p>}
        {!loading && items.length === 0 && (
          <p className="support-page__hint">Напишите нам — ответим здесь.</p>
        )}
        {items.map((m) => (
          <div
            key={m.id}
            className={
              m.isFromAdmin
                ? "support-bubble support-bubble--admin"
                : "support-bubble support-bubble--user"
            }
          >
            <p className="support-bubble__text">{m.message}</p>
            <time className="support-bubble__time" dateTime={m.createdAt}>
              {formatTime(m.createdAt)}
            </time>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="support-page__input-row">
        <input
          type="text"
          className="support-page__input"
          placeholder="Ваше сообщение…"
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          className="support-page__send"
          disabled={sending || !text.trim()}
          onClick={() => void send()}
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
