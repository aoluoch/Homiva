import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({
  className,
}: {
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn("flex items-center rounded-md", className)}
      aria-label="Homiva home"
    >
      <span className="grid h-12 w-48 overflow-hidden rounded-md border bg-white shadow-sm sm:w-52">
        <img
          src="/homiva_logo.jpg"
          alt="Homiva"
          className="h-full w-full object-cover object-center"
          loading="eager"
        />
      </span>
    </Link>
  );
}
