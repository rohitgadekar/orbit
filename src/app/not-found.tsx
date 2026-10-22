import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="bento max-w-md p-10 text-center">
        <h1 className="font-[family-name:var(--font-syne)] text-3xl">Lost in orbit</h1>
        <Link href="/home" className="mt-4 inline-block text-sm text-accent">
          Back home
        </Link>
      </div>
    </div>
  );
}
