import { useMemo } from "react";
import { motion } from "framer-motion";
import { getTelegramUser } from "../../utils/telegram";
import { telegramDisplayInitial } from "../../utils/telegramUserMark";
import "./bars-shell.css";

type HeaderProps = {
  menuOpen?: boolean;
  onMenuToggle?: () => void;
};

function telegramDisplayName(user: ReturnType<typeof getTelegramUser>): string | null {
  if (!user) return null;
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.username?.trim()) return `@${user.username.trim()}`;
  return null;
}

export default function Header({ menuOpen = false, onMenuToggle }: HeaderProps) {
  const user = useMemo(() => getTelegramUser(), []);
  const initial = telegramDisplayInitial(user);
  const displayName = useMemo(() => telegramDisplayName(user), [user]);

  return (
    <header className="bars-header">
      <div className="bars-header__cell bars-header__cell--left">
        <motion.button
          type="button"
          className={`bars-header__burger${menuOpen ? " bars-header__burger--open" : ""}`}
          onClick={onMenuToggle}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          whileTap={{ scale: 0.94 }}
        >
          <span className="bars-header__burger-line" />
          <span className="bars-header__burger-line" />
          <span className="bars-header__burger-line" />
        </motion.button>
      </div>

      <h1 className="bars-header__logo">BARŚ</h1>

      <div className="bars-header__cell bars-header__cell--right">
        <div className="bars-header__user" title={displayName ?? undefined}>
          {displayName ? (
            <span className="bars-header__user-name">{displayName}</span>
          ) : null}
          <div
            className="bars-header__mark"
            aria-hidden={displayName ? true : undefined}
            title={user?.first_name?.trim() || user?.username || undefined}
          >
            {user?.photo_url ? (
              <img
                src={user.photo_url}
                alt={displayName ?? user.first_name ?? ""}
                width={40}
                height={40}
              />
            ) : (
              initial
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
