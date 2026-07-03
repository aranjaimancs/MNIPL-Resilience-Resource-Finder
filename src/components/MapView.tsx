"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  ZoomControl,
  useMapEvents,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { FUNCS, STATUS, primaryFunc } from "@/lib/constants";
import { FlyTo } from "@/components/FlyTo";
import { DetailPanel } from "@/components/DetailPanel";
import type { Hub, HubFunction, ProfileQuestion } from "@/lib/types";

const MINNEAPOLIS: [number, number] = [44.9778, -93.265];

function getIconPath(fn: HubFunction): string {
  switch (fn) {
    case "warming":
      return `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`;
    case "cooling":
      return `<line x1="12" x2="12" y1="2" y2="22"/><path d="m17 7-5 5-5-5"/><path d="m17 17-5-5-5 5"/><path d="m2 12 5-5 5 5-5 5z"/><path d="m22 12-5 5-5-5 5-5z"/>`;
    case "cleanair":
      return `<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>`;
    case "food":
      return `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>`;
    case "charging":
      return `<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>`;
    case "beds":
      return `<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>`;
    default:
      return `<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0z"/>`;
  }
}

function makePinIcon(hub: Hub, active: boolean, activeFilter: HubFunction | null): L.DivIcon {
  const pf = activeFilter ?? primaryFunc(hub.functions as HubFunction[], hub.primary_function);
  const f = FUNCS[pf];
  const st = STATUS[hub.status as keyof typeof STATUS];
  const size = active ? 46 : 38;
  const iconSize = active ? 19 : 16;

  // Small colored dots for secondary functions (up to 3 shown)
  const secondaryFuncs = hub.functions.filter((fn) => fn !== pf).slice(0, 3) as HubFunction[];
  const dotRow = secondaryFuncs.length > 0
    ? `<div style="
        position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);
        display:flex;gap:3px;
      ">
        ${secondaryFuncs.map((fn) => `
          <span style="
            width:7px;height:7px;border-radius:99px;
            background:${FUNCS[fn].color};
            border:1.5px solid #fff;
            display:inline-block;
          "></span>
        `).join("")}
      </div>`
    : "";

  const html = `
    <div style="position:relative;width:${size}px;height:${size + (secondaryFuncs.length > 0 ? 10 : 0)}px;">
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50% 50% 50% 2px;
        transform:rotate(45deg);
        background:${f.color};
        border:2.5px solid ${active ? "#1C2A23" : "#fff"};
        display:grid;place-items:center;
        box-shadow:${active ? "0 6px 12px rgba(0,0,0,.28)" : "0 3px 5px rgba(0,0,0,.18)"};
      ">
        <div style="transform:rotate(-45deg);color:#fff;display:grid;place-items:center;">
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            ${getIconPath(pf)}
          </svg>
        </div>
      </div>
      <span style="
        position:absolute;right:-3px;top:-3px;
        width:11px;height:11px;border-radius:99px;
        background:${st.color};border:2px solid #fff;
        ${hub.status === "open" ? `box-shadow:0 0 0 3px ${st.color}40;` : ""}
      "></span>
      ${dotRow}
    </div>`;

  const totalHeight = size + (secondaryFuncs.length > 0 ? 10 : 0);
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, totalHeight],
    iconAnchor: [size / 2, size],
  });
}

function makeUserIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div class="user-location-pulse"></div>
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:14px;height:14px;border-radius:50%;
          background:#2E7FB8;border:2.5px solid #fff;
          box-shadow:0 2px 8px rgba(46,127,184,.5);
        "></div>
      </div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapClickHandler({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({ click: onDeselect });
  return null;
}

function NearMeControl({ onLocated }: { onLocated: (pos: [number, number], accuracy: number) => void }) {
  const map = useMap();
  function handleClick() {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos: [number, number] = [coords.latitude, coords.longitude];
        onLocated(pos, coords.accuracy);
        map.flyTo(pos, 15, { animate: true, duration: 1 });
      },
      () => alert("Location access denied or unavailable.")
    );
  }
  return (
    <div className="leaflet-top leaflet-right" style={{ top: 96 }}>
      <div className="leaflet-control leaflet-bar">
        <button
          title="Near me"
          onClick={handleClick}
          style={{
            width: 40, height: 40, background: "#FBF8F0",
            border: "1px solid #DDD5C2", borderRadius: 10,
            display: "grid", placeItems: "center", cursor: "pointer",
            boxShadow: "0 2px 5px rgba(0,0,0,.08)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C2A23" strokeWidth="2.4">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

interface MapViewProps {
  hubs: Hub[];
  visibleIds: Set<string>;
  selected: Hub | null;
  onSelect: (hub: Hub) => void;
  onDeselect: () => void;
  userPos: { pos: [number, number]; accuracy: number } | null;
  onLocated: (pos: [number, number], accuracy: number) => void;
  activeFilter: HubFunction | null;
  profileQuestions: ProfileQuestion[];
}

export default function MapView({
  hubs,
  visibleIds,
  selected,
  onSelect,
  onDeselect,
  userPos,
  onLocated,
  activeFilter,
  profileQuestions,
}: MapViewProps) {

  return (
    <div className="relative flex-1 h-full">
      <MapContainer
        center={MINNEAPOLIS}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <ZoomControl position="topright" />
        <FlyTo hub={selected} />
        <MapClickHandler onDeselect={onDeselect} />
        <NearMeControl onLocated={onLocated} />

        {userPos && (
          <>
            {userPos.accuracy < 800 && (
              <Circle
                center={userPos.pos}
                radius={userPos.accuracy}
                pathOptions={{
                  fillColor: "#2E7FB8",
                  fillOpacity: 0.08,
                  color: "#2E7FB8",
                  weight: 1,
                  opacity: 0.25,
                }}
              />
            )}
            <Marker
              position={userPos.pos}
              icon={makeUserIcon()}
              zIndexOffset={2000}
            />
          </>
        )}

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={(cluster: { getChildCount: () => number }) => {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: `<div style="
                width:40px;height:40px;border-radius:50%;
                background:#1F4032;color:#F4EFE3;
                display:grid;place-items:center;
                font-weight:700;font-size:14px;
                border:2.5px solid #fff;
                box-shadow:0 2px 6px rgba(0,0,0,.2);
                font-family:'Public Sans',sans-serif;
              ">${count}</div>`,
              className: "",
              iconSize: [40, 40],
            });
          }}
        >
          {hubs.map((hub) => {
            if (!hub.lat || !hub.lng) return null;
            const isActive = selected?.id === hub.id;
            return (
              <Marker
                key={hub.id}
                position={[hub.lat, hub.lng]}
                icon={makePinIcon(hub, isActive, activeFilter)}
                opacity={visibleIds.has(hub.id) ? 1 : 0.2}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    onSelect(hub);
                  },
                }}
                zIndexOffset={isActive ? 1000 : 0}
              />
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Hint overlay */}
      <div className="absolute left-3.5 top-3.5 bg-card border border-border rounded-[10px] px-3 py-1.5 text-xs text-ink-soft flex items-center gap-1.5 pointer-events-none z-[999]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7FB8" strokeWidth="2.4">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Click a pin · drag to explore
      </div>

      {/* Detail panel — bottom sheet */}
      {selected && (
        <DetailPanel hub={selected} onClose={onDeselect} profileQuestions={profileQuestions} />
      )}
    </div>
  );
}
