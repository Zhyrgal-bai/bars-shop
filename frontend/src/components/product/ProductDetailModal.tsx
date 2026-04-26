import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product, ProductColor, Size } from "../../types";
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
  getProductImages,
  isOutOfStock,
} from "../../utils/product";
import { getVariantCssBackground } from "../../utils/variantColor";
import "./ProductDetailModal.css";

type ShowToast = (msg: string) => void;

type ModalProps = {
  product: Product | null;
  onClose: () => void;
  showToast: ShowToast;
};

function ProductDetailContent({
  product,
  onClose,
  showToast,
}: {
  product: Product;
  onClose: () => void;
  showToast: ShowToast;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const hasCustomColors = Boolean(
    (product.colors && product.colors.length > 0) ||
      (product.variants && product.variants.length > 0)
  );

  const colorItems: (ProductColor & { disabled: boolean })[] = useMemo(() => {
    if (product.colors && product.colors.length > 0) {
      const flatInStock = product.sizes?.some((s) => s.stock > 0) ?? !isOutOfStock(product);
      return product.colors.map((c) => ({
        name: c.name,
        hex: c.hex,
        disabled: !flatInStock,
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
  const images = useMemo(() => getProductImages(product), [product]);
  const lineColor = useMemo(
    () => getEffectiveColorKey(product, selectedColor),
    [product, selectedColor]
  );

  const effectiveSize = useMemo(
    () => getEffectiveSizeKey(product, selectedColor, selectedSize),
    [product, selectedColor, selectedSize]
  );

  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const items = useCartStore((s) => s.items);

  const discountPct = getDiscountPercent(product);
  const displayPrice = getEffectivePrice(product);
  const hasSale = discountPct > 0 && displayPrice < product.price;

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

  useEffect(() => {
    setImgIndex(0);
    setSelectedSize(null);
    setSelectedColor(null);
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
      setSelectedColor(v[0]!.color);
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

  const upsertQuantity = useCallback(
    (nextQuantity: number) => {
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
    },
    [addItem, removeItem, items, displayPrice, outOfStock, product, selectedSize, selectedColor]
  );

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

  const handleInc = () => {
    if (quantity >= selectedStock) return;
    upsertQuantity(quantity + 1);
  };

  const handleDec = () => {
    upsertQuantity(quantity - 1);
  };

  const atMax = quantity >= selectedStock && selectedStock > 0;

  const heroSrc = images[Math.min(imgIndex, Math.max(0, images.length - 1))];
  const hasImages = images.length > 0;

  const goPrevImage = () => {
    if (images.length <= 1) return;
    setImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  const goNextImage = () => {
    if (images.length <= 1) return;
    setImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const desc = product.description?.trim();

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdm-title"
      className="pdm-panel"
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 18 }}
      transition={{ type: "spring", damping: 28, stiffness: 340 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="pdm-close"
        aria-label="Закрыть"
        onClick={onClose}
      >
        ✕
      </button>

      <div className="pdm-body">
        <div className="pdm-gallery">
          {heroSrc ? (
            <>
              <div
                className="pdm-gallery-swipe"
                onTouchStart={(e) => {
                  touchStartXRef.current = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  if (touchStartXRef.current == null || images.length <= 1) return;
                  const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
                  const delta = touchStartXRef.current - endX;
                  if (delta > 50) goNextImage();
                  if (delta < -50) goPrevImage();
                  touchStartXRef.current = null;
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={heroSrc}
                    src={heroSrc}
                    alt={product.name}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  />
                </AnimatePresence>
              </div>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="pdm-gallery-nav pdm-gallery-nav--left"
                    onClick={goPrevImage}
                    aria-label="Предыдущее фото"
                  >
                    &#x2039;
                  </button>
                  <button
                    type="button"
                    className="pdm-gallery-nav pdm-gallery-nav--right"
                    onClick={goNextImage}
                    aria-label="Следующее фото"
                  >
                    &#x203A;
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="pdm-gallery-placeholder">Нет фото</div>
          )}
        </div>

        {hasImages && (
          <div className="pdm-dots" role="tablist" aria-label="Фото">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`pdm-dot${i === imgIndex ? " pdm-dot--active" : ""}`}
                aria-label={`Фото ${i + 1}`}
                aria-selected={i === imgIndex}
                onClick={() => setImgIndex(i)}
              />
            ))}
          </div>
        )}

        {product.category ? (
          <span className="pdm-badge">
            {product.category.parent?.name
              ? `${product.category.parent.name} / ${product.category.name}`
              : product.category.name}
          </span>
        ) : null}

        <h2 id="pdm-title" className="pdm-title">
          {product.name}
        </h2>

        <div
          className={
            "pdm-stock" + (outOfStock ? " pdm-stock--out" : " pdm-stock--in")
          }
        >
          {outOfStock ? "Нет в наличии" : "В наличии"}
        </div>

        <div className="pdm-price-block">
          {hasSale ? (
            <>
              <div className="pdm-price-old" aria-label="Старая цена">
                <span className="pdm-price-old-num">{product.price}</span>
                <span className="pdm-price-cur">сом</span>
              </div>
              <div className="pdm-price-main" aria-label="Цена">
                {displayPrice}
                <span className="pdm-price-cur">сом</span>
              </div>
            </>
          ) : (
            <div className="pdm-price-main pdm-price-main--one" aria-label="Цена">
              {product.price}
              <span className="pdm-price-cur">сом</span>
            </div>
          )}
        </div>

        <p
          className={
            "pdm-desc" + (desc ? "" : " pdm-desc--empty")
          }
        >
          {desc ? desc : "Скоро появится описание"}
        </p>

        {!outOfStock && hasCustomColors && colorItems.length > 0 && (
          <div className="pdm-pick pdm-pick--color">
            <h3 className="pdm-pick-title">Цвет</h3>
            <div className="pdm-swatch-row">
              {colorItems.map((c) => {
                const active = selectedColor === c.name;
                return (
                  <div key={c.name} className="pdm-swatch-wrap">
                    <button
                      type="button"
                      title={c.name}
                      className={
                        "pdm-swatch" +
                        (active ? " pdm-swatch--active" : "") +
                        (c.disabled ? " pdm-swatch--disabled" : "")
                      }
                      style={{ background: c.hex }}
                      disabled={c.disabled}
                      aria-pressed={active}
                      aria-label={c.name}
                      onClick={() => {
                        if (!c.disabled) setSelectedColor(c.name);
                      }}
                    />
                    {c.disabled && (
                      <span className="pdm-swatch-line" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!outOfStock && sizes.length > 0 && (
          <div className="pdm-pick pdm-pick--size">
            <h3 className="pdm-pick-title">Размер</h3>
            <div className="pdm-size-row">
              {sizes.map((s) => {
                const active = selectedSize === s.size;
                const dis = s.stock === 0;
                return (
                  <button
                    key={s.size}
                    type="button"
                    className={
                      "pdm-size-btn" +
                      (active ? " pdm-size-btn--active" : "") +
                      (dis ? " pdm-size-btn--disabled" : "")
                    }
                    disabled={dis}
                    onClick={() => {
                      if (!dis) setSelectedSize(s.size);
                    }}
                  >
                    {s.size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="pdm-footer">
        {quantity <= 0 ? (
          <button
            type="button"
            className="pdm-add-btn"
            onClick={handleAddToCart}
            disabled={outOfStock}
          >
            Добавить в корзину
          </button>
        ) : (
          <div className="pdm-qty-row">
            <button
              type="button"
              className="pdm-qty-btn"
              onClick={handleDec}
              disabled={!canAdjustQty}
              aria-label="Меньше"
            >
              −
            </button>
            <span className="pdm-qty-val">{quantity}</span>
            <button
              type="button"
              className="pdm-qty-btn"
              onClick={handleInc}
              disabled={!canAdjustQty || atMax}
              aria-label="Больше"
            >
              +
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ProductDetailModal({
  product,
  onClose,
  showToast,
}: ModalProps) {
  const open = product != null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && product && (
        <motion.div
          className="pdm-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <ProductDetailContent
            key={product.id}
            product={product}
            onClose={onClose}
            showToast={showToast}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
