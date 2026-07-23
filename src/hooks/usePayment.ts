import { useMutation } from "@tanstack/react-query";
import { functions } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import {
  newReference,
  openPaystackCheckout,
} from "@/lib/paystack";
import type { PaymentPurpose } from "@/types/models";

export interface PayArgs {
  purpose: PaymentPurpose;
  amountKES: number;
  /** Purpose-specific data forwarded to the fulfillment function. */
  metadata?: Record<string, unknown>;
}

interface VerifyResponse {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

/** Verify a Paystack reference server-side and fulfill the purchase. */
async function verifyPayment(payload: {
  reference: string;
  purpose: PaymentPurpose;
  metadata?: Record<string, unknown>;
}): Promise<VerifyResponse> {
  const execution = await functions.createExecution({
    functionId: appwriteConfig.functions.payments,
    body: JSON.stringify(payload),
    async: false,
  });

  let parsed: VerifyResponse = {};
  try {
    parsed = JSON.parse(execution.responseBody || "{}");
  } catch {
    throw new Error("Unexpected response from the payments service.");
  }
  if (!parsed.ok) {
    throw new Error(parsed.error || "Payment could not be verified.");
  }
  return parsed;
}

/**
 * Unified Paystack payment flow:
 *  1. Open the Paystack popup (public key, client-side).
 *  2. On success, verify the transaction server-side via the
 *     `homiva-payments` function, which records the payment and fulfills it
 *     (unlock property / confirm booking / activate subscription / etc.).
 */
export function usePayment() {
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ purpose, amountKES, metadata }: PayArgs) => {
      if (!user) throw new Error("You must be logged in to pay.");
      const email = profile?.email ?? user.email;
      const reference = newReference();

      await openPaystackCheckout({
        email,
        amountKES,
        reference,
        metadata: { purpose, ...metadata },
      });

      return verifyPayment({ reference, purpose, metadata });
    },
  });
}
