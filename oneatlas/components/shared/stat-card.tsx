import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("gap-1 py-4", className)}>
      <div className="flex items-center justify-between px-5 text-sm text-muted-foreground">
        <span>{label}</span>
        {Icon && <Icon className="size-4" />}
      </div>
      <div className="num px-5 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="px-5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-2 py-4">
      <Skeleton className="mx-5 h-4 w-24" />
      <Skeleton className="mx-5 h-7 w-20" />
    </Card>
  );
}
