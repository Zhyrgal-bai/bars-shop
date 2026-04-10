export type PaymentDetailRecord = {
  id: number;
  type: string;
  value: string;
};

const paymentDetails: PaymentDetailRecord[] = [];
let paymentId = 1;

export function addPaymentDetail(
  type: string,
  value: string
): PaymentDetailRecord {
  const row: PaymentDetailRecord = {
    id: paymentId++,
    type: type.trim(),
    value: String(value).trim(),
  };
  paymentDetails.push(row);
  return row;
}

export function listPaymentDetails(): PaymentDetailRecord[] {
  return [...paymentDetails];
}

export function deletePaymentDetail(id: number): boolean {
  const i = paymentDetails.findIndex((p) => p.id === id);
  if (i === -1) return false;
  paymentDetails.splice(i, 1);
  return true;
}
