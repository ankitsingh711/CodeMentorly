import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            {site.name.charAt(0)}
          </span>
          <span>{site.name}</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="/#services" className="transition-colors hover:text-foreground">
            Services
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/#who-its-for" className="transition-colors hover:text-foreground">
            Who it&apos;s for
          </Link>
          <Link href="/#about" className="transition-colors hover:text-foreground">
            About
          </Link>
        </nav>

        <Button asChild size="sm">
          <Link href="/#services">Book a Session</Link>
        </Button>
      </div>
    </header>
  );
}
