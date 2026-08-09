"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, CalendarClock, Package, LogOut, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/admin/offerings", label: "Offerings", icon: Package },
  { href: "/admin/availability", label: "Availability", icon: CalendarClock },
];

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-border bg-card sm:h-screen sm:w-60 sm:border-r">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
          {site.name.charAt(0)}
        </span>
        <span className="font-semibold">{site.name}</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          View site
        </Link>
      </nav>

      <div className="border-t border-border p-3">
        <p className="truncate px-3 text-xs text-muted-foreground">{userEmail}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
