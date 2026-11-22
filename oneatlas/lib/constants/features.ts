import { BarChart3, Building2, Cpu, GitCompareArrows, Server, Trophy, type LucideIcon } from "lucide-react";

/** Top-level product areas. Only pages that exist and work are listed here. */
export interface NavItem { href: string; label: string; icon: LucideIcon }

export const NAV: NavItem[] = [
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/benchmarks", label: "Benchmarks", icon: BarChart3 },
  { href: "/labs", label: "Labs", icon: Building2 },
  { href: "/providers", label: "Providers", icon: Server },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
];
