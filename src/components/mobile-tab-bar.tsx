"use client";

import { cn } from "@/lib/utils";
import { Compass, Disc3, FolderArchive, Heart, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_NAV_ITEMS = [
  { href: "/home", label: "Browse", icon: Compass },
  { href: "/music", label: "Songs", icon: Disc3 },
  { href: "/folders", label: "Folders", icon: FolderArchive },
  { href: "/favourites", label: "Loved", icon: Heart },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-5 gap-1 border-t border-black/5 bg-[#19181b] px-2 pb-[max(10px,var(--safe-bottom))] pt-2 md:hidden">
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/home" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition",
              active ? "text-[#dbe878]" : "text-zinc-400 hover:text-white",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-xl transition",
                active ? "bg-[#2d2c2f] text-[#dbe878]" : "text-zinc-400",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
