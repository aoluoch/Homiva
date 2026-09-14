import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollableTabs({
  children,
  className,
  sticky = false,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
        sticky
          ? "sticky top-16 z-30 -mx-4 mb-1 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:mx-0 sm:px-0"
          : "-mx-4 px-4 pb-2 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
