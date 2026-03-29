import { useEffect, useState } from "react";
import { getProducts } from "../services/api";
import type { Product } from "../types";
import ProductGrid from "../components/product/ProductGrid";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  return (
    <div className="p-4">
      <h1>Bars 👕</h1>

      <ProductGrid products={products} />
    </div>
  );
}