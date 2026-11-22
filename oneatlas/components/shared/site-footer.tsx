import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { NAV } from "@/lib/constants/features";

function FooterLinks({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="container-page grid gap-10 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            An atlas of AI models, labs and API providers, backed by PostgreSQL. Prices and limits come from the LiteLLM
            community registry; benchmark scores are simulated samples and are always labelled.
          </p>
        </div>
        <FooterLinks title="Explore" items={NAV.slice(0, 5)} />
        <FooterLinks title="Tools" items={[...NAV.slice(5), { href: "/design-system", label: "Design system" }, { href: "/api/health", label: "API health" }]} />
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-1 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} OneAtlas — internship project build.</span>
          <span>Pricing and benchmark figures are only shown as verified when a source is recorded.</span>
        </div>
      </div>
    </footer>
  );
}
