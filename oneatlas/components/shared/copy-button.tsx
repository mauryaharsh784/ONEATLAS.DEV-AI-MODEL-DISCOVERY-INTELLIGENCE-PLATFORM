"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Copies `value` to the clipboard with visible + toast feedback and a legacy fallback. */
export function CopyButton({
  value,
  label = "Copy",
  successMessage = "Copied to clipboard",
  size = "icon-sm",
  className,
}: {
  value: string;
  label?: string;
  successMessage?: string;
  size?: "icon-sm" | "sm";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement("textarea");
        el.value = value;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        const okay = document.execCommand("copy");
        document.body.removeChild(el);
        if (!okay) throw new Error("execCommand failed");
      }
      setCopied(true);
      toast.success(successMessage);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  return (
    <Button type="button" variant="ghost" size={size} onClick={copy} aria-label={label} className={cn(className)}>
      {copied ? <Check className="text-success" /> : <Copy />}
      {size === "sm" && <span>{copied ? "Copied" : label}</span>}
    </Button>
  );
}
