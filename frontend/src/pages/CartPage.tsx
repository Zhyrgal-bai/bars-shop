import { useCartStore } from "../store/useCartStore";
import { api } from "../services/api";
import { getTelegramUser } from "../utils/telegram";
import "../components/ui/Cart.css";
import "../components/ui/Toast.css";
import { useState } from "react";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Toast state: { type: "success" | "error", message: string }
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate total price (with quantity)
  const total = items.reduce((sum, item) => {
    return sum + item.price * (item.quantity ?? 1);
  }, 0);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const handleOrder = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const user = getTelegramUser();
      const res = await api.post("/orders", {
        user: {
          telegramId: user?.id || 0,
          name: user?.first_name || "Unknown",
        },
        items,
        total,
      });
      console.log("ORDER CREATED:", res.data);

      clearCart();
      showToast("success", "Заказ оформлен");
    } catch (err) {
      console.error("ORDER ERROR:", err);
      showToast("error", "Ошибка при заказе");
    }
    setLoading(false);
  };

  return (
    <div className="cart">
      <h1 className="cart-title">
        Корзина <span role="img" aria-label="cart">🛒</span>
      </h1>

      {items.length === 0 && (
        <div className="empty" style={{ textAlign: "center", marginTop: "64px" }}>
          <div className="empty-icon" style={{ fontSize: 38, marginBottom: 16, color: "#e2e2e2" }}>🛒</div>
          <div className="empty-title" style={{ fontWeight: 600, fontSize: 20, marginBottom: 6 }}>Корзина пуста</div>
          <div className="empty-desc" style={{ color: "#868686", fontSize: 16 }}>
            Добавьте товары чтобы оформить заказ
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="cart-list" style={{ marginBottom: 24 }}>
            {items.map((item, i) => (
              <div key={i} className="cart-item">
                <div className="cart-item-main">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-details">
                      {item.color} <span className="cart-dot">&bull;</span> {item.size}
                    </span>
                  </div>
                  <span className="cart-item-price">
                    {item.price}
                    <span className="cart-item-currency"> сом</span>
                  </span>
                </div>
                <button
                  className="cart-remove-btn"
                  title="Удалить из корзины"
                  aria-label="Удалить"
                  onClick={() => removeItem(item)}
                  disabled={loading}
                >
                  <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
                    <circle
                      cx="11"
                      cy="11"
                      r="10"
                      className="cart-remove-btn-bg"
                    />
                    <path
                      d="M8.8 8.8L13.2 13.2M13.2 8.8L8.8 13.2"
                      stroke="#888"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Итого</span>
              <span className="cart-total-amount">{total} <span className="cart-item-currency">сом</span></span>
            </div>
            <button
              onClick={handleOrder}
              className="order-btn"
              disabled={loading}
            >
              {loading ? "Отправка..." : "Оформить заказ"}
            </button>
            <button
              onClick={clearCart}
              className="clear-btn"
              disabled={loading}
            >
              Очистить корзину
            </button>
          </div>
        </>
      )}

      {toast && (
        <div className={`toast show${toast.type === "error" ? " toast-error" : ""}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}