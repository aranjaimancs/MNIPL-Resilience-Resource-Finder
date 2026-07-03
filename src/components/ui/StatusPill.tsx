import type { HubStatus } from "@/lib/types";
import { STATUS } from "@/lib/constants";

export function StatusPill({ status }: { status: HubStatus }) {
  const st = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: st.color + "18", color: st.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: st.color,
          boxShadow: status === "open" ? `0 0 0 3px ${st.color}33` : "none",
        }}
      />
      {st.label}
    </span>
  );
}
