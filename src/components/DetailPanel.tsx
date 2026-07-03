"use client";

import { useState } from "react";
import {
  X, MapPin, Clock, Phone, Globe,
  ShieldCheck, Navigation, Link2, Check, BookOpen,
} from "lucide-react";
import { FUNCS, STATUS, primaryFunc } from "@/lib/constants";
import { StatusPill } from "@/components/ui/StatusPill";
import { FuncTag } from "@/components/ui/FuncTag";
import { HubProfileModal } from "@/components/HubProfileModal";
import type { Hub, HubFunction, HubStatus, ProfileQuestion } from "@/lib/types";

interface DetailPanelProps {
  hub: Hub;
  onClose: () => void;
  profileQuestions: ProfileQuestion[];
}

export function DetailPanel({ hub, onClose, profileQuestions }: DetailPanelProps) {
  const pf = primaryFunc(hub.functions as HubFunction[], hub.primary_function);
  const f = FUNCS[pf];
  const [copied, setCopied] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const directionsUrl =
    hub.lat && hub.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${hub.lat},${hub.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hub.address ?? hub.name)}`;

  const hasProfile = !!(hub.about || hub.experience || hub.languages || hub.accessibility);

  // Only allow http/https links — blocks javascript: and data: injection
  function isSafeUrl(url: string): boolean {
    try {
      const { protocol } = new URL(url);
      return protocol === "https:" || protocol === "http:";
    } catch {
      return false;
    }
  }

  return (
    <>
      <div
        className="panel-rise absolute right-3.5 top-3.5 w-[326px] max-w-[calc(100vw-28px)] max-h-[calc(100%-28px)] overflow-y-auto bg-card rounded-[14px] border border-border"
        style={{ boxShadow: "0 14px 38px rgba(20,30,24,.22)", zIndex: 1000 }}
      >
        {/* Header gradient */}
        <div
          className="h-[92px] relative shrink-0"
          style={{ background: `linear-gradient(120deg, ${f.color}, #2E5E47)` }}
        >
          <div className="absolute right-2.5 top-2.5 flex gap-1.5">
            <button
              onClick={handleShare}
              title="Copy link"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "#ffffffd0" }}
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Link2 size={14} />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#ffffffd0" }}
            >
              <X size={16} />
            </button>
          </div>
          {hub.verified && (
            <span
              className="absolute left-3 bottom-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold"
              style={{ background: "#ffffffe6", color: "#1F4032" }}
            >
              <ShieldCheck size={13} /> Verified by MNIPL
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          <h2 className="font-display font-semibold text-[19px] leading-[1.15] text-ink">
            {hub.name}
          </h2>
          <p className="text-[12.5px] text-ink-soft mt-0.5">
            {[hub.faith, hub.neighborhood].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-2.5">
            <StatusPill status={hub.status as HubStatus} />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {(hub.functions as HubFunction[]).map((fn) => (
              <FuncTag key={fn} fn={fn} size="sm" />
            ))}
          </div>

          {hub.images && hub.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-3.5 -mx-4 px-4 pb-0.5">
              {hub.images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${hub.name} photo ${i + 1}`}
                  className="h-28 w-44 object-cover rounded-lg shrink-0"
                />
              ))}
            </div>
          )}

          {hub.note && (
            <p className="text-[13px] text-ink-soft mt-3.5 leading-relaxed">{hub.note}</p>
          )}

          <div className="mt-3.5 flex flex-col gap-2 text-[13px]">
            {hub.address && <Row icon={MapPin}>{hub.address}</Row>}
            {hub.hours && <Row icon={Clock}>{hub.hours}</Row>}
            {hub.phone && (
              <Row icon={Phone}>
                <a href={`tel:${hub.phone}`} className="hover:underline">{hub.phone}</a>
              </Row>
            )}
            {hub.website && isSafeUrl(hub.website) && (
              <Row icon={Globe}>
                <a
                  href={hub.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate"
                >
                  {hub.website.replace(/^https?:\/\//, "")}
                </a>
              </Row>
            )}
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full py-[11px] rounded-[10px] bg-pine text-paper font-bold text-sm flex items-center justify-center gap-2 hover:bg-pine-soft transition-colors"
          >
            <Navigation size={16} /> Get directions
          </a>

          {hasProfile && (
            <button
              onClick={() => setShowProfile(true)}
              className="mt-2 w-full py-[10px] rounded-[10px] border border-border text-ink text-sm font-semibold flex items-center justify-center gap-2 hover:bg-card transition-colors"
            >
              <BookOpen size={15} className="text-pine-soft" /> Learn more about this hub
            </button>
          )}
        </div>
      </div>

      {showProfile && (
        <HubProfileModal
          hub={hub}
          profileQuestions={profileQuestions}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-ink-soft">
      <Icon size={15} className="text-pine-soft shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
