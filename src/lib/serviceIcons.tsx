import {
  Armchair,
  Bug,
  Hammer,
  PaintRoller,
  ShieldCheck,
  Sparkles,
  Trees,
  Truck,
  Wrench,
  Zap,
  Wrench as Fallback,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Sparkles,
  Wrench,
  Zap,
  PaintRoller,
  Bug,
  Truck,
  Trees,
  Hammer,
  ShieldCheck,
  Armchair,
};

/** Resolve a Lucide icon component from a config icon name. */
export function serviceIcon(name: string): LucideIcon {
  return MAP[name] ?? Fallback;
}
