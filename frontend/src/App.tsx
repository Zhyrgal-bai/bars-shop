import { useState } from "react";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";

export default function App() {
  const [page, setPage] = useState<"home" | "cart">("home");

  return (
    <div>
      {/* навигация */}
      <div style={{ display: "flex", gap: 10, padding: 10 }}>
        <button onClick={() => setPage("home")}>Главная</button>
        <button onClick={() => setPage("cart")}>Корзина</button>
      </div>

      {/* страницы */}
      {page === "home" && <HomePage />}
      {page === "cart" && <CartPage />}
    </div>
  );
}