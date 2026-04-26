import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const STORAGE_KEY = "bars-floating-cart-pos";
const FAB = 56;
const EDGE_PAD = 8;
/** Считаем «серединой», если дальше чем ~48px от любого края */
const MIDDLE_THR = 48;
const SNAP_MS = 3000;
const DRAG_TO_CLICK = 10;

type Pos = { x: number; y: number };

function defaultBottomRight(): Pos {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const y = vh - FAB - EDGE_PAD - 20;
  return { x: vw - FAB - EDGE_PAD, y: Math.max(EDGE_PAD, y) };
}

function clampPos(p: Pos): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.round(
      Math.max(EDGE_PAD, Math.min(vw - FAB - EDGE_PAD, p.x))
    ),
    y: Math.round(
      Math.max(EDGE_PAD, Math.min(vh - FAB - EDGE_PAD, p.y))
    ),
  };
}

function isFloatingInMiddle(p: Pos): boolean {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const d = [
    p.x - EDGE_PAD,
    vw - EDGE_PAD - (p.x + FAB),
    p.y - EDGE_PAD,
    vh - EDGE_PAD - (p.y + FAB),
  ];
  return Math.min(...d) > MIDDLE_THR;
}

function snapToNearestEdge(p: Pos): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minX = EDGE_PAD;
  const maxX = vw - FAB - EDGE_PAD;
  const minY = EDGE_PAD;
  const maxY = vh - FAB - EDGE_PAD;
  const cx = p.x + FAB / 2;
  const cy = p.y + FAB / 2;
  const dLeft = cx;
  const dRight = vw - cx;
  const dTop = cy;
  const dBottom = vh - cy;
  const m = Math.min(dLeft, dRight, dTop, dBottom);
  if (m === dLeft) {
    return { x: minX, y: Math.max(minY, Math.min(maxY, p.y)) };
  }
  if (m === dRight) {
    return { x: maxX, y: Math.max(minY, Math.min(maxY, p.y)) };
  }
  if (m === dTop) {
    return { y: minY, x: Math.max(minX, Math.min(maxX, p.x)) };
  }
  return { y: maxY, x: Math.max(minX, Math.min(maxX, p.x)) };
}

type Props = {
  visible: boolean;
  totalQuantity: number;
  onOpen: () => void;
};

/**
 * Плавающая корзина: перетаскивание, позиция в localStorage.
 * Если отпустить в «середине» экрана — через 3 с прилипает к ближайшей грани.
 */
export default function FloatingCart({
  visible,
  totalQuantity,
  onOpen,
}: Props) {
  const [pos, setPos] = useState<Pos>(() =>
    typeof window !== "undefined" ? defaultBottomRight() : { x: 16, y: 100 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const posRef = useRef<Pos>(pos);
  const drag = useRef<{
    startClient: Pos;
    startPos: Pos;
    id: number | null;
    clickOk: boolean;
  } | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Pos;
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPos(clampPos(p));
        }
      } else {
        setPos(clampPos(defaultBottomRight()));
      }
    } catch {
      setPos(clampPos(defaultBottomRight()));
    }
  }, []);

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current != null) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
  }, []);

  const persist = useCallback((p: Pos) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  const scheduleEdgeSnap = useCallback(
    (from: Pos) => {
      clearSnapTimer();
      if (!isFloatingInMiddle(from)) return;
      snapTimerRef.current = setTimeout(() => {
        const next = snapToNearestEdge(posRef.current);
        setIsSnapping(true);
        setPos(clampPos(next));
        snapTimerRef.current = null;
      }, SNAP_MS);
    },
    [clearSnapTimer]
  );

  useEffect(() => {
    const onResize = () => {
      setPos((p) => clampPos(p));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearSnapTimer();
    };
  }, [clearSnapTimer]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    clearSnapTimer();
    setIsSnapping(false);
    drag.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startPos: { ...posRef.current },
      id: e.pointerId,
      clickOk: true,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startClient.x;
    const dy = e.clientY - d.startClient.y;
    if (Math.hypot(dx, dy) > DRAG_TO_CLICK) d.clickOk = false;
    setPos(clampPos({ x: d.startPos.x + dx, y: d.startPos.y + dy }));
  };

  const endPointer = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const final = posRef.current;
    persist(final);
    if (d.clickOk) {
      onOpen();
      return;
    }
    scheduleEdgeSnap(final);
  };

  const onTransitionEnd = (e: React.TransitionEvent<HTMLButtonElement>) => {
    if (e.propertyName !== "left" && e.propertyName !== "top") return;
    if (isSnapping) {
      setIsSnapping(false);
      const p = clampPos(posRef.current);
      posRef.current = p;
      persist(p);
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`floating-cart cart-float${isDragging ? " floating-cart--dragging" : ""}`}
      style={{
        left: pos.x,
        top: pos.y,
        right: "auto",
        bottom: "auto",
        touchAction: isDragging ? "none" : "manipulation",
        transition: isSnapping
          ? "left 0.35s cubic-bezier(0.4, 0, 0.2, 1), top 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
          : isDragging
            ? "none"
            : undefined,
        cursor: isDragging ? "grabbing" : "pointer",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onTransitionEnd={onTransitionEnd}
      aria-label="Открыть корзину. Перетащите кнопку, чтобы сменить положение."
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
