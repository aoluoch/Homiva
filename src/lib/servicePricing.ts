import {
  SERVICE_CATEGORIES,
  SERVICE_SIZE_TIERS,
  SERVICE_URGENCY,
  type ServiceSizeKey,
  type ServiceUrgencyKey,
} from "./config";

export interface EstimateInput {
  categoryKey: string;
  size: ServiceSizeKey;
  urgency: ServiceUrgencyKey;
  /** Number of uploaded photos (more detail => slightly wider high end). */
  photoCount?: number;
}

export interface PriceEstimate {
  min: number;
  max: number;
  base: number;
  /** Mid-point estimate. */
  point: number;
}

/**
 * Transparent, rule-based estimate (no AI, per PRD).
 *   price = baseFee x sizeMultiplier x (1 + urgencySurcharge)
 * A range is returned (-15% / +25%) to reflect on-site variability.
 */
export function estimatePrice(input: EstimateInput): PriceEstimate {
  const category = SERVICE_CATEGORIES.find((c) => c.key === input.categoryKey);
  const base = category?.baseFee ?? 1000;
  const sizeMult =
    SERVICE_SIZE_TIERS.find((s) => s.key === input.size)?.multiplier ?? 1;
  const surcharge =
    SERVICE_URGENCY.find((u) => u.key === input.urgency)?.surcharge ?? 0;

  const point = Math.round(base * sizeMult * (1 + surcharge));
  const min = Math.round(point * 0.85);
  // A little extra headroom on the high end when many photos hint at scope.
  const photoFactor = Math.min((input.photoCount ?? 0) * 0.02, 0.15);
  const max = Math.round(point * (1.25 + photoFactor));

  return { min, max, base, point };
}
