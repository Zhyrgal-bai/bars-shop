import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  adminService,
  type AdminPaymentDetail,
} from "../../services/admin.service";

const PAYMENT_TYPES = ["mbank", "obank", "optima", "card", "qr"] as const;

function truncate(s: string, max = 48): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function PaymentDetailsPanel() {
  const [items, setItems] = useState<AdminPaymentDetail[]>([]);
  const [type, setType] = useState<string>(PAYMENT_TYPES[0]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await adminService.listPaymentDetails();
      setItems(data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить реквизиты");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isQr = type === "qr";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) {
      setError(isQr ? "Укажите URL картинки" : "Укажите значение");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminService.addPaymentDetail(type, v);
      setValue("");
      await load();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError("Нет прав");
      } else if (err instanceof Error && err.message.includes("Telegram")) {
        setError(err.message);
      } else {
        setError("Не удалось добавить");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminService.deletePaymentDetail(id);
      await load();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        alert("Нет прав");
      } else {
        alert("Не удалось удалить");
      }
    }
  };

  return (
    <>
      <h2 className="admin-section-title">Платёжные реквизиты</h2>

      <form className="admin-form admin-form--payment" onSubmit={handleSubmit}>
        {error && (
          <div className="admin-form-error" role="alert">
            {error}
          </div>
        )}

        <div className="admin-form-section">
          <label className="admin-field-label" htmlFor="pay-type">
            Тип
          </label>
          <select
            id="pay-type"
            className="admin-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-form-section">
          <label className="admin-field-label" htmlFor="pay-value">
            {isQr ? "URL картинки (QR)" : "Значение"}
          </label>
          <input
            id="pay-value"
            className="admin-input"
            placeholder={
              isQr
                ? "https://example.com/qr-code.png"
                : "Номер счёта / карты и т.д."
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode={isQr ? "url" : "text"}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="admin-submit-btn"
          disabled={loading}
        >
          {loading ? "Добавление…" : "Добавить"}
        </button>
      </form>

      <div className="admin-payments">
        {listLoading && (
          <p className="admin-empty-products">Загрузка…</p>
        )}
        {!listLoading && items.length === 0 && (
          <p className="admin-empty-products">Реквизиты не добавлены</p>
        )}
        {!listLoading &&
          items.map((p) => (
            <div key={p.id} className="admin-payment-row">
              <span className="admin-payment-line">
                <strong>{p.type.toUpperCase()}:</strong>{" "}
                <span className="admin-payment-value" title={p.value}>
                  {truncate(p.value)}
                </span>
              </span>
              <button
                type="button"
                className="delete"
                onClick={() => handleDelete(p.id)}
              >
                удалить
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
