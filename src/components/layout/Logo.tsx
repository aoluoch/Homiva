import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            d="M12 3 21 11 h-2.2 V21 h-5 v-6 h-3.6 v6 h-5 V11 H3 Z"
            fill="currentColor"
          />
          <circle cx="12" cy="9.2" r="1.6" fill="hsl(24 95% 53%)" />
        </svg>
      </span>
      {showText && (
        <span className="text-xl font-extrabold tracking-tight">
          Hom<span className="text-primary">iva</span>
        </span>
      )}
    </Link>
  );
}
