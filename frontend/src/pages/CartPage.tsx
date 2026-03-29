import { useCartStore } from "../store/useCartStore";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotal = useCartStore((state) => state.getTotal);

  const handleOrder = async () => {
    const total = getTotal();

    const res = await fetch("http://localhost:3000/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: {
          telegramId: 1,
          name: "Ali",
        },
        items,
        total,
      }),
    });

    const data = await res.json();

    console.log("ORDER CREATED:", data);

    clearCart();
    alert("Заказ оформлен ✅");
  };

  return (
    <div className="p-4">
      <h1>Корзина 🛒</h1>

      {items.map((item, i) => (
        <div key={i} className="border p-2 mb-2">
          <p>{item.name}</p>
          <p>
            {item.color} / {item.size}
          </p>
          <p>{item.price} сом</p>
        </div>
      ))}

      <h2>Итого: {getTotal()} сом</h2>

      <button
        onClick={handleOrder}
        className="bg-black text-white w-full py-2 mt-4"
      >
        Оформить заказ
      </button>
    </div>
  );
}