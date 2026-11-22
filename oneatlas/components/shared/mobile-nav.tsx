"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoMark } from "@/components/shared/logo";
import { GlobalSearch } from "@/components/search/global-search";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV } from "@/lib/constants/features";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-xs gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <LogoMark /> OneAtlas
          </SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <GlobalSearch shortcut={false} />
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-2 pb-6">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((f) => {
              const active = pathname === f.href || pathname.startsWith(`${f.href}/`);
              return (
                <li key={f.href}>
                  <Link
                    href={f.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      active && "bg-accent text-foreground",
                    )}
                  >
                    <f.icon className="size-4" /> {f.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
