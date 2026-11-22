"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Saved to favorites")}>Success toast</Button>
      <Button variant="outline" onClick={() => toast.error("Couldn't save. Try again.")}>Error toast</Button>
      <Button variant="outline" onClick={() => toast.info("Filters cleared")}>Info toast</Button>
    </div>
  );
}
