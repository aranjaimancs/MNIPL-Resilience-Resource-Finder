"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, User, Building2, ShieldCheck, Info } from "lucide-react";
import { FilterBar } from "@/components/FilterBar";
import { HubList } from "@/components/HubList";
import { OfflineBanner } from "@/components/OfflineBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import type { Hub, HubFunction, ProfileQuestion } from "@/lib/types";

// Leaflet touches window — must be imported client-side only
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#E9E2CF] h-full">
      <p className="text-ink-soft text-sm animate-pulse">Loading map…</p>
    </div>
  ),
});

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

interface ResidentViewProps {
  hubs: Hub[];
  initialHub?: Hub | null;
  isMniplAdmin?: boolean;
  isHubAdmin?: boolean;
  profileQuestions: ProfileQuestion[];
}

export function ResidentView({ hubs, initialHub, isMniplAdmin = false, isHubAdmin = false, profileQuestions }: ResidentViewProps) {
  const searchParams = useSearchParams();
  const accessPending = searchParams.get("access") === "pending";
  const [selected, setSelected] = useState<Hub | null>(initialHub ?? null);
  const [filters, setFilters] = useState<HubFunction[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [userPos, setUserPos] = useState<{ pos: [number, number]; accuracy: number } | null>(null);

  // Prompt for location on first load
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPos({ pos: [coords.latitude, coords.longitude], accuracy: coords.accuracy });
      },
      () => {} // silently ignore if denied — Near Me button still works
    );
  }, []);

  const toggleFilter = useCallback((f: HubFunction) => {
    setFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }, []);

  // How many of the selected filters does a hub match?
  const matchScore = (h: Hub) =>
    filters.length ? filters.filter((f) => h.functions.includes(f)).length : 0;

  const visible = hubs.filter((h) => {
    if (openOnly && h.status === "closed") return false;
    // With filters active, require at least 1 match (not all)
    if (filters.length && matchScore(h) === 0) return false;
    if (
      query &&
      !`${h.name} ${h.neighborhood}`.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    return true;
  });

  // Sort: nearest-first within two tiers — full matches above partial matches.
  // When no filters are active, all hubs are in the same tier.
  const sorted = [...visible].sort((a, b) => {
    if (filters.length) {
      const aFull = matchScore(a) === filters.length;
      const bFull = matchScore(b) === filters.length;
      if (aFull !== bFull) return aFull ? -1 : 1;
    }
    if (userPos) {
      if (!a.lat || !a.lng) return 1;
      if (!b.lat || !b.lng) return -1;
      return (
        haversineKm(userPos.pos[0], userPos.pos[1], a.lat, a.lng) -
        haversineKm(userPos.pos[0], userPos.pos[1], b.lat, b.lng)
      );
    }
    return 0;
  });

  const visibleIds = new Set(visible.map((h) => h.id));

  // Deselect hub if it gets filtered out
  useEffect(() => {
    if (selected && !visibleIds.has(selected.id)) {
      setSelected(null);
      window.history.replaceState(null, "", "/");
    }
  }, [filters, openOnly, query]);

  // When filters are active, the most-recently-selected function overrides the
  // hub's primary function for icon/color display on both the map and the list.
  const activeFilter: HubFunction | null = filters.length > 0 ? filters[filters.length - 1] : null;

  const handleSelect = useCallback((hub: Hub) => {
    setSelected(hub);
    window.history.replaceState(null, "", `?hub=${hub.id}`);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelected(null);
    window.history.replaceState(null, "", "/");
  }, []);

  return (
    <div
      className="flex flex-col font-sans text-ink bg-paper"
      style={{ height: "100dvh" }}
    >
      {/* Header */}
      <header className="flex items-center gap-3.5 px-5 py-3 bg-pine text-paper shrink-0">
        <img
          src="/mnipl-logo.png"
          alt="Minnesota Interfaith Power & Light"
          className="h-9 w-auto rounded-[9px]"
          style={{ background: "white", padding: "4px 8px" }}
        />
        <div className="leading-tight">
          <div className="font-display font-semibold text-[19px]">Resilience Resources</div>
        </div>
        <div className="ml-auto flex gap-1">
          <a
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold bg-paper text-pine"
          >
            <User size={15} /> <span className="hidden sm:inline">Find a hub</span>
          </a>
          {isHubAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold text-paper opacity-70 hover:opacity-100 transition-opacity"
            >
              <Building2 size={15} /> <span className="hidden sm:inline">Hub admin</span>
            </a>
          )}
          {isMniplAdmin && (
            <a
              href="/admin/review"
              className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold text-paper opacity-70 hover:opacity-100 transition-opacity"
            >
              <ShieldCheck size={15} /> <span className="hidden sm:inline">MNIPL Admin</span>
            </a>
          )}
        </div>
      </header>

      <OfflineBanner />
      <InstallPrompt />

      {accessPending && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Your account is pending approval. Once MNIPL staff activates your role, you&apos;ll be able to access the hub management area.{" "}
            <a href="mailto:info@mnipl.org" className="underline font-semibold">Contact MNIPL</a> to request access.
          </span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — hidden on mobile (sm:flex) */}
        <aside className="hidden sm:flex w-[340px] border-r border-border flex-col bg-paper shrink-0">
          <FilterBar
            query={query}
            setQuery={setQuery}
            filters={filters}
            toggleFilter={toggleFilter}
            openOnly={openOnly}
            setOpenOnly={setOpenOnly}
          />
          <HubList
            hubs={sorted}
            selected={selected}
            onSelect={handleSelect}
            userPos={userPos}
            activeFilter={activeFilter}
          />
        </aside>

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <MapView
            hubs={hubs}
            visibleIds={visibleIds}
            selected={selected}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
            userPos={userPos}
            onLocated={(pos, accuracy) => setUserPos({ pos, accuracy })}
            activeFilter={activeFilter}
            profileQuestions={profileQuestions}
          />
        </div>
      </div>

      {/* Mobile bottom sheet — shown on small screens only when no hub is selected */}
      <div className={selected ? "hidden" : "sm:hidden"}>
        <MobileBottomSheet
          hubs={sorted}
          selected={selected}
          onSelect={handleSelect}
          query={query}
          setQuery={setQuery}
          filters={filters}
          toggleFilter={toggleFilter}
          openOnly={openOnly}
          setOpenOnly={setOpenOnly}
          userPos={userPos}
          activeFilter={activeFilter}
        />
      </div>
    </div>
  );
}

function MobileBottomSheet({
  hubs,
  selected,
  onSelect,
  query,
  setQuery,
  filters,
  toggleFilter,
  openOnly,
  setOpenOnly,
  userPos,
  activeFilter,
}: {
  hubs: Hub[];
  selected: Hub | null;
  onSelect: (hub: Hub) => void;
  query: string;
  setQuery: (q: string) => void;
  filters: HubFunction[];
  toggleFilter: (f: HubFunction) => void;
  openOnly: boolean;
  setOpenOnly: (v: boolean) => void;
  userPos: { pos: [number, number]; accuracy: number } | null;
  activeFilter: HubFunction | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-paper border-t border-border rounded-t-2xl shadow-xl z-[1100] transition-all duration-300"
      style={{ maxHeight: expanded ? "70vh" : "200px", overflow: "hidden" }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center pt-2 pb-1 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 40px)" }}>
        <FilterBar
          query={query}
          setQuery={setQuery}
          filters={filters}
          toggleFilter={toggleFilter}
          openOnly={openOnly}
          setOpenOnly={setOpenOnly}
        />
        <HubList hubs={hubs} selected={selected} onSelect={onSelect} userPos={userPos} activeFilter={activeFilter} />
      </div>
    </div>
  );
}
