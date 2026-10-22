"use client";

import { coverFallback, initials } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ArtistAvatar({
  name,
  imageUrl,
  className = "",
  sizeClassName = "w-24 h-24",
  playing = false,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
  sizeClassName?: string;
  playing?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(imageUrl || null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setSrc(imageUrl || null);
    setImgError(false);
  }, [imageUrl]);

  const showImage = Boolean(src) && !imgError;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-black/5 shadow-sm transition duration-300 group-hover:scale-105 group-hover:ring-zinc-900 ${sizeClassName} ${className}`}
      style={!showImage ? { backgroundImage: coverFallback(name) } : undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold text-zinc-800 text-sm select-none">
          {initials(name || "Artist")}
        </div>
      )}

      {/* Playing equalizer indicator */}
      {playing ? (
        <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[1px]">
          <span className="flex h-4 items-end gap-1">
            <i className="h-2.5 w-1 animate-pulse rounded-full bg-[#dbe878]" />
            <i className="h-4 w-1 animate-pulse rounded-full bg-[#dbe878] delay-100" />
            <i className="h-2 w-1 animate-pulse rounded-full bg-[#dbe878] delay-200" />
          </span>
        </div>
      ) : null}
    </div>
  );
}
