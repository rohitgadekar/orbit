import { OrbitMark } from "@/components/icon-rail";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#1a1a1c] p-6">
      <div className="flex max-w-md flex-col items-center rounded-[28px] border border-white/5 bg-[#222224] p-10 text-center">
        <OrbitMark className="h-10 w-10" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Lost in Velar</h1>
        <Link
          href="/home"
          className="mt-6 inline-block rounded-full bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}