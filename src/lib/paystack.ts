import { paystackConfig } from "./config";

const PAYSTACK_SRC = "https://js.paystack.co/v1/inline.js";

interface PaystackHandler {
  openIframe: () => void;
}

interface PaystackPop {
  setup: (options: Record<string, unknown>) => PaystackHandler;
}

declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

let loader: Promise<void> | null = null;

/** Lazily inject the Paystack inline script (once). */
export function loadPaystack(): Promise<void> {
  if (typeof window !== "undefined" && window.PaystackPop) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAYSTACK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("Failed to load Paystack. Check your connection."));
    };
    document.body.appendChild(script);
  });
  return loader;
}

export interface CheckoutParams {
  email: string;
  /** Amount in KES (major unit). Converted to subunits internally. */
  amountKES: number;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResult {
  reference: string;
}

/**
 * Open the Paystack popup and resolve with the transaction reference on
 * success, or reject if the user closes the modal.
 */
export async function openPaystackCheckout(
  params: CheckoutParams,
): Promise<CheckoutResult> {
  if (!paystackConfig.publicKey) {
    throw new Error(
      "Paystack public key not configured. Set VITE_PAYSTACK_PUBLIC_KEY in your .env.",
    );
  }
  await loadPaystack();
  const Pop = window.PaystackPop;
  if (!Pop) throw new Error("Paystack failed to initialise.");

  return new Promise<CheckoutResult>((resolve, reject) => {
    const handler = Pop.setup({
      key: paystackConfig.publicKey,
      email: params.email,
      amount: Math.round(params.amountKES * 100),
      currency: paystackConfig.currency,
      ref: params.reference,
      metadata: params.metadata ?? {},
      callback: (response: { reference: string }) => {
        resolve({ reference: response.reference });
      },
      onClose: () => {
        reject(new Error("Payment cancelled."));
      },
    });
    handler.openIframe();
  });
}

/** Generate a unique, human-readable transaction reference. */
export function newReference(prefix = "HOMIVA"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
