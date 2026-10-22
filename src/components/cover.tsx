import { coverFallback } from "@/lib/utils";

export function Cover({
  src,
  title,
  className = "",
  playing = false,
}: {
  src?: string | null;
  title: string;
  className?: string;
  playing?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-lilac ${className}`}
      style={!src ? { backgroundImage: coverFallback(title) } : undefined}
    >
      {src ? (
        // Cloudinary or any HTTPS cover URL
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-ink/80">
          {title.slice(0, 1)}
        </div>
      )}
      {playing ? (
        <div className="absolute inset-0 grid place-items-center bg-ink/20">
          <span className="flex h-3 items-end gap-0.5">
            <i className="h-2 w-0.5 animate-pulse bg-white" />
            <i className="h-3 w-0.5 animate-pulse bg-white delay-75" />
            <i className="h-1.5 w-0.5 animate-pulse bg-white delay-150" />
          </span>
        </div>
      ) : null}
    </div>
  );
}
