import { Logo } from "@/components/shared/logo";
import { MobileNav } from "@/components/shared/mobile-nav";
import { GlobalSearch } from "@/components/search/global-search";
import { SiteNav } from "@/components/shared/site-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
      <div className="container-page flex h-(--header-height) items-center gap-3">
        <MobileNav />
        <Logo className="mr-3" />
        <SiteNav />
        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch className="hidden w-72 md:block xl:w-96" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
