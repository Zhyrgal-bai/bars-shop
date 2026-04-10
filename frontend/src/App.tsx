import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AdminPage from "./pages/AdminPage";
import FAQPage from "./pages/FAQPage";
import { useState, useEffect, useMemo } from "react";
import { useCartStore } from "./store/useCartStore";
import { API_BASE_URL } from "./services/api";
import { getTelegramWebAppUserId } from "./utils/isAdmin";
import "./App.css";
import "./components/ui/Admin.css";
import Header from "./components/layout/Header";
import SideMenu from "./components/layout/SideMenu";
import FloatingCart from "./components/layout/FloatingCart";

export default function App() {
  const [page, setPage] = useState<
    "home" | "cart" | "checkout" | "admin" | "faq"
  >("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  /** Проверка /check-admin уже завершена (или userId нет — показывать итог без ожидания). */
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  const userId = useMemo(() => getTelegramWebAppUserId(), []);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setAdminCheckComplete(true);
      return;
    }

    let cancelled = false;
    const url = `${API_BASE_URL.replace(/\/$/, "")}/check-admin`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
      .then((res) => res.json())
      .then((data: { isAdmin?: boolean }) => {
        if (!cancelled) {
          setIsAdmin(Boolean(data.isAdmin));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAdminCheckComplete(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);
  const items = useCartStore((state) => state.items);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  const handleMenuToggle = () => setIsMenuOpen((prev) => !prev);
  const handleMenuClose = () => setIsMenuOpen(false);

  const handleNav = (
    target: "home" | "cart" | "checkout" | "admin" | "faq"
  ) => {
    setPage(target);
    setIsMenuOpen(false);
  };

  const handleFloatingCartClick = () => {
    if (page !== "cart") {
      setPage("cart");
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="app">
      <Header onMenuToggle={handleMenuToggle} />

      <SideMenu
        open={isMenuOpen}
        onClose={handleMenuClose}
        onNav={handleNav}
        isAdmin={isAdmin}
      />

      <div className="content">
        {page === "home" && <HomePage />}
        {page === "faq" && <FAQPage />}
        {page === "cart" && (
          <CartPage onGoToCheckout={() => setPage("checkout")} />
        )}
        {page === "checkout" && (
          <CheckoutPage
            onBack={() => setPage("cart")}
            onOrderSuccess={() => setPage("home")}
          />
        )}
        {page === "admin" && !adminCheckComplete && (
          <div className="admin-page">
            <p className="admin-loading">Проверка доступа…</p>
          </div>
        )}
        {page === "admin" && adminCheckComplete && isAdmin && <AdminPage />}
        {page === "admin" && adminCheckComplete && !isAdmin && (
          <div className="admin-page">
            <div className="no-access">Нет доступа</div>
          </div>
        )}
      </div>

      <FloatingCart
        visible={page !== "checkout"}
        totalQuantity={totalQuantity}
        onOpen={handleFloatingCartClick}
      />
    </div>
  );
}