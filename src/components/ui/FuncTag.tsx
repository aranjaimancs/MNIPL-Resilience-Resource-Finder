import type { HubFunction } from "@/lib/types";
import { FUNCS } from "@/lib/constants";

interface FuncTagProps {
  fn: HubFunction;
  size?: "sm" | "md";
}

export function FuncTag({ fn, size = "md" }: FuncTagProps) {
  const f = FUNCS[fn];
  const Icon = f.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{
        padding: size === "sm" ? "3px 8px" : "5px 10px",
        background: f.color + "1A",
        color: f.color,
        fontSize: size === "sm" ? 11.5 : 13,
        letterSpacing: 0.1,
      }}
    >
      <Icon size={size === "sm" ? 13 : 15} strokeWidth={2.4} />
      {f.label}
    </span>
  );
}
