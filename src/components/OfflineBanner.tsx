"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hub_data_cached_at");
    if (stored) setCachedAt(stored);

    if (navigator.onLine) {
      localStorage.setItem("hub_data_cached_at", new Date().toISOString());
    } else {
      setIsOffline(true);
    }

    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  const formattedDate = cachedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(cachedAt))
    : null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm shrink-0"
    >
      <WifiOff size={15} className="shrink-0 text-amber-600" />
      <span>
        <strong>You&apos;re offline</strong> — showing hub data
        {formattedDate ? ` cached on ${formattedDate}` : " from your last visit"}.
        {" "}Hub status may have changed. Call ahead before traveling.
      </span>
    </div>
  );
}
