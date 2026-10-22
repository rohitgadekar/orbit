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
    <div className="bento flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-[family-name:var(--font-syne)] text-lg">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
