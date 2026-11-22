import Link from "next/link";

import { cn } from "@/lib/utils";

/** Original OneAtlas mark: a globe-grid ("atlas") with a single highlighted node. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-6", className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="3.6" ry="9" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
      <path d="M3.4 9.2h17.2M3.4 14.8h17.2" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <circle cx="17.2" cy="6.8" r="2.1" className="fill-primary stroke-background" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring", className)}
      aria-label="OneAtlas home"
    >
      <LogoMark />
      <span className="text-[15px]">OneAtlas</span>
    </Link>
  );
}
