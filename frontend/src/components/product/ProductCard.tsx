import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, Size } from "../../types";
import { useCartStore } from "../../store/useCartStore";
import {
  getEffectiveColorKey,
  getEffectiveSizeKey,
  getSizesListForSelection,
  validateAddToCartInput,
} from "../../utils/cartAddValidation";
import {
  getDiscountPercent,
  getEffectivePrice,
  getNormalizedVariants,
  getPrimaryImage,
  isOutOfStock,
} from "../../utils/product";
import { getVariantCssBackground } from "../../utils/variantColor";
import "../ui/ProductCard.css";

type Props = {
  product: Product;
  showToast: (msg: string) => void;
  /** Открыть карточку товара (модалка на витрине). */
  onOpenDetail?: (product: Product) => void;
};

export default function ProductCard({ product, showToast, onOpenDetail }: Props) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const hasCustomColors = Boolean(
    (product.colors && product.colors.length > 0) ||
      (product.variants && product.variants.length > 0)
  );

  const colorItems = useMemo(() => {
    if (product.colors && product.colors.length > 0) {
      const anyIn = product.sizes?.length
        ? product.sizes.some((s) => s.stock > 0)
        : !isOutOfStock(product);
      return product.colors.map((c) => ({
        name: c.name,
        hex: c.hex,
        disabled: !anyIn,
      }));
    }
    if (product.variants && product.variants.length > 0) {
      return product.variants.map((v) => ({
        name: v.color,
        hex: getVariantCssBackground(v),
        disabled: !v.sizes?.some((s) => (s.stock ?? 0) > 0),
      }));
    }
    return [];
  }, [product]);

  const sizes = useMemo<Size[]>(() => {
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes;
    }
    if (product.variants && product.variants.length > 0) {
      const v = selectedColor
        ? product.variants.find((x) => x.color === selectedColor)
        : product.variants[0];
      if (v?.sizes?.length) {
        return v.sizes;
      }
      return [];
    }
    const v0 = getNormalizedVariants(product)[0];
    if (v0?.sizes?.length) {
      return v0.sizes;
    }
    return [{ size: "M", stock: 10 }];
  }, [product, selectedColor]);

  const outOfStock = isOutOfStock(product);

  const images = useMemo(
    () =>
      product.images && product.images.length > 0
        ? product.images
        : [product.image],
    [product]
  );

  const lineColor = useMemo(
    () => getEffectiveColorKey(product, selectedColor),
    [product, selectedColor]
  );

  const effectiveSize = useMemo(
    () => getEffectiveSizeKey(product, selectedColor, selectedSize),
    [product, selectedColor, selectedSize]
  );

  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    setSelectedSize(null);
    setSelectedColor(null);
    setCurrentIndex(0);
  }, [product.id]);

  useEffect(() => {
    const v = product.variants;
    if (!v?.length) {
      if (product.colors && product.colors.length === 1) {
        setSelectedColor(product.colors[0]!.name);
      }
      return;
    }
    if (v.length === 1) {
      const only = v[0]!;
      setSelectedColor(
        only.sizes?.some((s) => s.stock > 0) ? only.color : only.color
      );
    } else {
      setSelectedColor(null);
    }
  }, [product.id, product.variants, product.colors]);

  useEffect(() => {
    const c = getEffectiveColorKey(product, selectedColor);
    if (c == null) return;
    const list = getSizesListForSelection(product, c);
    if (list.length > 1 && selectedSize && !list.some((s) => s.size === selectedSize)) {
      setSelectedSize(null);
    }
  }, [product, selectedColor, selectedSize]);

  useEffect(() => {
    const c = getEffectiveColorKey(product, selectedColor);
    if (c == null) return;
    const list = getSizesListForSelection(product, c);
    if (list.length === 1) {
      setSelectedSize((prev) => (prev === list[0]!.size ? prev : list[0]!.size));
    }
  }, [product.id, product, selectedColor]);

  useEffect(() => {
    setCurrentIndex((i) =>
      images.length === 0 ? 0 : Math.min(i, images.length - 1)
    );
  }, [images.length]);

  const selectedStock = useMemo(() => {
    const c = getEffectiveColorKey(product, selectedColor);
    if (c == null) return 0;
    const s = getEffectiveSizeKey(product, selectedColor, selectedSize);
    if (s == null) return 0;
    return getSizesListForSelection(product, c).find((x) => x.size === s)
      ?.stock ?? 0;
  }, [product, selectedColor, selectedSize]);

  const cartItem = useMemo(() => {
    if (effectiveSize == null || lineColor === null) return null;
    return (
      items.find(
        (i) =>
          i.productId === product.id &&
          i.color === lineColor &&
          i.size === effectiveSize
      ) ?? null
    );
  }, [items, product.id, effectiveSize, lineColor]);

  const quantity = cartItem?.quantity ?? 0;

  const discountPct = getDiscountPercent(product);
  const displayPrice = getEffectivePrice(product);

  const upsertQuantity = (nextQuantity: number) => {
    const v = validateAddToCartInput(
      product,
      selectedSize,
      selectedColor,
      outOfStock
    );
    if (!v.ok) return;
    if (v.stock <= 0) return;

    const lineMatch =
      items.find(
        (i) =>
          i.productId === product.id &&
          i.color === v.color &&
          i.size === v.size
      ) ?? null;
    if (lineMatch) removeItem(lineMatch);
    if (nextQuantity <= 0) return;

    const capped = Math.min(nextQuantity, v.stock);
    addItem({
      productId: product.id!,
      name: product.name,
      price: displayPrice,
      image: getPrimaryImage(product),
      size: v.size,
      color: v.color,
      quantity: capped,
    });
  };

  const canAdjustQty =
    !outOfStock &&
    effectiveSize != null &&
    lineColor != null &&
    selectedStock > 0;

  const handleAddToCart = () => {
    const r = validateAddToCartInput(
      product,
      selectedSize,
      selectedColor,
      outOfStock
    );
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    upsertQuantity(1);
    showToast("Добавлено в корзину");
  };

  const handleIncrement = () => {
    if (quantity >= selectedStock) return;
    upsertQuantity(quantity + 1);
  };

  const handleDecrement = () => {
    upsertQuantity(quantity - 1);
  };

  const atMaxQty = quantity >= selectedStock && selectedStock > 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || images.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 40;
    if (dx < -threshold) {
      setCurrentIndex((i) => Math.min(i + 1, images.length - 1));
    } else if (dx > threshold) {
      setCurrentIndex((i) => Math.max(i - 1, 0));
    }
    touchStartX.current = null;
  };

  const openDetail = () => {
    if (onOpenDetail) onOpenDetail(product);
  };

  return (
    <div
      className={
        `product-card flex h-full min-h-0 flex-col${outOfStock ? " out" : ""}`
      }
    >
      <div
        className={`product-image-wrapper${onOpenDetail ? " product-image-wrapper--detail" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => onOpenDetail && openDetail()}
        onKeyDown={(e) => {
          if (!onOpenDetail) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetail();
          }
        }}
        role={onOpenDetail ? "button" : undefined}
        tabIndex={onOpenDetail ? 0 : undefined}
        aria-label={onOpenDetail ? "Подробнее о товаре" : undefined}
      >
        {/* Instagram: шаг = currentIndex × (100% / n) ширины трека; строка «−index×100%» без деления сдвинула бы на n слайдов за раз */}
        <div
          className="image-slider"
          style={
            {
              ["--slide-count" as string]: images.length,
              width: "calc(var(--slide-count) * 100%)",
              transform: `translateX(calc(-${currentIndex} * 100% / var(--slide-count)))`,
            } as React.CSSProperties
          }
        >
          {images.map((img, index) => (
            <div key={index} className="image-slide">
              <img src={img} alt="" />
            </div>
          ))}
        </div>

        <div className="dots">
          {images.map((_, i) => (
            <span
              key={i}
              className={i === currentIndex ? "active" : ""}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
            />
          ))}
        </div>
      </div>

      <div className="product-info flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3
          className={`product-title${onOpenDetail ? " product-title--detail" : ""}`}
          onClick={onOpenDetail ? openDetail : undefined}
          onKeyDown={
            onOpenDetail
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDetail();
                  }
                }
              : undefined
          }
          role={onOpenDetail ? "button" : undefined}
          tabIndex={onOpenDetail ? 0 : undefined}
        >
          {product.name}
        </h3>

        {outOfStock ? (
          <div className="out-of-stock">Нет в наличии</div>
        ) : (
          <>
            <div className="product-stock-status product-stock-status--in">
              В наличии
            </div>
            {hasCustomColors && colorItems.length > 0 && (
              <div className="colors">
                {colorItems.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    disabled={c.disabled}
                    aria-label={
                      c.disabled ? `${c.name} (нет в наличии)` : c.name
                    }
                    style={{ background: c.hex }}
                    className={selectedColor === c.name ? "active" : ""}
                    onClick={() => {
                      if (!c.disabled) setSelectedColor(c.name);
                    }}
                  />
                ))}
              </div>
            )}
            <div className="sizes">
              {sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  disabled={s.stock === 0}
                  className={selectedSize === s.size ? "active" : ""}
                  onClick={() => setSelectedSize(s.size)}
                >
                  {s.size}
                </button>
              ))}
            </div>
          </>
        )}

        {!outOfStock && (
          <div className="product-info-footer mt-auto flex w-full min-w-0 flex-col gap-2">
            <div className="product-price-block w-full min-w-0">
              {discountPct > 0 ? (
                <>
                  <span className="product-price-old" aria-label="Без скидки">
                    {product.price}{" "}
                    <span className="product-price-currency">сом</span>
                  </span>
                  <span className="product-price product-price--sale text-lg sm:text-xl">
                    {displayPrice}{" "}
                    <span className="product-price-currency">сом</span>
                  </span>
                </>
              ) : (
                <span className="product-price text-lg sm:text-xl">
                  {product.price}{" "}
                  <span className="product-price-currency">сом</span>
                </span>
              )}
            </div>

            <div className="product-cta w-full min-w-0">
              {quantity <= 0 ? (
                <button
                  className="product-add-btn w-full rounded-lg py-3 text-center text-xs font-bold uppercase tracking-wide"
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  type="button"
                >
                  Добавить
                </button>
              ) : (
                <div className="product-actions flex w-full items-center justify-center gap-2">
                  <button
                    className="product-action-btn"
                    onClick={handleDecrement}
                    disabled={!canAdjustQty}
                    type="button"
                    aria-label="Уменьшить"
                  >
                    -
                  </button>
                  <span className="product-qty" aria-label="Количество">
                    {quantity}
                  </span>
                  <button
                    className="product-action-btn"
                    onClick={handleIncrement}
                    disabled={!canAdjustQty || atMaxQty}
                    type="button"
                    aria-label="Увеличить"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
