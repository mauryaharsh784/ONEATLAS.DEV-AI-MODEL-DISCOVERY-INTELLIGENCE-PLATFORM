"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV } from "@/lib/constants/features";
import { cn } from "@/lib/utils";

export function SiteNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav aria-label="Primary" className="hidden h-full items-stretch gap-1 lg:flex">
      {NAV.map((f) => {
        const active = isActive(f.href);
        return (
          <Link
            key={f.href}
            href={f.href}
            aria-current={active ? "page" : undefined}
            className="group relative flex items-center px-2.5 text-[13px] font-medium outline-none"
          >
            <span
              className={cn(
                "rounded-md px-2 py-1 text-muted-foreground transition-colors duration-150 group-hover:bg-accent/60 group-hover:text-foreground group-focus-visible:ring-[3px] group-focus-visible:ring-ring",
                active && "text-foreground",
              )}
            >
              {f.label}
            </span>
            {/* Active indicator sits on the header's bottom border so it reads as part of the bar. */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 origin-center scale-x-0 rounded-full bg-linear-to-r from-primary to-[oklch(0.68_0.19_305)] transition-transform duration-200",
                active && "scale-x-100",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
