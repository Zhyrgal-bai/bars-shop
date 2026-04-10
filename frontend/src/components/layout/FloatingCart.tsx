import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "bars-floating-cart-pos";
const BTN = 56;
const PAD = 8;
const DRAG_THRESHOLD = 6;

type Pos = { x: number; y: number };

function clampPos(x: number, y: number): Pos {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(PAD, window.innerWidth - BTN - PAD);
  const maxY = Math.max(PAD, window.innerHeight - BTN - PAD);
  return {
    x: Math.min(maxX, Math.max(PAD, x)),
    y: Math.min(maxY, Math.max(PAD, y)),
  };
}

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 100, y: 100 };
  return clampPos(
    window.innerWidth - BTN - 22,
    window.innerHeight - BTN - 24
  );
}

function loadPos(): Pos {
  if (typeof window === "undefined") return defaultPos();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const j = JSON.parse(raw) as { x?: unknown; y?: unknown };
      if (Number.isFinite(j.x) && Number.isFinite(j.y)) {
        return clampPos(Number(j.x), Number(j.y));
      }
    }
  } catch {
    /* ignore */
  }
  return defaultPos();
}

type Props = {
  visible: boolean;
  totalQuantity: number;
  onOpen: () => void;
};

export default function FloatingCart({
  visible,
  totalQuantity,
  onOpen,
}: Props) {
  const [pos, setPos] = useState<Pos>(loadPos);
  const posRef = useRef(pos);
  posRef.current = pos;

  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const movedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => clampPos(p.x, p.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const finishDrag = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (dragRef.current && movedRef.current) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(posRef.current)
        );
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  }, []);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = clientX - d.startClientX;
    const dy = clientY - d.startClientY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
    }
    setPos(clampPos(d.startX + dx, d.startY + dy));
  }, []);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      finishDrag();
      movedRef.current = false;
      dragRef.current = {
        startClientX: clientX,
        startClientY: clientY,
        startX: posRef.current.x,
        startY: posRef.current.y,
      };
    },
    [finishDrag]
  );

  const onMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!visible || e.button !== 0) return;
    startDrag(e.clientX, e.clientY);

    const onMove = (ev: MouseEvent) => {
      moveDrag(ev.clientX, ev.clientY);
    };
    const onUp = () => {
      finishDrag();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    cleanupRef.current = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  };

  const onTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!visible) return;
    const t = e.touches[0];
    if (!t) return;
    startDrag(t.clientX, t.clientY);

    const onMove = (ev: TouchEvent) => {
      const tt = ev.touches[0];
      if (tt) {
        ev.preventDefault();
        moveDrag(tt.clientX, tt.clientY);
      }
    };
    const onEnd = () => {
      finishDrag();
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    cleanupRef.current = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  };

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
      return;
    }
    onOpen();
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className="floating-cart"
      style={{ left: pos.x, top: pos.y, right: "auto", bottom: "auto" }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      aria-label="Открыть корзину"
    >
      <div className="cart-icon">
        🛒
        {totalQuantity > 0 && (
          <span className="cart-badge">{totalQuantity}</span>
        )}
      </div>
    </button>
  );
}
