import type { Platform } from "../types/types";

export function PlatformBadge({ name }: { name: Platform }) {
  const colors: Record<Platform, string> = {
    Jumia: "bg-orange-100 text-orange-700",
    Amazon: "bg-yellow-100 text-yellow-700",
    AliExpress: "bg-red-100 text-red-700",
  };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors[name]}`}>{name}</span>;
}