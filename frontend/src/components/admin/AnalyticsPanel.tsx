import { useCallback, useEffect, useState } from "react";
import { adminService } from "../../services/admin.service";

export default function AnalyticsPanel() {
  const [data, setData] = useState<{
    totalOrders: number;
    totalRevenue: number;
    accepted: number;
    done: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const a = await adminService.getAnalytics();
      setData(a);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить аналитику");
      setData(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="analytics analytics--error" role="alert">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="analytics analytics--loading">…</div>;
  }

  return (
    <div className="analytics">
      <div>💰 {data.totalRevenue} сом</div>
      <div>📦 {data.totalOrders}</div>
      <div>🟢 {data.accepted}</div>
      <div>🔴 {data.done}</div>
    </div>
  );
}
