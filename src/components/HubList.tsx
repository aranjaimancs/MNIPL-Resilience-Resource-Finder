"use client";

import { ChevronRight } from "lucide-react";
import { FUNCS, primaryFunc } from "@/lib/constants";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Hub, HubFunction } from "@/lib/types";

interface HubListProps {
  hubs: Hub[];
  selected: Hub | null;
  onSelect: (hub: Hub) => void;
  userPos?: { pos: [number, number] } | null;
  activeFilter?: HubFunction | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  return miles < 0.1 ? "< 0.1 mi" : `${miles.toFixed(1)} mi`;
}

export function HubList({ hubs, selected, onSelect, userPos, activeFilter }: HubListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-3 pb-3">
      <div className="px-1 py-1.5 text-xs font-semibold text-ink-soft">
        {hubs.length} hub{hubs.length !== 1 ? "s" : ""}
        {userPos ? " · sorted by distance" : ""}
      </div>
      {hubs.length === 0 && (
        <div className="py-10 text-center text-sm text-ink-soft">
          No hubs match those filters.
        </div>
      )}
      {hubs.map((hub) => {
        const pf = activeFilter ?? primaryFunc(hub.functions as any, hub.primary_function);
        const f = FUNCS[pf];
        const Icon = f.Icon;
        const active = selected?.id === hub.id;

        const distance =
          userPos && hub.lat && hub.lng
            ? formatDistance(haversineKm(userPos.pos[0], userPos.pos[1], hub.lat, hub.lng))
            : null;

        return (
          <button
            key={hub.id}
            onClick={() => onSelect(hub)}
            className="w-full text-left block rounded-xl p-3 mt-2 border transition-colors hover:bg-white"
            style={{
              background: active ? "#fff" : "#FBF8F0",
              border: `1px solid ${active ? f.color : "#DDD5C2"}`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: f.color + "1F", color: f.color }}
              >
                <Icon size={16} strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-ink truncate">{hub.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                  {hub.neighborhood}
                  {distance && (
                    <>
                      <span className="opacity-40">·</span>
                      <span>{distance}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-ink-soft shrink-0" />
            </div>
            <div className="flex justify-between items-center mt-2">
              <StatusPill status={hub.status as any} />
              <div className="flex items-center gap-1">
                {hub.functions.map((fn) => {
                  const func = FUNCS[fn as keyof typeof FUNCS];
                  if (!func) return null;
                  const FnIcon = func.Icon;
                  return (
                    <span
                      key={fn}
                      title={func.label}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: func.color + "18", color: func.color }}
                    >
                      <FnIcon size={11} strokeWidth={2.6} />
                    </span>
                  );
                })}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
