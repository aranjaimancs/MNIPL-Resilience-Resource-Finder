"use client";

import { Search } from "lucide-react";
import { FUNCS } from "@/lib/constants";
import type { HubFunction } from "@/lib/types";

interface FilterBarProps {
  query: string;
  setQuery: (q: string) => void;
  filters: HubFunction[];
  toggleFilter: (f: HubFunction) => void;
  openOnly: boolean;
  setOpenOnly: (v: boolean) => void;
}

export function FilterBar({
  query,
  setQuery,
  filters,
  toggleFilter,
  openOnly,
  setOpenOnly,
}: FilterBarProps) {
  return (
    <div className="px-4 pt-3.5 pb-2.5">
      {/* Search */}
      <div className="relative mb-2.5">
        <Search size={16} className="absolute left-3 top-[11px] text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search neighborhood or name…"
          className="w-full pl-9 pr-3 py-2.5 rounded-[10px] border border-border bg-card text-[13.5px] font-sans text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-pine/20"
        />
      </div>
      {/* Chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setOpenOnly(!openOnly)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          style={{
            border: `1px solid ${openOnly ? "#3C8A4C" : "#DDD5C2"}`,
            background: openOnly ? "#3C8A4C1A" : "#FBF8F0",
            color: openOnly ? "#3C8A4C" : "#4A5750",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#3C8A4C" }}
          />
          Open now
        </button>
        {(Object.keys(FUNCS) as HubFunction[]).map((k) => {
          const f = FUNCS[k];
          const Icon = f.Icon;
          const on = filters.includes(k);
          return (
            <button
              key={k}
              onClick={() => toggleFilter(k)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={{
                border: `1px solid ${on ? f.color : "#DDD5C2"}`,
                background: on ? f.color + "1A" : "#FBF8F0",
                color: on ? f.color : "#4A5750",
              }}
            >
              <Icon size={12} strokeWidth={2.6} />
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
