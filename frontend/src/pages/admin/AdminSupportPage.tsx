import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSupportInbox,
  fetchSupportThread,
  postSupportReply,
  type SupportInboxThread,
  type SupportMessageRow,
} from "../../services/supportApi";
import { getWebAppUserId } from "../../utils/telegramUserId";

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

export default function AdminSupportPage() {
  const adminId = getWebAppUserId();
  const [threads, setThreads] = useState<SupportInboxThread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [reply, setReply] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
      setError("Не удалось отправить ответ.");
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

  return (
    <div className="admin-dash-page admin-support">
      <header className="admin-support__head">
        <h1 className="admin-dash-page__title">Поддержка</h1>
        <p className="admin-dash-page__muted">
          Диалоги из Mini App — ответы видны у клиента в разделе «Поддержка».
        </p>
      </header>

      {error && (
        <div className="admin-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="admin-support__grid">
        <aside className="admin-support__list" aria-label="Пользователи">
          {loadingList && <p className="admin-dash-page__muted">Загрузка…</p>}
          {!loadingList && threads.length === 0 && (
            <p className="admin-dash-page__muted">Пока нет обращений.</p>
          )}
          {threads.map((th) => (
            <button
              key={th.userId}
              type="button"
              className={
                "admin-support__thread-btn" +
                (selected === th.userId ? " admin-support__thread-btn--active" : "")
              }
              onClick={() => setSelected(th.userId)}
            >
              <span className="admin-support__thread-id">ID {th.userId}</span>
              <span className="admin-support__thread-preview">{th.lastMessage}</span>
              <span className="admin-support__thread-meta">
                {formatTime(th.lastAt)}
                {th.lastFromAdmin ? " · вы" : " · клиент"}
              </span>
            </button>
          ))}
        </aside>

        <section className="admin-support__chat" aria-label="Переписка">
          {!selected && (
            <p className="admin-dash-page__muted">Выберите пользователя слева.</p>
          )}
          {selected && (
            <>
              <div className="admin-support__thread-head">User {selected}</div>
              <div className="admin-support__messages">
                {loadingChat && (
                  <p className="admin-dash-page__muted">Загрузка…</p>
                )}
                {!loadingChat &&
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.isFromAdmin
                          ? "admin-support-bubble admin-support-bubble--admin"
                          : "admin-support-bubble admin-support-bubble--user"
                      }
                    >
                      <p className="admin-support-bubble__text">{m.message}</p>
                      <time className="admin-support-bubble__time" dateTime={m.createdAt}>
                        {formatTime(m.createdAt)}
                      </time>
                    </div>
                  ))}
                <div ref={bottomRef} />
              </div>
              <div className="admin-support__reply-row">
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Ответ клиенту…"
                  value={reply}
                  maxLength={4000}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendReply();
                    }
                  }}
                />
                <button
                  type="button"
                  className="admin-btn-primary"
                  disabled={sending || !reply.trim()}
                  onClick={() => void sendReply()}
                >
                  Отправить
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
