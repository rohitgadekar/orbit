"use client";

import { cn } from "@/lib/utils";
import { Compass, Disc3, Heart, ListMusic, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_NAV_ITEMS = [
  { href: "/home", label: "Browse", icon: Compass },
  { href: "/music", label: "Songs", icon: Disc3 },
  { href: "/folders", label: "Playlists", icon: ListMusic },
  { href: "/favourites", label: "Loved", icon: Heart },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-md md:hidden pointer-events-auto">
      <nav className="flex items-center justify-around rounded-[32px] border border-white/15 bg-[#19181b]/92 px-2 py-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/home" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-1 py-1 text-center transition-all duration-200 active:scale-95",
                active ? "text-[#dbe878]" : "text-zinc-400 hover:text-white",
              )}
            >
              <div
                className={cn(
                  "relative grid h-8 w-11 place-items-center rounded-full transition-all duration-200",
                  active
                    ? "bg-white/10 text-[#dbe878] shadow-inner"
                    : "text-zinc-400 group-hover:text-zinc-200",
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                {active ? (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#dbe878]" />
                ) : null}
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-tight font-medium transition-colors",
                  active ? "font-bold text-[#dbe878]" : "text-zinc-400",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
