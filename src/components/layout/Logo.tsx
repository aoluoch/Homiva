import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "nav";
}) {
  return (
    <Link
      to="/"
      className={cn("flex shrink-0 items-center rounded-md", className)}
      aria-label="Homiva home"
    >
      <span
        className={cn(
          "relative overflow-hidden rounded-md border bg-white shadow-sm",
          size === "nav"
            ? "h-9 w-[8.25rem] sm:h-10 sm:w-36 lg:h-11 lg:w-40 xl:h-12 xl:w-48"
            : "h-10 w-40 sm:h-12 sm:w-52",
        )}
      >
        <img
          src="/homiva_logo.jpg"
          alt="Homiva"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
        />
      </span>
    </Link>
  );
}
