type Props = {
  visible: boolean;
  totalQuantity: number;
  onOpen: () => void;
};

/**
 * Плавающая корзина: фиксированно снизу справа (как в магазинах), не перекрывает сетку за счёт pb у home.
 */
export default function FloatingCart({
  visible,
  totalQuantity,
  onOpen,
}: Props) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className="floating-cart cart-float"
      onClick={onOpen}
      aria-label="Открыть корзину"
    >
      <div className="cart-icon">
        🛒
        {totalQuantity > 0 && (
          <span className="cart-badge">{totalQuantity}</span>
        )}
      </div>
    </button>
  );
}
