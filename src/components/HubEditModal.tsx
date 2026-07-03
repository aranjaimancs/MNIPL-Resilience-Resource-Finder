"use client";

import { useState } from "react";
import {
  X,
  MapPin,
  ImagePlus,
  Check,
  BookOpen,
  Star,
  Globe,
  Heart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { FUNCS } from "@/lib/constants";
import type { Hub, HubFunction } from "@/lib/types";

interface EditDraft {
  name: string;
  faith: string;
  neighborhood: string;
  address: string;
  functions: HubFunction[];
  primaryFunction: HubFunction | null;
  hours: string;
  phone: string;
  website: string;
  note: string;
  about: string;
  experience: string;
  languages: string;
  accessibility: string;
}

const HOURS_OPTIONS = [
  "Open 24h during alerts",
  "Open 24 hours",
  "7am – 10pm",
  "7am – 9pm",
  "8am – 8pm",
  "8am – 6pm",
  "9am – 7pm",
  "9am – 6pm",
  "9am – 5pm",
  "Overnight (7pm – 8am)",
  "Daytime only",
  "During active alerts only",
];

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function HubEditModal({
  hub,
  onClose,
  onSave,
}: {
  hub: Hub;
  onClose: () => void;
  onSave: (updated: Hub) => void;
}) {
  const supabase = createClient();

  const [draft, setDraft] = useState<EditDraft>({
    name: hub.name,
    faith: hub.faith ?? "",
    neighborhood: hub.neighborhood ?? "",
    address: hub.address ?? "",
    functions: hub.functions as HubFunction[],
    primaryFunction: hub.primary_function ?? null,
    hours: hub.hours ?? "",
    phone: hub.phone ?? "",
    website: hub.website ?? "",
    note: hub.note ?? "",
    about: hub.about ?? "",
    experience: hub.experience ?? "",
    languages: hub.languages ?? "",
    accessibility: hub.accessibility ?? "",
  });

  // Images: track existing (already-uploaded URLs) and new files separately
  const [existingUrls, setExistingUrls] = useState<string[]>(hub.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalImages = existingUrls.length + newFiles.length;

  function toggleFunc(k: HubFunction) {
    setDraft((d) => {
      const next = d.functions.includes(k)
        ? d.functions.filter((x) => x !== k)
        : [...d.functions, k];
      return {
        ...d,
        functions: next,
        primaryFunction: d.primaryFunction === k && !next.includes(k) ? null : d.primaryFunction,
      };
    });
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX_MB = 5 * 1024 * 1024;
    const picked = Array.from(e.target.files ?? []);
    const invalid = picked.filter((f) => !ALLOWED.includes(f.type) || f.size > MAX_MB);
    if (invalid.length) {
      setError(`${invalid.length} file(s) skipped — only JPEG, PNG, or WebP under 5 MB are allowed.`);
    } else {
      setError(null);
    }
    const valid = picked.filter((f) => ALLOWED.includes(f.type) && f.size <= MAX_MB);
    const allowed = Math.max(0, 5 - totalImages);
    const added = valid.slice(0, allowed);
    setNewFiles((prev) => [...prev, ...added]);
    setNewPreviews((prev) => [...prev, ...added.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeExisting(idx: number) {
    setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeNew(idx: number) {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!draft.name || !draft.functions.length) return;
    setSaving(true);
    setError(null);

    // Re-geocode only if address actually changed
    let lat = hub.lat;
    let lng = hub.lng;
    if (draft.address !== (hub.address ?? "") && draft.address) {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: draft.address }),
      });
      if (res.ok) {
        const geo = await res.json();
        lat = geo.lat;
        lng = geo.lng;
      } else {
        setError("Couldn't find that address — please double-check it and try again.");
        setSaving(false);
        return;
      }
    }

    // Upload new images
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uploadedUrls: string[] = [];
    let uploadFailed = 0;
    for (const file of newFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("hub-images")
        .upload(path, file);
      if (!upErr) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("hub-images").getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      } else {
        uploadFailed++;
      }
    }
    if (uploadFailed > 0) {
      setError(`${uploadFailed} photo(s) failed to upload. You can try adding them again.`);
    }

    const { data, error: saveErr } = await supabase
      .from("hubs")
      .update({
        name: draft.name,
        faith: draft.faith || null,
        neighborhood: draft.neighborhood || null,
        address: draft.address || null,
        lat,
        lng,
        functions: draft.functions,
        primary_function: draft.primaryFunction ?? null,
        hours: draft.hours || null,
        phone: draft.phone || null,
        website: draft.website || null,
        note: draft.note || null,
        images: [...existingUrls, ...uploadedUrls],
        about: draft.about || null,
        experience: draft.experience || null,
        languages: draft.languages || null,
        accessibility: draft.accessibility || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", hub.id)
      .select()
      .single();

    if (saveErr) {
      setError(saveErr.message);
      setSaving(false);
      return;
    }

    newPreviews.forEach(URL.revokeObjectURL);
    onSave(data as Hub);
  }

  const canSave = draft.name.trim() && draft.functions.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center"
      style={{ background: "rgba(28,42,35,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-paper w-full sm:max-w-2xl sm:rounded-2xl sm:my-6 flex flex-col shadow-2xl max-h-screen sm:max-h-[90vh]">
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-[17px] text-ink leading-tight truncate">
              {hub.name}
            </div>
            <div className="text-xs text-ink-soft mt-0.5">Edit hub details</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-soft hover:bg-card hover:text-ink transition-colors shrink-0"
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Basic info ─────────────────────────────────────────── */}
          <section>
            <SectionLabel>Hub information</SectionLabel>
            <div className="space-y-3">
              <Field label="Congregation / site name *">
                <input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Faith tradition">
                  <input
                    value={draft.faith}
                    onChange={(e) => setDraft({ ...draft, faith: e.target.value })}
                    placeholder="e.g. Lutheran (ELCA)"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Neighborhood">
                  <input
                    value={draft.neighborhood}
                    onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value })}
                    placeholder="e.g. Seward"
                    style={inputStyle}
                  />
                </Field>
              </div>
              <Field label="Address">
                <div className="relative">
                  <input
                    value={draft.address}
                    onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                    placeholder="Street address, Minneapolis, MN"
                    style={inputStyle}
                  />
                  {hub.lat && hub.lng && draft.address === (hub.address ?? "") && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-green-600 flex items-center gap-1">
                      <MapPin size={11} /> Located
                    </span>
                  )}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Operating hours">
                  <select
                    value={draft.hours}
                    onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Select hours…</option>
                    {HOURS_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Phone">
                  <input
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    placeholder="(612) 555-0100"
                    style={inputStyle}
                  />
                </Field>
              </div>
              <Field label="Website">
                <input
                  type="url"
                  value={draft.website}
                  onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                  placeholder="https://yourchurch.org"
                  style={inputStyle}
                />
              </Field>
              <Field label="Notes for residents">
                <textarea
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder="Capacity, accessibility, special services…"
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              {/* Services */}
              <div>
                <div className="text-[12.5px] font-bold text-ink mb-2">
                  Services offered *
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(FUNCS) as HubFunction[]).map((k) => {
                    const f = FUNCS[k];
                    const Icon = f.Icon;
                    const on = draft.functions.includes(k);
                    return (
                      <button
                        type="button"
                        key={k}
                        onClick={() => toggleFunc(k)}
                        title={f.note}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                        style={{
                          border: `1px solid ${on ? f.color : "#DDD5C2"}`,
                          background: on ? f.color + "1A" : "#FBF8F0",
                          color: on ? f.color : "#4A5750",
                        }}
                      >
                        <Icon size={12} strokeWidth={2.6} /> {f.label}
                      </button>
                    );
                  })}
                </div>

                {/* Primary function picker */}
                {draft.functions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-border">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Star size={11} style={{ color: "#C49A1F" }} fill="#C49A1F" />
                      <span className="text-[12px] font-bold text-ink">Map pin color</span>
                    </div>
                    <p className="text-[11.5px] text-ink-soft mb-2">
                      Star the service that best represents your hub — residents will see this color on the map.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {draft.functions.map((k) => {
                        const f = FUNCS[k];
                        const Icon = f.Icon;
                        const isPrimary = draft.primaryFunction === k;
                        return (
                          <button
                            type="button"
                            key={k}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                primaryFunction: isPrimary ? null : k,
                              }))
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
                            style={{
                              border: `1.5px solid ${isPrimary ? f.color : "#DDD5C2"}`,
                              background: isPrimary ? f.color : "#FBF8F0",
                              color: isPrimary ? "#fff" : "#4A5750",
                              boxShadow: isPrimary ? `0 0 0 3px ${f.color}30` : "none",
                            }}
                          >
                            <Star
                              size={10}
                              strokeWidth={2.5}
                              fill={isPrimary ? "#fff" : "none"}
                              style={{ color: isPrimary ? "#fff" : "#C49A1F" }}
                            />
                            <Icon size={11} strokeWidth={2.6} />
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Photos ─────────────────────────────────────────────── */}
          <section>
            <SectionLabel>Photos</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {existingUrls.map((url, i) => (
                <div key={url} className="relative w-[72px] h-[72px]">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeExisting(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={9} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={src} className="relative w-[72px] h-[72px]">
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeNew(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={9} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {totalImages < 5 && (
                <label
                  className="w-[72px] h-[72px] flex flex-col items-center justify-center rounded-lg border border-dashed cursor-pointer transition-colors hover:bg-card"
                  style={{ borderColor: "#DDD5C2", color: "#8A9490" }}
                >
                  <ImagePlus size={18} />
                  <span className="text-[10px] mt-1">Add photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={handleImagePick}
                  />
                </label>
              )}
            </div>
            <p className="text-[11.5px] text-ink-soft">Up to 5 photos · JPEG, PNG, or WebP</p>
          </section>

          {/* ── Your story ─────────────────────────────────────────── */}
          <section>
            <SectionLabel>Your story</SectionLabel>
            <p className="text-[12.5px] text-ink-soft mb-3 leading-relaxed">
              Help residents feel comfortable before visiting. Each answer appears in the hub's
              detail panel on the public map.
            </p>
            <div className="space-y-4">
              <StoryField
                icon={BookOpen}
                label="What is your congregation's mission and values?"
                placeholder="Share your guiding principles and what makes your community unique…"
                value={draft.about}
                onChange={(v) => setDraft({ ...draft, about: v })}
              />
              <StoryField
                icon={Star}
                label="What experience does your congregation have serving the community during emergencies?"
                placeholder="Past events, volunteer capacity, relationships with local emergency services…"
                value={draft.experience}
                onChange={(v) => setDraft({ ...draft, experience: v })}
              />
              <StoryField
                icon={Globe}
                label="What languages are spoken here, and who do you especially welcome?"
                placeholder="e.g. English and Spanish spoken; Somali interpreter available on request…"
                value={draft.languages}
                onChange={(v) => setDraft({ ...draft, languages: v })}
              />
              <StoryField
                icon={Heart}
                label="What accessibility features or accommodations can visitors expect?"
                placeholder="e.g. Wheelchair ramp at main entrance, accessible restrooms, hearing loop…"
                value={draft.accessibility}
                onChange={(v) => setDraft({ ...draft, accessibility: v })}
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 py-4 border-t border-border shrink-0 bg-paper">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-ink-soft hover:bg-card transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-paper flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#1F4032" }}
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <Check size={15} /> Save changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold text-ink-soft uppercase tracking-widest mb-3">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12.5px] font-bold text-ink mb-1">{label}</div>
      {children}
    </label>
  );
}

function StoryField({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const words = wordCount(value);
  const over = words > 250;
  return (
    <div>
      <div className="flex items-start gap-1.5 mb-1.5">
        <Icon size={13} className="text-pine-soft mt-0.5 shrink-0" />
        <div className="text-[12.5px] font-semibold text-ink leading-snug">{label}</div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ ...inputStyle, resize: "vertical", fontSize: 13 }}
      />
      {value.trim() && (
        <div
          className="text-right text-[11px] mt-0.5 tabular-nums"
          style={{ color: over ? "#B8472E" : "#8A9490" }}
        >
          {words} / 250 words{over ? " — please shorten" : ""}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid #DDD5C2",
  background: "#FBF8F0",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "#1C2A23",
  boxSizing: "border-box",
};
