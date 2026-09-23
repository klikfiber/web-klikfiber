export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded';

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string,
): PaymentStatus {
  if (transactionStatus === 'settlement') return 'paid';
  if (transactionStatus === 'capture')
    return fraudStatus === 'accept' ? 'paid' : fraudStatus === 'deny' ? 'failed' : 'pending';
  if (transactionStatus === 'deny' || transactionStatus === 'failure') return 'failed';
  if (transactionStatus === 'cancel') return 'cancelled';
  if (transactionStatus === 'expire') return 'expired';
  if (transactionStatus === 'refund') return 'refunded';
  if (transactionStatus === 'partial_refund') return 'partially_refunded';
  return 'pending';
}

export const isTerminalPaymentStatus = (status: PaymentStatus) =>
  ['paid', 'failed', 'cancelled', 'expired', 'refunded'].includes(status);

// Provider callbacks can arrive twice or out of order. Never downgrade a
// settled/refunded payment to pending, nor resurrect a refunded payment.
export function acceptPaymentTransition(current: string, next: PaymentStatus) {
  if (current === next) return false;
  if (current === 'refunded') return false;
  if (current === 'partially_refunded') return next === 'refunded';
  if (current === 'paid') return next === 'refunded' || next === 'partially_refunded';
  if (['failed','cancelled','expired'].includes(current)) return next === 'paid';
  return true;
}
