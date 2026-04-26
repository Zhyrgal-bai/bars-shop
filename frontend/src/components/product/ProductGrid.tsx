import type { Product } from "../../types";
import ProductCard from "./ProductCard";

const gridClass =
  "mx-auto grid w-full max-w-7xl grid-cols-1 content-start items-stretch gap-4 " +
  "sm:grid-cols-2";

const emptyClass =
  "col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-[20px] " +
  "border border-white/10 bg-white/[0.04] p-8 text-center mx-0";

type ProductGridProps = {
  products: Product[];
  catalogProductCount: number;
  showToast: (msg: string) => void;
  onProductSelect?: (product: Product) => void;
};

export default function ProductGrid({
  products,
  catalogProductCount,
  showToast,
  onProductSelect,
}: ProductGridProps) {
  if (catalogProductCount === 0) {
    return (
      <div className={gridClass} role="status">
        <div className={emptyClass}>
          <p className="m-0 mb-2 font-display text-[1.05rem] font-semibold uppercase tracking-wider text-white/95">
            Скоро появятся товары 🔥
          </p>
          <p className="m-0 text-sm text-white/70">Загляните позже</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={gridClass} role="status">
        <div className={emptyClass}>
          <p className="m-0 mb-2 font-display text-[1.05rem] font-semibold uppercase tracking-wider text-white/95">
            Ничего не найдено
          </p>
          <p className="m-0 text-sm text-white/70">Смените категорию или поиск</p>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          showToast={showToast}
          onOpenDetail={onProductSelect}
        />
      ))}
    </div>
  );
}
