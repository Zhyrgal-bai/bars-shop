import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Product } from "../types";
import ProductGrid from "../components/product/ProductGrid";
import "../components/ui/HomePage.css";
import "../components/ui/Toast.css";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/products");
        setProducts(res.data || []);
      } catch (e) {
        console.log(e);
        setProducts([]);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="home-page">
      {/* Premium minimal hero section */}
      <section className="hero">
        <h1 className="hero-title">BARŚ</h1>
        <p className="hero-subtitle">Одежда</p>
      </section>
      <div className="hero-bottom-spacer" />
      <ProductGrid products={products} showToast={showToast} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}