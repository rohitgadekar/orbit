import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/5 bg-[#222224] px-6 py-16 text-center">
      <p className="text-lg font-bold tracking-tight text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}