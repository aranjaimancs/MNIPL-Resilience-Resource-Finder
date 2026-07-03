"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Hub } from "@/lib/types";

export function FlyTo({ hub }: { hub: Hub | null }) {
  const map = useMap();

  useEffect(() => {
    if (hub?.lat && hub?.lng) {
      map.flyTo([hub.lat, hub.lng], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8,
      });
    }
  }, [hub, map]);

  return null;
}
