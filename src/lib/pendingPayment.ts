import type { PaymentPurpose } from "@/types/models";

const STORAGE_KEY = "homiva.pendingPayment";

export interface PendingPayment {
  reference: string;
  purpose: PaymentPurpose;
  metadata?: Record<string, unknown>;
}

export function savePendingPayment(payment: PendingPayment) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payment));
  } catch {
    // Private mode or disabled storage must not block checkout.
  }
}

export function loadPendingPayment(): PendingPayment | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPayment;
    if (!parsed?.reference || !parsed?.purpose) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
