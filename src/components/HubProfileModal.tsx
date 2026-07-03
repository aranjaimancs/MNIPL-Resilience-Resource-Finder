"use client";

import { useEffect } from "react";
import { X, BookOpen, Star, Globe, Heart } from "lucide-react";
import { FUNCS, primaryFunc } from "@/lib/constants";
import type { Hub, HubFunction } from "@/lib/types";

// The four congregation profile questions.
// Labels here are what residents see — MNIPL can refine these later.
type ProfileKey = "about" | "experience" | "languages" | "accessibility";

const SECTIONS: { key: ProfileKey; label: string; Icon: React.ElementType }[] = [
  { key: "about",         label: "Mission & values",           Icon: BookOpen },
  { key: "experience",    label: "Emergency service experience", Icon: Star     },
  { key: "languages",     label: "Languages & communities",     Icon: Globe    },
  { key: "accessibility", label: "Accessibility",               Icon: Heart    },
];

interface HubProfileModalProps {
  hub: Hub;
  onClose: () => void;
  profileQuestions?: import("@/lib/types").ProfileQuestion[];
}

export function HubProfileModal({ hub, onClose }: HubProfileModalProps) {
  const pf = primaryFunc(hub.functions as HubFunction[], hub.primary_function);
  const f = FUNCS[pf];

  const filled = SECTIONS.filter((s) => hub[s.key]);
  const hasPhotos = hub.images && hub.images.length > 0;

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: "rgba(28,42,35,0.60)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-paper w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl"
        style={{ boxShadow: "0 24px 60px rgba(20,30,24,.40)" }}
      >
        {/* Function-color accent bar */}
        <div
          className="h-1.5 rounded-t-[24px] sm:rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${f.color}, #2E5E47)` }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="font-display font-semibold text-[20px] leading-tight text-ink">
              {hub.name}
            </h2>
            <p className="text-[13px] text-ink-soft mt-0.5">
              {[hub.faith, hub.neighborhood].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-3 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-ink-soft hover:bg-card transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Photos — shown larger here than in the quick-view panel */}
        {hasPhotos && (
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 snap-x snap-mandatory">
            {hub.images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${hub.name} photo ${i + 1}`}
                className="h-48 w-72 object-cover rounded-xl shrink-0 snap-start"
              />
            ))}
          </div>
        )}

        {/* Q&A profile content */}
        <div className="px-5 pb-7 pt-3 flex flex-col gap-5">
          {filled.length === 0 && !hasPhotos && (
            <p className="py-8 text-center text-sm text-ink-soft">
              This hub hasn&apos;t filled in their full profile yet.
            </p>
          )}

          {filled.map(({ key, label, Icon }) => (
            <div key={key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={13} className="text-pine-soft shrink-0" />
                <span className="text-[10.5px] font-bold text-ink-soft uppercase tracking-widest">
                  {label}
                </span>
              </div>
              <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-wrap">
                {hub[key]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
