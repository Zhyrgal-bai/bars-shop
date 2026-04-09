import { useState } from "react";
import type { Product, Variant, Size } from "../../types";
import { useCartStore } from "../../store/useCartStore";
import "../ui/ProductCard.css";
import "../ui/Toast.css"; // Import toast styles

type Props = {
  product: Product;
  showToast: (msg: string) => void;
};

export default function ProductCard({ product, showToast }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<Variant>(
    product.variants[0]
  );
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);

  const addItem = useCartStore((state) => state.addItem);

  // Use prop-based global toast
  const handleAddToCart = () => {
    if (!selectedSize) return;

    addItem({
      productId: product.id!,
      name: product.name,
      price: product.price,
      size: selectedSize.size,
      color: selectedVariant.color,
      quantity: 1,
    });

    showToast("Добавлено в корзину");
  };

  // Mouse interaction logic for button scale
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedSize) {
      e.currentTarget.classList.add('btnPressed');
    }
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedSize) {
      e.currentTarget.classList.remove('btnPressed');
    }
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedSize) {
      e.currentTarget.classList.remove('btnPressed');
    }
  };

  return (
    <>
      <div className="card">
        <img
          src={product.image}
          className="img card-img"
          alt={product.name}
        />
        <div className="card-body">
          <div className="card-titleWrap">
            <h3 className="title card-title">
              {product.name}
            </h3>
          </div>
          <div className="card-priceWrap">
            <span className="price card-price">
              {product.price} <span className="price-currency">сом</span>
            </span>
          </div>
          {/* COLORS */}
          <div className="colors card-colors">
            {product.variants.map((v) => (
              <button
                key={v.color}
                onClick={() => {
                  setSelectedVariant(v);
                  setSelectedSize(null);
                }}
                className={
                  "colorBtn" +
                  (selectedVariant.color === v.color ? " colorActive" : "")
                }
              >
                {v.color}
              </button>
            ))}
          </div>
          {/* SIZES */}
          <div className="sizes card-sizes">
            {selectedVariant.sizes.map((s) => {
              const isActive = selectedSize?.size === s.size;
              const isDisabled = s.stock === 0;
              return (
                <button
                  key={s.size}
                  disabled={isDisabled}
                  onClick={() => setSelectedSize(s)}
                  className={
                    "sizeBtn" +
                    (isActive ? " sizeActive" : "") +
                    (isDisabled ? " disabled" : "")
                  }
                >
                  {s.size}
                </button>
              );
            })}
          </div>
        </div>
        {/* BUTTON */}
        <button
          disabled={!selectedSize}
          onClick={handleAddToCart}
          className={
            "btn card-btn " +
            (selectedSize ? "btnActive" : "btnDisabled")
          }
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {selectedSize ? "Добавить в корзину" : "Выберите размер"}
        </button>
      </div>
      {/* Toast is now handled globally via props; local toast removed */}
    </>
  );
}