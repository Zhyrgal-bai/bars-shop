import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import AdminPage from "./pages/AdminPage";
import { useState } from "react";
import { useCartStore } from "./store/useCartStore";
import "./App.css";

// Floating Cart Button Styling
const floatingCartStyle: React.CSSProperties = {
  position: "fixed",
  right: "22px",
  bottom: "24px",
  zIndex: 100,
  background: "#191919",
  color: "#fff",
  borderRadius: "50%",
  width: "56px",
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "2rem",
  boxShadow: "0 4px 18px rgba(22,18,14,0.13)",
  border: "none",
  cursor: "pointer",
  transition: "background 0.18s, box-shadow 0.18s, transform 0.19s",
};
const cartCountStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "8px",
  right: "10px",
  minWidth: "1.7em",
  height: "1.7em",
  background: "#ff575c",
  color: "#fff",
  borderRadius: "999px",
  fontSize: "0.97rem",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 6px 0 rgba(255,46,57,0.14)",
  pointerEvents: "none",
  border: "2px solid #fff",
  padding: "0 6px"
};

function isAdmin() {
  return true;
}

export default function App() {
  const [page, setPage] = useState<"home" | "cart" | "admin">("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const items = useCartStore((state) => state.items);

  const handleMenuToggle = () => setIsMenuOpen((prev) => !prev);
  const handleMenuClose = () => setIsMenuOpen(false);

  const handleNav = (target: "home" | "cart" | "admin") => {
    setPage(target);
    setIsMenuOpen(false);
  };

  // Floating cart button: always visible, opens cart
  const handleFloatingCartClick = () => {
    if (page !== "cart") {
      setPage("cart");
    }
    setIsMenuOpen(false);
  };

  return (
    <div className={`app${isMenuOpen ? " menu-open" : ""}`}>
      {/* Header */}
      <div className="header">
        <button className="burger" onClick={handleMenuToggle}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h1 className="logo">Barś</h1>
      </div>

      {/* Side Menu */}
      <div className={`side-menu${isMenuOpen ? " open" : ""}`}>
        <nav>
          <button className="menu-link" onClick={() => handleNav("home")}>
            Главная
          </button>
          <button className="menu-link" onClick={() => handleNav("cart")}>
            Корзина
          </button>
          {isAdmin() && (
            <button className="menu-link" onClick={() => handleNav("admin")}>
              Админка
            </button>
          )}
        </nav>
      </div>

      {/* Overlay */}
      {isMenuOpen && <div className="overlay" onClick={handleMenuClose}></div>}

      {/* Content */}
      <div className="content">
        {page === "home" && <HomePage />}
        {page === "cart" && <CartPage />}
        {page === "admin" && <AdminPage />}
      </div>

      {/* Floating Cart Button */}
      <button
        className="floating-cart"
        style={floatingCartStyle}
        onClick={handleFloatingCartClick}
        aria-label="Открыть корзину"
      >
        <span role="img" aria-label="Cart" style={{fontWeight: 400}}>🛒</span>
        {items.length > 0 && (
          <span className="cart-count" style={cartCountStyle}>{items.length}</span>
        )}
      </button>
    </div>
  );
}