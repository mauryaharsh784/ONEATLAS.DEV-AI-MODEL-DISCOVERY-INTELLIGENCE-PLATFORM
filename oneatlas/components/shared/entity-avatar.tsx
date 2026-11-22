import { cn } from "@/lib/utils";

function hue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}
function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[1][0] : parts[0]?.[1] ?? "")).toUpperCase();
}

/** Generated initials avatar. No logo assets are bundled, so this stands in for lab / provider logos. */
export function EntityAvatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("avatar inline-flex shrink-0 items-center justify-center rounded-md font-semibold select-none", className)}
      style={{ ["--h" as string]: hue(name), width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initials(name)}
    </span>
  );
}
