"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  User,
  Building2,
  Plus,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  Trash2,
  Pencil,
  X,
  ImagePlus,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { FUNCS, STATUS, primaryFunc } from "@/lib/constants";
import { HubEditModal } from "@/components/HubEditModal";
import type { Hub, HubFunction, HubStatus } from "@/lib/types";

interface HubForm {
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

const EMPTY_FORM: HubForm = {
  name: "",
  faith: "",
  neighborhood: "",
  address: "",
  functions: [],
  primaryFunction: null,
  hours: "",
  phone: "",
  website: "",
  note: "",
  about: "",
  experience: "",
  languages: "",
  accessibility: "",
};

export default function AdminPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [form, setForm] = useState<HubForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [isMniplAdmin, setIsMniplAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Hub | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<Hub | null>(null);
  const [tab, setTab] = useState<"hubs" | "register">("hubs");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login?redirect=/admin"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

      // Residents have no admin access — send them back to the map
      if (!profile || profile.role === "resident") {
        router.replace("/?access=pending");
        return;
      }

      setIsMniplAdmin(profile?.role === "mnipl_admin");

      const { data } = await supabase
        .from("hubs").select("*").eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setHubs((data as Hub[]) ?? []);
    }
    load();
  }, []);

  function toggleFunc(k: HubFunction) {
    setForm((f) => {
      const next = f.functions.includes(k)
        ? f.functions.filter((x) => x !== k)
        : [...f.functions, k];
      return {
        ...f,
        functions: next,
        primaryFunction: f.primaryFunction === k && !next.includes(k) ? null : f.primaryFunction,
      };
    });
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX_MB = 5 * 1024 * 1024;
    const picked = Array.from(e.target.files ?? []);
    const invalid = picked.filter((f) => !ALLOWED.includes(f.type) || f.size > MAX_MB);
    if (invalid.length) {
      setSubmitError(`${invalid.length} file(s) skipped — only JPEG, PNG, or WebP under 5 MB are allowed.`);
    } else {
      setSubmitError(null);
    }
    const valid = picked.filter((f) => ALLOWED.includes(f.type) && f.size <= MAX_MB);
    const combined = [...imageFiles, ...valid].slice(0, 5);
    setImageFiles(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  }

  function removeImage(i: number) {
    URL.revokeObjectURL(imagePreviews[i]);
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.functions.length) return;
    setSubmitting(true);
    setSubmitError(null);

    const { data: { user } } = await supabase.auth.getUser();

    let lat: number | null = null;
    let lng: number | null = null;
    if (form.address) {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: form.address }),
      });
      if (res.ok) {
        const geo = await res.json();
        lat = geo.lat;
        lng = geo.lng;
      } else {
        const msg = await res.json().catch(() => ({}));
        setSubmitError(msg.error ?? "Couldn't find that address on the map — please double-check it and try again.");
        setSubmitting(false);
        return;
      }
    }

    const imageUrls: string[] = [];
    let uploadFailed = 0;
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("hub-images").upload(path, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("hub-images").getPublicUrl(path);
        imageUrls.push(publicUrl);
      } else {
        uploadFailed++;
      }
    }
    if (uploadFailed > 0) {
      setSubmitError(`${uploadFailed} photo(s) failed to upload and were not saved. You can add them again from the edit screen.`);
    }

    const { data, error } = await supabase
      .from("hubs")
      .insert({
        owner_id: user!.id,
        name: form.name,
        faith: form.faith || null,
        neighborhood: form.neighborhood || null,
        address: form.address || null,
        lat, lng,
        functions: form.functions,
        primary_function: form.primaryFunction ?? null,
        status: "open",
        verified: false,
        hours: form.hours || null,
        phone: form.phone || null,
        website: form.website || null,
        note: form.note || null,
        images: imageUrls,
        about: form.about || null,
        experience: form.experience || null,
        languages: form.languages || null,
        accessibility: form.accessibility || null,
      })
      .select().single();

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setHubs((prev) => [data as Hub, ...prev]);
    setJustAdded(form.name);
    setForm(EMPTY_FORM);
    imagePreviews.forEach(URL.revokeObjectURL);
    setImageFiles([]);
    setImagePreviews([]);
    setSubmitting(false);
    setTab("hubs");
  }

  async function updateStatus(hubId: string, status: HubStatus) {
    setUpdatingId(hubId);
    const { error } = await supabase
      .from("hubs").update({ status, updated_at: new Date().toISOString() }).eq("id", hubId);
    if (error) {
      alert(`Couldn't update status: ${error.message}`);
    } else {
      setHubs((prev) => prev.map((h) => (h.id === hubId ? { ...h, status } : h)));
    }
    setUpdatingId(null);
  }

  async function deleteHub() {
    if (!deleteTarget || deleteConfirm !== deleteTarget.name) return;
    setDeleting(true);
    const { data: deleted, error } = await supabase
      .from("hubs").delete().eq("id", deleteTarget.id).select("id");
    if (error) {
      alert(`Could not remove hub: ${error.message}`);
    } else if (!deleted || deleted.length === 0) {
      alert("Could not remove hub — make sure migration 004 has been applied.");
    } else {
      setHubs((prev) => prev.filter((h) => h.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirm("");
    }
    setDeleting(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col font-sans text-ink bg-paper min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────── */}
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
        <div className="ml-auto flex items-center gap-1">
          <a href="/" className="hidden sm:flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold opacity-70 hover:opacity-100 text-paper transition-opacity">
            <User size={15} /> Find a hub
          </a>
          <a href="/admin" className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold bg-paper text-pine">
            <Building2 size={15} /> <span className="hidden sm:inline">Hub admin</span>
          </a>
          {isMniplAdmin && (
            <a href="/admin/review" className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold opacity-70 hover:opacity-100 text-paper transition-opacity">
              <ShieldCheck size={15} /> <span className="hidden sm:inline">MNIPL Admin</span>
            </a>
          )}
          <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-sm font-semibold opacity-60 hover:opacity-100 text-paper transition-opacity" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border bg-paper shrink-0">
        <button
          onClick={() => setTab("hubs")}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
          style={{
            color: tab === "hubs" ? "#1F4032" : "#4A5750",
            borderBottom: tab === "hubs" ? "2px solid #1F4032" : "2px solid transparent",
          }}
        >
          <Building2 size={15} />
          My Hub{hubs.length > 1 ? "s" : ""}
          {hubs.length > 0 && (
            <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full text-[10.5px] font-bold flex items-center justify-center px-1 bg-card text-ink-soft">
              {hubs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("register")}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
          style={{
            color: tab === "register" ? "#1F4032" : "#4A5750",
            borderBottom: tab === "register" ? "2px solid #1F4032" : "2px solid transparent",
          }}
        >
          <Plus size={15} />
          Register a hub
        </button>
      </div>

      {/* ── My Hubs tab ─────────────────────────────────────────────────── */}
      {tab === "hubs" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-5 py-6">

            {justAdded && (
              <div className="flex gap-2 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-800 mb-5">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-green-600" />
                <span><b>{justAdded}</b> submitted — pending MNIPL verification.</span>
              </div>
            )}

            {hubs.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
                  <Building2 size={24} className="text-ink-soft opacity-50" />
                </div>
                <p className="font-semibold text-ink mb-1">No hubs yet</p>
                <p className="text-sm text-ink-soft mb-5">
                  Register your congregation to appear on the map.
                </p>
                <button
                  onClick={() => setTab("register")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-paper"
                  style={{ background: "#1F4032" }}
                >
                  <Plus size={15} /> Register your hub
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {hubs.map((hub) => {
                  const pf = primaryFunc(hub.functions as HubFunction[], hub.primary_function);
                  const f = FUNCS[pf];
                  const Icon = f.Icon;
                  const isLive = hub.verified;

                  return (
                    <div key={hub.id} className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                      <div className="h-1.5" style={{ background: isLive ? f.color : "#DDD5C2" }} />
                      <div className="p-5">

                        {/* Identity */}
                        <div className="flex items-center gap-3 mb-5">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: isLive ? f.color + "18" : "#F0EBE0", color: isLive ? f.color : "#A8A098" }}
                          >
                            <Icon size={22} strokeWidth={2.3} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[16px] text-ink leading-tight">{hub.name}</div>
                            <div className="text-[13px] text-ink-soft mt-0.5">
                              {[hub.neighborhood, hub.faith].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ color: "#1A7A50", background: "#1A7A5012" }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1A7A50" }} />
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ color: "#B87B10", background: "#B87B1012" }}>
                              <AlertTriangle size={10} /> Pending
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="mb-5">
                          <div className="text-[11px] font-bold text-ink-soft uppercase tracking-widest mb-2.5">
                            Current status
                          </div>
                          {isLive ? (
                            <div className="grid grid-cols-2 gap-2">
                              {(Object.keys(STATUS) as HubStatus[]).map((s) => {
                                const st = STATUS[s];
                                const on = hub.status === s;
                                return (
                                  <button
                                    key={s}
                                    onClick={() => updateStatus(hub.id, s)}
                                    disabled={updatingId === hub.id}
                                    className="py-3 rounded-xl text-[13px] font-bold border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      borderColor: on ? st.color : "#E8E2D8",
                                      background: on ? st.color + "12" : "#FDFBF7",
                                      color: on ? st.color : "#9BA59F",
                                      boxShadow: on ? `0 0 0 3px ${st.color}18` : "none",
                                    }}
                                  >
                                    {updatingId === hub.id ? "…" : st.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border bg-paper px-4 py-3.5 text-sm text-ink-soft leading-relaxed">
                              Status controls unlock once MNIPL approves your hub. You&apos;ll receive an email when it goes live.
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-border">
                          <button
                            onClick={() => setEditTarget(hub)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-card border border-border text-ink hover:bg-[#EDE8DF] transition-colors"
                          >
                            <Pencil size={13} strokeWidth={2.3} /> Edit hub
                          </button>
                          <button
                            onClick={() => { setDeleteTarget(hub); setDeleteConfirm(""); }}
                            className="px-3.5 py-2.5 rounded-xl border border-border text-ink-soft hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Remove hub"
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => setTab("register")}
                  className="w-full py-3 rounded-xl border border-dashed border-border text-sm font-semibold text-ink-soft hover:text-ink hover:border-ink-soft transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Register another hub
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Register tab ────────────────────────────────────────────────── */}
      {tab === "register" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-5 py-6">

            <div className="mb-5">
              <h1 className="font-display font-semibold text-xl text-ink">Register your hub</h1>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                Add your congregation to the map. Submissions are reviewed by MNIPL before going live.
              </p>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <FormField label="Congregation / site name *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Grace Lutheran"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Faith tradition">
                <input
                  value={form.faith}
                  onChange={(e) => setForm({ ...form, faith: e.target.value })}
                  placeholder="e.g. Lutheran (ELCA)"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Neighborhood">
                <input
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  placeholder="e.g. Seward"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Address">
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street address, Minneapolis, MN"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Operating hours">
                <select
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select hours…</option>
                  <option value="Open 24h during alerts">Open 24h during alerts</option>
                  <option value="Open 24 hours">Open 24 hours</option>
                  <option value="7am – 10pm">7am – 10pm</option>
                  <option value="7am – 9pm">7am – 9pm</option>
                  <option value="8am – 8pm">8am – 8pm</option>
                  <option value="8am – 6pm">8am – 6pm</option>
                  <option value="9am – 7pm">9am – 7pm</option>
                  <option value="9am – 6pm">9am – 6pm</option>
                  <option value="9am – 5pm">9am – 5pm</option>
                  <option value="Overnight (7pm – 8am)">Overnight (7pm – 8am)</option>
                  <option value="Daytime only">Daytime only</option>
                  <option value="During active alerts only">During active alerts only</option>
                </select>
              </FormField>
              <FormField label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(612) 555-0100"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Website">
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://yourchurch.org"
                  style={inputStyle}
                />
              </FormField>

              {/* Photos */}
              <div>
                <div className="text-[12.5px] font-bold text-ink mb-1.5">
                  Photos <span className="font-normal text-ink-soft">(optional, up to 5 · JPEG/PNG/WebP)</span>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative w-[68px] h-[68px]">
                        <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-border" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X size={9} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageFiles.length < 5 && (
                  <label
                    className="flex items-center gap-2 px-3 py-2.5 rounded-[9px] border border-dashed cursor-pointer"
                    style={{ borderColor: "#DDD5C2", background: "#FBF8F0", color: "#4A5750", fontSize: 13.5 }}
                  >
                    <ImagePlus size={15} />
                    {imageFiles.length === 0 ? "Add photos" : "Add more photos"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleImagePick} />
                  </label>
                )}
              </div>

              <FormField label="Notes for residents">
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Capacity, accessibility, special services…"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </FormField>

              {/* Services */}
              <div>
                <div className="text-[12.5px] font-bold text-ink mb-2">What does your hub offer? *</div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(FUNCS) as HubFunction[]).map((k) => {
                    const f = FUNCS[k];
                    const Icon = f.Icon;
                    const on = form.functions.includes(k);
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

                {/* Primary function picker — only shown once ≥1 service is selected */}
                {form.functions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-border">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Star size={11} style={{ color: "#C49A1F" }} fill="#C49A1F" />
                      <span className="text-[12px] font-bold text-ink">Map pin color</span>
                    </div>
                    <p className="text-[11.5px] text-ink-soft mb-2">
                      Star the service that best represents your hub — residents will see this color on the map.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.functions.map((k) => {
                        const f = FUNCS[k];
                        const Icon = f.Icon;
                        const isPrimary = form.primaryFunction === k;
                        return (
                          <button
                            type="button"
                            key={k}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
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

              {/* Tell your story */}
              <div className="border-t border-dashed border-border pt-4 mt-1 flex flex-col gap-3">
                <div>
                  <div className="text-[13px] font-bold text-ink">
                    Tell your story <span className="font-normal text-ink-soft">(optional)</span>
                  </div>
                  <p className="text-[12px] text-ink-soft mt-0.5 leading-relaxed">
                    Help residents feel comfortable before visiting. These answers appear in a
                    &ldquo;Learn more&rdquo; panel on the public map. Each answer should be 250 words or fewer.
                  </p>
                </div>
                <ProfileTextarea
                  label="What is your congregation's mission and values?"
                  placeholder="Share your guiding principles and what makes your community unique…"
                  value={form.about}
                  onChange={(v) => setForm({ ...form, about: v })}
                />
                <ProfileTextarea
                  label="What experience does your congregation have serving the community during emergencies?"
                  placeholder="Past events, volunteer capacity, relationships with local emergency services…"
                  value={form.experience}
                  onChange={(v) => setForm({ ...form, experience: v })}
                />
                <ProfileTextarea
                  label="What languages are spoken here, and who do you especially welcome?"
                  placeholder="e.g. English and Spanish spoken; Somali interpreter available on request…"
                  value={form.languages}
                  onChange={(v) => setForm({ ...form, languages: v })}
                />
                <ProfileTextarea
                  label="What accessibility features or accommodations can visitors expect?"
                  placeholder="e.g. Wheelchair ramp at main entrance, accessible restrooms, hearing loop…"
                  value={form.accessibility}
                  onChange={(v) => setForm({ ...form, accessibility: v })}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !form.name || !form.functions.length}
                className="w-full mt-2 py-3 rounded-[10px] font-bold text-sm text-paper flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#1F4032" }}
              >
                <Plus size={17} />
                {submitting ? "Submitting…" : "Submit for verification"}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ── Edit modal ──────────────────────────────────────────────────── */}
      {editTarget && (
        <HubEditModal
          hub={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => {
            setHubs((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
            setEditTarget(null);
          }}
        />
      )}

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28,42,35,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setDeleteTarget(null); setDeleteConfirm(""); } }}
        >
          <div className="bg-paper rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 bg-red-50 text-red-600">
                <Trash2 size={18} strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-display font-semibold text-[17px] text-ink">Remove hub</div>
                <p className="text-sm text-ink-soft mt-0.5 leading-relaxed">
                  This will permanently delete <b className="text-ink">{deleteTarget.name}</b> and cannot be undone.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-ink mb-1">
                Type the hub name to confirm
              </label>
              <input
                autoFocus
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") deleteHub();
                  if (e.key === "Escape") { setDeleteTarget(null); setDeleteConfirm(""); }
                }}
                placeholder={deleteTarget.name}
                style={inputStyle}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}
                className="flex-1 py-2.5 rounded-[9px] border border-border text-sm font-semibold text-ink-soft hover:bg-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteHub}
                disabled={deleteConfirm !== deleteTarget.name || deleting}
                className="flex-1 py-2.5 rounded-[9px] text-sm font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#B8472E" }}
              >
                {deleting ? "Removing…" : "Remove hub"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12.5px] font-bold text-ink mb-1">{label}</div>
      {children}
    </label>
  );
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function ProfileTextarea({
  label, placeholder, value, onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const words = wordCount(value);
  const over = words > 250;
  return (
    <div>
      <div className="text-[12px] font-semibold text-ink mb-1 leading-snug">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ ...inputStyle, resize: "vertical", fontSize: 13 }}
      />
      {value.trim() && (
        <div className="text-right text-[11px] mt-0.5 tabular-nums" style={{ color: over ? "#B8472E" : "#8A9490" }}>
          {words} / 250 words{over ? " — please shorten" : ""}
        </div>
      )}
    </div>
  );
}
