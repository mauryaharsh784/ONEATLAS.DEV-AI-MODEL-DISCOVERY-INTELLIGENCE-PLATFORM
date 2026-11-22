import { cn } from "@/lib/utils";

/** Pulse + a slow highlight sweep. The sweep is disabled automatically by the global reduced-motion rule. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("skeleton-shimmer rounded-md bg-muted/70", className)} {...props} />;
}

export { Skeleton };
