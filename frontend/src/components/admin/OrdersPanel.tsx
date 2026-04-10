import { useCallback, useEffect, useState } from "react";
import {
  adminService,
  type AdminOrderListItem,
} from "../../services/admin.service";

function statusClass(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "-");
}

export default function OrdersPanel() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.listOrders();
      setOrders(data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить заказы");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <h2 className="admin-section-title">Заказы</h2>

      {error && (
        <div className="admin-form-error" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <p className="admin-empty-products">Загрузка…</p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="admin-empty-products">Заказов пока нет</p>
      )}

      {!loading && orders.length > 0 && (
        <div className="orders">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <h3>Заказ #{order.id}</h3>
              <p>Имя: {order.name}</p>
              <p>Телефон: {order.phone}</p>
              <p className={`status ${statusClass(order.status)}`}>
                {order.statusText}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
