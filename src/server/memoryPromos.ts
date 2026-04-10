export type PromoRecord = {
  code: string;
  discount: number;
  maxUses: number;
  used: number;
};

const promoCodes: PromoRecord[] = [];

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function addPromoRecord(
  code: string,
  discount: number,
  maxUses: number
): PromoRecord {
  const c = normalizePromoCode(code);
  if (!c) {
    throw new Error("EMPTY_CODE");
  }
  const d = Number(discount);
  const m = Number(maxUses);
  if (!Number.isFinite(d) || d < 0 || d > 100) {
    throw new Error("BAD_DISCOUNT");
  }
  if (!Number.isFinite(m) || m < 1 || !Number.isInteger(m)) {
    throw new Error("BAD_MAX_USES");
  }
  if (promoCodes.some((p) => p.code === c)) {
    throw new Error("DUPLICATE");
  }
  const row: PromoRecord = { code: c, discount: d, maxUses: m, used: 0 };
  promoCodes.push(row);
  return row;
}

export function listPromoRecords(): PromoRecord[] {
  return [...promoCodes];
}

export function deletePromoByCode(code: string): boolean {
  const c = normalizePromoCode(code);
  const i = promoCodes.findIndex((p) => p.code === c);
  if (i === -1) return false;
  promoCodes.splice(i, 1);
  return true;
}

/** Проверка и расчёт скидки без списания использования. */
export function tryApplyPromo(
  code: string,
  total: number
): { newTotal: number; discount: number } {
  const c = normalizePromoCode(code);
  if (!c) {
    throw new Error("EMPTY");
  }
  if (!Number.isFinite(total) || total < 0) {
    throw new Error("BAD_TOTAL");
  }
  const p = promoCodes.find((x) => x.code === c);
  if (!p) {
    throw new Error("NOT_FOUND");
  }
  if (p.used >= p.maxUses) {
    throw new Error("EXHAUSTED");
  }
  const discountAmount = total * (p.discount / 100);
  const newTotal = total - discountAmount;
  return { newTotal: Math.round(newTotal), discount: p.discount };
}

/** +1 к used после успешного оформления заказа. */
export function consumePromo(code: string): void {
  const c = normalizePromoCode(code);
  if (!c) {
    throw new Error("EMPTY");
  }
  const p = promoCodes.find((x) => x.code === c);
  if (!p) {
    throw new Error("NOT_FOUND");
  }
  if (p.used >= p.maxUses) {
    throw new Error("EXHAUSTED");
  }
  p.used += 1;
}
