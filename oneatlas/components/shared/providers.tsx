"use client";

import { CompareProvider } from "@/components/catalog/compare-provider";
import { CompareTray } from "@/components/catalog/compare-controls";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** All client-side context providers in one place. TanStack Query joins here in Phase 3. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <CompareProvider>
          {children}
          <CompareTray />
        </CompareProvider>
        <Toaster position="top-right" offset={{ top: 64, right: 16 }} mobileOffset={{ top: 64, right: 12, left: 12 }} richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
