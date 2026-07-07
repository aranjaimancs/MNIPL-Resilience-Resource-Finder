"use client";

import { useState, useMemo } from "react";
import {
  MapPin,
  Building2,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Clock,
  Phone,
  Globe,
  Users,
  Search,
  ChevronDown,
  LogOut,
  BookOpen,
  Star,
  Heart,
  Pencil,
  Check,
  X,
  LayoutList,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { FUNCS, primaryFunc } from "@/lib/constants";
import { FuncTag } from "@/components/ui/FuncTag";
import { DEFAULT_PROFILE_QUESTIONS } from "@/lib/profileQuestions";
import type { Hub, HubFunction, ManagedUser, ProfileQuestion } from "@/lib/types";

// Profile sections shown in the review queue — mirrors HubProfileModal
const PROFILE_SECTIONS_REVIEW: {
  key: "about" | "experience" | "languages" | "accessibility";
  label: string;
  Icon: React.ElementType;
}[] = [
  { key: "about",         label: "Mission & values",            Icon: BookOpen },
  { key: "experience",    label: "Emergency experience",        Icon: Star     },
  { key: "languages",     label: "Languages & communities",     Icon: Globe    },
  { key: "accessibility", label: "Accessibility",               Icon: Heart    },
];

// ── Role config ────────────────────────────────────────────────────────────

const ROLES = {
  resident: {
    label: "No access",
    description: "Can only view the public map",
    color: "#6B756D",
    bg: "#6B756D1A",
  },
  hub_admin: {
    label: "Hub Manager",
    description: "Can register and manage their own hubs",
    color: "#2E7FB8",
    bg: "#2E7FB81A",
  },
  mnipl_admin: {
    label: "MNIPL Admin",
    description: "Full access — can approve hubs and manage all users",
    color: "#1F4032",
    bg: "#1F40321A",
  },
} as const;

type Role = keyof typeof ROLES;

// ── Main component ─────────────────────────────────────────────────────────

type Tab = "review" | "hubs" | "users" | "questions";

export function ReviewClient({
  hubs: initialHubs,
  allHubs: initialAllHubs,
  users: initialUsers,
  currentUserId,
}: {
  hubs: Hub[];
  allHubs: Hub[];
  users: ManagedUser[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("review");

  // Hub review state
  const [hubs, setHubs] = useState(initialHubs);

  // All hubs management state
  const [allHubs, setAllHubs] = useState(initialAllHubs);
  const [hubSearch, setHubSearch] = useState("");
  const [confirmDeleteHub, setConfirmDeleteHub] = useState<Hub | null>(null);
  const [deletingHub, setDeletingHub] = useState(false);
  const [hubLoading, setHubLoading] = useState<string | null>(null);

  // Hub assignment state
  const [assignTarget, setAssignTarget] = useState<Hub | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  // User management state
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [userLoading, setUserLoading] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [confirmPromotion, setConfirmPromotion] = useState<{
    user: ManagedUser;
    newRole: Role;
  } | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);

  // Questions management state
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [editingQuestionKey, setEditingQuestionKey] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState({ question: "", placeholder: "" });
  const [questionSaving, setQuestionSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // ── Hub review actions ───────────────────────────────────────────────────

  async function approve(hubId: string) {
    setHubLoading(hubId);
    const { error } = await supabase.rpc("approve_hub", { hub_id: hubId });
    if (!error) {
      setHubs((prev) => prev.filter((h) => h.id !== hubId));
    } else {
      alert("Error approving hub: " + error.message);
    }
    setHubLoading(null);
  }

  async function rejectHub(hubId: string) {
    if (!confirm("Delete this hub permanently?")) return;
    setHubLoading(hubId);
    const { error } = await supabase.from("hubs").delete().eq("id", hubId);
    if (!error) {
      setHubs((prev) => prev.filter((h) => h.id !== hubId));
    } else {
      alert("Error deleting hub: " + error.message);
    }
    setHubLoading(null);
  }

  async function deleteVerifiedHub(hub: Hub) {
    setDeletingHub(true);
    const { error } = await supabase.from("hubs").delete().eq("id", hub.id);
    if (!error) {
      setAllHubs((prev) => prev.filter((h) => h.id !== hub.id));
    } else {
      alert("Error deleting hub: " + error.message);
    }
    setConfirmDeleteHub(null);
    setDeletingHub(false);
  }

  async function assignOwner(hub: Hub, newOwnerId: string) {
    setAssigning(true);
    const { error } = await supabase
      .from("hubs")
      .update({ owner_id: newOwnerId, updated_at: new Date().toISOString() })
      .eq("id", hub.id);

    if (error) {
      setAssignFeedback({ message: error.message, ok: false });
    } else {
      setAllHubs((prev) =>
        prev.map((h) => (h.id === hub.id ? { ...h, owner_id: newOwnerId } : h))
      );
      const newOwner = users.find((u) => u.id === newOwnerId);
      setAssignFeedback({
        message: `${hub.name} assigned to ${newOwner?.email ?? "new owner"}`,
        ok: true,
      });
      setAssignTarget(null);
      setAssignSearch("");
      setTimeout(() => setAssignFeedback(null), 4000);
    }
    setAssigning(false);
  }

  // ── User management actions ──────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function changeRole(targetUser: ManagedUser, newRole: Role) {
    setConfirmPromotion(null);
    setOpenDropdown(null);
    setUserLoading(targetUser.id);

    const { error } = await supabase.rpc("admin_set_role", {
      target_id: targetUser.id,
      new_role: newRole,
    });

    if (error) {
      setRoleFeedback({ message: error.message, ok: false });
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      setRoleFeedback({
        message: `${targetUser.email} is now ${ROLES[newRole].label}`,
        ok: true,
      });
      setTimeout(() => setRoleFeedback(null), 3500);
    }
    setUserLoading(null);
  }

  function requestRoleChange(targetUser: ManagedUser, newRole: Role) {
    if (newRole === targetUser.role) { setOpenDropdown(null); return; }
    if (newRole === "mnipl_admin") {
      setOpenDropdown(null);
      setConfirmPromotion({ user: targetUser, newRole });
      return;
    }
    changeRole(targetUser, newRole);
  }

  // ── Hub profile editing ──────────────────────────────────────────────────

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    about: "", experience: "", languages: "", accessibility: "",
  });

  function startEditProfile(hub: Hub) {
    setEditingProfileId(hub.id);
    setProfileDraft({
      about:         hub.about         ?? "",
      experience:    hub.experience    ?? "",
      languages:     hub.languages     ?? "",
      accessibility: hub.accessibility ?? "",
    });
  }

  async function saveProfile(hubId: string) {
    setHubLoading(hubId);
    const { error } = await supabase
      .from("hubs")
      .update({
        about:         profileDraft.about         || null,
        experience:    profileDraft.experience    || null,
        languages:     profileDraft.languages     || null,
        accessibility: profileDraft.accessibility || null,
      })
      .eq("id", hubId);

    if (error) {
      alert("Could not save profile: " + error.message);
    } else {
      setHubs((prev) =>
        prev.map((h) =>
          h.id === hubId
            ? {
                ...h,
                about:         profileDraft.about         || null,
                experience:    profileDraft.experience    || null,
                languages:     profileDraft.languages     || null,
                accessibility: profileDraft.accessibility || null,
              }
            : h
        )
      );
      setEditingProfileId(null);
    }
    setHubLoading(null);
  }

  // ── Questions management ─────────────────────────────────────────────────

  async function loadQuestions() {
    if (questionsLoaded) return;
    const { data } = await supabase
      .from("profile_questions")
      .select("*")
      .order("display_order");
    setQuestions((data as ProfileQuestion[]) ?? DEFAULT_PROFILE_QUESTIONS);
    setQuestionsLoaded(true);
  }

  function startEditQuestion(q: ProfileQuestion) {
    setEditingQuestionKey(q.key);
    setQuestionDraft({ question: q.question, placeholder: q.placeholder });
  }

  async function saveQuestion(key: string) {
    setQuestionSaving(true);
    const { error } = await supabase
      .from("profile_questions")
      .update({ question: questionDraft.question, placeholder: questionDraft.placeholder })
      .eq("key", key);
    if (error) {
      alert("Could not save: " + error.message);
    } else {
      setQuestions((prev) =>
        prev.map((q) => q.key === key ? { ...q, ...questionDraft } : q)
      );
      setEditingQuestionKey(null);
    }
    setQuestionSaving(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col font-sans text-ink bg-paper min-h-screen">

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
        <div className="ml-auto flex items-center gap-1">
          <a
            href="/"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold opacity-70 hover:opacity-100 text-paper transition-opacity"
          >
            <MapPin size={15} /> Find a hub
          </a>
          <a
            href="/admin"
            className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold opacity-70 hover:opacity-100 text-paper transition-opacity"
          >
            <Building2 size={15} /> <span className="hidden sm:inline">Hub dashboard</span>
          </a>
          <a
            href="/admin/review"
            className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold bg-paper text-pine"
          >
            <ShieldCheck size={15} /> <span className="hidden sm:inline">MNIPL Admin</span>
          </a>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-sm font-semibold opacity-60 hover:opacity-100 text-paper transition-opacity"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-border bg-paper shrink-0">
        <button
          onClick={() => setTab("review")}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
          style={{
            color: tab === "review" ? "#1F4032" : "#4A5750",
            borderBottom: tab === "review" ? "2px solid #1F4032" : "2px solid transparent",
          }}
        >
          <ShieldCheck size={15} />
          Review Queue
          {hubs.length > 0 && (
            <span
              className="ml-0.5 min-w-[18px] h-[18px] rounded-full text-[10.5px] font-bold flex items-center justify-center px-1"
              style={{ background: "#C08A1A1A", color: "#C08A1A" }}
            >
              {hubs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("hubs")}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
          style={{
            color: tab === "hubs" ? "#1F4032" : "#4A5750",
            borderBottom: tab === "hubs" ? "2px solid #1F4032" : "2px solid transparent",
          }}
        >
          <LayoutList size={15} />
          Manage Hubs
          <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full text-[10.5px] font-bold flex items-center justify-center px-1 bg-[#1F40321A] text-[#1F4032]">
            {allHubs.length}
          </span>
        </button>
        <button
          onClick={() => setTab("users")}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
          style={{
            color: tab === "users" ? "#1F4032" : "#4A5750",
            borderBottom: tab === "users" ? "2px solid #1F4032" : "2px solid transparent",
          }}
        >
          <Users size={15} />
          Manage Users
        </button>
        <button
          onClick={() => { setTab("questions"); loadQuestions(); }}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
          style={{
            color: tab === "questions" ? "#1F4032" : "#4A5750",
            borderBottom: tab === "questions" ? "2px solid #1F4032" : "2px solid transparent",
          }}
        >
          <Pencil size={15} />
          Profile Questions
        </button>
      </div>

      {/* ── Review Queue tab ─────────────────────────────────────────────── */}
      {tab === "review" && (
        <main className="max-w-3xl mx-auto w-full p-5 sm:p-6">
          <p className="text-sm text-ink-soft mb-5">
            {hubs.length === 0
              ? "All caught up — no hubs pending review."
              : `${hubs.length} hub${hubs.length !== 1 ? "s" : ""} awaiting verification.`}
          </p>

          {hubs.length === 0 && (
            <div className="py-16 text-center text-ink-soft">
              <ShieldCheck size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nothing to review right now.</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {hubs.map((hub) => {
              const pf = primaryFunc(hub.functions as HubFunction[], hub.primary_function);
              const f = FUNCS[pf];
              const Icon = f.Icon;
              const busy = hubLoading === hub.id;

              return (
                <div key={hub.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="h-1.5" style={{ background: f.color }} />
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: f.color + "1F", color: f.color }}
                      >
                        <Icon size={20} strokeWidth={2.5} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-base text-ink">{hub.name}</h2>
                        <p className="text-sm text-ink-soft">
                          {hub.faith}{hub.faith && hub.neighborhood ? " · " : ""}{hub.neighborhood}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full shrink-0"
                        style={{ color: "#C08A1A", background: "#C08A1A1A" }}
                      >
                        <AlertTriangle size={11} /> Pending
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(hub.functions as HubFunction[]).map((fn) => (
                        <FuncTag key={fn} fn={fn} size="sm" />
                      ))}
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5 text-sm text-ink-soft">
                      {hub.address && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="shrink-0 text-pine-soft" />
                          {hub.address}
                          {hub.lat && hub.lng && (
                            <span className="text-xs text-green-600 font-medium">✓ geocoded</span>
                          )}
                        </div>
                      )}
                      {hub.hours && (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="shrink-0 text-pine-soft" /> {hub.hours}
                        </div>
                      )}
                      {hub.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="shrink-0 text-pine-soft" /> {hub.phone}
                        </div>
                      )}
                      {hub.website && /^https?:\/\//.test(hub.website) && (
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="shrink-0 text-pine-soft" />
                          <a
                            href={hub.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate"
                          >
                            {hub.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                      {hub.note && <p className="mt-1 leading-relaxed">{hub.note}</p>}
                    </div>

                    {hub.images && hub.images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto mt-3 -mx-5 px-5 pb-0.5">
                        {hub.images.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`${hub.name} photo ${i + 1}`}
                            className="h-32 w-48 object-cover rounded-lg shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    {/* Hub Profile — MNIPL can view & edit before publishing */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">
                          Hub profile
                        </span>
                        {editingProfileId !== hub.id ? (
                          <button
                            onClick={() => startEditProfile(hub)}
                            className="flex items-center gap-1 text-[12px] font-semibold text-pine-soft hover:text-pine transition-colors"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingProfileId(null)}
                              className="flex items-center gap-1 text-[12px] font-semibold text-ink-soft hover:text-ink transition-colors"
                            >
                              <X size={12} /> Cancel
                            </button>
                            <button
                              onClick={() => saveProfile(hub.id)}
                              disabled={busy}
                              className="flex items-center gap-1 text-[12px] font-bold text-pine hover:text-pine-soft transition-colors disabled:opacity-50"
                            >
                              <Check size={12} /> Save
                            </button>
                          </div>
                        )}
                      </div>

                      {editingProfileId === hub.id ? (
                        <div className="flex flex-col gap-3">
                          {PROFILE_SECTIONS_REVIEW.map(({ key, label }) => (
                            <div key={key}>
                              <div className="text-[11.5px] font-semibold text-ink mb-1">{label}</div>
                              <textarea
                                value={profileDraft[key]}
                                onChange={(e) =>
                                  setProfileDraft((d) => ({ ...d, [key]: e.target.value }))
                                }
                                rows={3}
                                placeholder="Leave blank to clear…"
                                className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-[13px] text-ink placeholder-ink-soft resize-y focus:outline-none focus:ring-2 focus:ring-pine/20"
                                style={{ fontFamily: "inherit" }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {PROFILE_SECTIONS_REVIEW.map(({ key, label, Icon }) => {
                            const val = hub[key as keyof Hub] as string | null;
                            return (
                              <div key={key}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Icon size={12} className="text-pine-soft shrink-0" />
                                  <span className="text-[10.5px] font-bold text-ink-soft uppercase tracking-wide">
                                    {label}
                                  </span>
                                </div>
                                {val ? (
                                  <p className="text-[13px] text-ink leading-relaxed">{val}</p>
                                ) : (
                                  <p className="text-[12.5px] text-ink-soft italic">Not filled in</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 mt-4">
                      <button
                        onClick={() => approve(hub.id)}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-paper transition-colors disabled:opacity-50"
                        style={{ background: "#1F4032" }}
                      >
                        <ShieldCheck size={16} />
                        {busy ? "Approving…" : "Approve & publish"}
                      </button>
                      <button
                        onClick={() => rejectHub(hub.id)}
                        disabled={busy}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border border-border text-ink-soft hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={15} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* ── Manage Hubs tab ──────────────────────────────────────────────── */}
      {tab === "hubs" && (
        <main className="max-w-3xl mx-auto w-full p-5 sm:p-6">
          <p className="text-sm text-ink-soft mb-4">
            {allHubs.length} published hub{allHubs.length !== 1 ? "s" : ""} · assign each hub to its manager's account so they can control status and details
          </p>

          {assignFeedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${
                assignFeedback.ok
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {assignFeedback.ok ? "✓" : "✗"} {assignFeedback.message}
            </div>
          )}

          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, neighborhood, or faith community…"
              value={hubSearch}
              onChange={(e) => setHubSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-pine/20"
            />
          </div>

          {(() => {
            const q = hubSearch.trim().toLowerCase();
            const filtered = q
              ? allHubs.filter(
                  (h) =>
                    h.name.toLowerCase().includes(q) ||
                    h.neighborhood?.toLowerCase().includes(q) ||
                    h.faith?.toLowerCase().includes(q)
                )
              : allHubs;

            if (filtered.length === 0) {
              return (
                <div className="py-16 text-center text-sm text-ink-soft">
                  No hubs match your search.
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-2">
                {filtered.map((hub) => {
                  const pf = primaryFunc(hub.functions as HubFunction[], hub.primary_function);
                  const f = FUNCS[pf];
                  const Icon = f.Icon;

                  return (
                    <div
                      key={hub.id}
                      className="bg-card border border-border rounded-xl overflow-hidden flex items-stretch"
                    >
                      {/* Color strip */}
                      <div className="w-1 shrink-0" style={{ background: f.color }} />

                      <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                        {/* Icon */}
                        <span
                          className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                          style={{ background: f.color + "1F", color: f.color }}
                        >
                          <Icon size={17} strokeWidth={2.5} />
                        </span>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-ink truncate">{hub.name}</div>
                          <div className="text-xs text-ink-soft truncate">
                            {[hub.faith, hub.neighborhood, hub.address].filter(Boolean).join(" · ")}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(hub.functions as HubFunction[]).map((fn) => (
                              <FuncTag key={fn} fn={fn} size="sm" />
                            ))}
                          </div>
                          {/* Owner line */}
                          {(() => {
                            const owner = users.find((u) => u.id === hub.owner_id);
                            return (
                              <div className="mt-1.5 flex items-center gap-1">
                                <Users size={10} className="text-ink-soft shrink-0" />
                                <span className="text-[11px] text-ink-soft truncate">
                                  {owner
                                    ? owner.email
                                    : hub.owner_id
                                    ? "Unknown account"
                                    : "Unassigned"}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Status badge */}
                        <span
                          className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: hub.status === "open" ? "#1F40321A" : hub.status === "limited" ? "#C08A1A1A" : "#6B756D1A",
                            color: hub.status === "open" ? "#1F4032" : hub.status === "limited" ? "#C08A1A" : "#6B756D",
                          }}
                        >
                          {hub.status}
                        </span>

                        {/* Assign owner */}
                        <button
                          onClick={() => { setAssignTarget(hub); setAssignSearch(""); }}
                          title="Assign to hub manager"
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-ink-soft hover:bg-card hover:text-pine transition-colors"
                        >
                          <UserPlus size={15} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setConfirmDeleteHub(hub)}
                          title="Delete hub"
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </main>
      )}

      {/* ── Manage Users tab ─────────────────────────────────────────────── */}
      {tab === "users" && (
        <main className="max-w-3xl mx-auto w-full p-5 sm:p-6">
          <p className="text-sm text-ink-soft mb-4">
            {users.length} account{users.length !== 1 ? "s" : ""} · change a role to grant or
            remove dashboard access
          </p>

          {/* Role legend */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ color: ROLES[r].color, background: ROLES[r].bg }}
              >
                {ROLES[r].label}
                <span className="font-normal opacity-70">— {ROLES[r].description}</span>
              </span>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-pine/20"
            />
          </div>

          {/* Feedback toast */}
          {roleFeedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${
                roleFeedback.ok
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {roleFeedback.ok ? "✓" : "✗"} {roleFeedback.message}
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-soft">
              No users match your search.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredUsers.map((u) => {
                const roleInfo = ROLES[u.role as Role] ?? ROLES.resident;
                const busy = userLoading === u.id;
                const isSelf = u.id === currentUserId;

                return (
                  <div
                    key={u.id}
                    className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
                  >
                    {/* Avatar initial */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                      style={{ background: roleInfo.bg, color: roleInfo.color }}
                    >
                      {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                    </div>

                    {/* Name + email */}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-ink truncate">
                        {u.full_name ?? (
                          <span className="text-ink-soft italic">No name</span>
                        )}
                        {isSelf && (
                          <span className="ml-1.5 text-[10px] font-bold text-ink-soft uppercase tracking-wide">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-soft truncate">{u.email}</div>
                    </div>

                    {/* Role pill / dropdown */}
                    {isSelf ? (
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                        style={{ color: roleInfo.color, background: roleInfo.bg }}
                        title="You cannot change your own role"
                      >
                        {roleInfo.label}
                      </span>
                    ) : (
                      <div className="relative shrink-0">
                        <button
                          disabled={busy}
                          onClick={() =>
                            setOpenDropdown(openDropdown === u.id ? null : u.id)
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50"
                          style={{
                            color: roleInfo.color,
                            background: roleInfo.bg,
                            borderColor: roleInfo.color + "33",
                          }}
                        >
                          {busy ? "Saving…" : roleInfo.label}
                          {!busy && <ChevronDown size={11} strokeWidth={2.5} />}
                        </button>

                        {openDropdown === u.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdown(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[210px]">
                              {(Object.keys(ROLES) as Role[]).map((r) => {
                                const ri = ROLES[r];
                                const current = u.role === r;
                                return (
                                  <button
                                    key={r}
                                    onClick={() => requestRoleChange(u, r)}
                                    className="w-full text-left px-3.5 py-2.5 hover:bg-paper transition-colors flex items-start gap-2.5"
                                  >
                                    <span
                                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                                      style={{
                                        background: current ? ri.color : "transparent",
                                        outline: `1.5px solid ${ri.color}`,
                                      }}
                                    />
                                    <span>
                                      <span
                                        className="block text-xs font-bold"
                                        style={{ color: ri.color }}
                                      >
                                        {ri.label}
                                        {current && (
                                          <span className="ml-1 font-normal text-ink-soft">
                                            (current)
                                          </span>
                                        )}
                                      </span>
                                      <span className="block text-[11px] text-ink-soft mt-0.5">
                                        {ri.description}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ── Profile Questions tab ────────────────────────────────────────── */}
      {tab === "questions" && (
        <main className="max-w-3xl mx-auto w-full p-5 sm:p-6">
          <p className="text-sm text-ink-soft mb-1">
            These are the questions hub admins answer when registering their congregation.
            Editing them here updates the form immediately for all future submissions.
          </p>
          <p className="text-xs text-ink-soft mb-5 italic">
            Note: the four question slots are fixed — only the wording can be changed here.
            Adding or removing questions requires a database migration.
          </p>

          {!questionsLoaded ? (
            <div className="py-16 text-center text-sm text-ink-soft animate-pulse">
              Loading questions…
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {questions.map((q, i) => {
                const isEditing = editingQuestionKey === q.key;
                return (
                  <div key={q.key} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="h-1" style={{ background: `hsl(${160 + i * 30}, 40%, 38%)` }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-[11px] font-bold text-ink-soft uppercase tracking-widest mt-1">
                          Question {i + 1} · <code className="font-mono normal-case">{q.key}</code>
                        </span>
                        {!isEditing ? (
                          <button
                            onClick={() => startEditQuestion(q)}
                            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-pine-soft hover:text-pine transition-colors shrink-0"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                        ) : (
                          <div className="flex gap-2.5 shrink-0">
                            <button
                              onClick={() => setEditingQuestionKey(null)}
                              className="flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft hover:text-ink transition-colors"
                            >
                              <X size={13} /> Cancel
                            </button>
                            <button
                              onClick={() => saveQuestion(q.key)}
                              disabled={questionSaving || !questionDraft.question.trim()}
                              className="flex items-center gap-1 text-[12.5px] font-bold text-pine hover:text-pine-soft disabled:opacity-50 transition-colors"
                            >
                              <Check size={13} /> Save
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="block text-[12px] font-bold text-ink mb-1">
                              Question text (shown to hub admins)
                            </label>
                            <textarea
                              value={questionDraft.question}
                              onChange={(e) =>
                                setQuestionDraft((d) => ({ ...d, question: e.target.value }))
                              }
                              rows={2}
                              className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-[13px] text-ink resize-y focus:outline-none focus:ring-2 focus:ring-pine/20"
                              style={{ fontFamily: "inherit" }}
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold text-ink mb-1">
                              Placeholder hint (shown inside the text box)
                            </label>
                            <textarea
                              value={questionDraft.placeholder}
                              onChange={(e) =>
                                setQuestionDraft((d) => ({ ...d, placeholder: e.target.value }))
                              }
                              rows={2}
                              className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-[13px] text-ink resize-y focus:outline-none focus:ring-2 focus:ring-pine/20"
                              style={{ fontFamily: "inherit" }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-[14px] font-semibold text-ink leading-snug">
                            {q.question}
                          </p>
                          <p className="text-[12.5px] text-ink-soft italic">
                            Hint: {q.placeholder || "—"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ── Assign hub owner modal ──────────────────────────────────────── */}
      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28,42,35,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAssignTarget(null);
              setAssignSearch("");
            }
          }}
        >
          <div className="bg-paper rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
              <span className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 bg-pine/10 text-pine mt-0.5">
                <UserPlus size={17} strokeWidth={2.2} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-[16px] text-ink leading-tight truncate">
                  Assign "{assignTarget.name}"
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  Choose which account manages this hub
                </p>
              </div>
              <button
                onClick={() => { setAssignTarget(null); setAssignSearch(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-soft hover:bg-card transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-border shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by name or email…"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-sm text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-pine/20"
                />
              </div>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-1.5">
              {(() => {
                const q = assignSearch.trim().toLowerCase();
                const filtered = users.filter(
                  (u) =>
                    (!q ||
                      u.email?.toLowerCase().includes(q) ||
                      u.full_name?.toLowerCase().includes(q))
                );

                if (filtered.length === 0) {
                  return (
                    <p className="text-sm text-ink-soft text-center py-8">
                      No users match your search.
                    </p>
                  );
                }

                return filtered.map((u) => {
                  const isCurrentOwner = u.id === assignTarget.owner_id;
                  const roleInfo = ROLES[u.role as Role] ?? ROLES.resident;
                  return (
                    <button
                      key={u.id}
                      disabled={assigning || isCurrentOwner}
                      onClick={() => assignOwner(assignTarget, u.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all disabled:cursor-default"
                      style={{
                        borderColor: isCurrentOwner ? "#1F4032" : "#DDD5C2",
                        background: isCurrentOwner ? "#1F40320A" : "#FBF8F0",
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs"
                        style={{ background: roleInfo.bg, color: roleInfo.color }}
                      >
                        {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                      </div>

                      {/* Name + email + role */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">
                          {u.full_name ?? <span className="text-ink-soft italic">No name</span>}
                        </div>
                        <div className="text-xs text-ink-soft truncate">{u.email}</div>
                      </div>

                      {/* Role pill */}
                      <span
                        className="shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: roleInfo.color, background: roleInfo.bg }}
                      >
                        {roleInfo.label}
                      </span>

                      {/* Current owner checkmark */}
                      {isCurrentOwner && (
                        <Check size={15} strokeWidth={2.5} style={{ color: "#1F4032" }} className="shrink-0" />
                      )}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border shrink-0">
              <button
                onClick={() => { setAssignTarget(null); setAssignSearch(""); }}
                className="w-full py-2.5 rounded-[10px] border border-border text-sm font-semibold text-ink-soft hover:bg-card transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm hub deletion modal */}
      {confirmDeleteHub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28,42,35,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteHub(null); }}
        >
          <div className="bg-paper rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 bg-red-50 text-red-500">
                <Trash2 size={18} strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-display font-semibold text-[17px] text-ink">Delete hub?</div>
                <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                  <b className="text-ink">{confirmDeleteHub.name}</b> will be permanently removed from the public map. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteHub(null)}
                disabled={deletingHub}
                className="flex-1 py-2.5 rounded-[9px] border border-border text-sm font-semibold text-ink-soft hover:bg-card transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteVerifiedHub(confirmDeleteHub)}
                disabled={deletingHub}
                className="flex-1 py-2.5 rounded-[9px] text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingHub ? "Deleting…" : "Delete hub"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm MNIPL Admin promotion modal */}
      {confirmPromotion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28,42,35,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmPromotion(null);
          }}
        >
          <div className="bg-paper rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
                <AlertTriangle size={18} strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-display font-semibold text-[17px] text-ink">
                  Make MNIPL Admin?
                </div>
                <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                  <b className="text-ink">{confirmPromotion.user.email}</b> will be able to
                  approve hubs, reject submissions, and manage all other users.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmPromotion(null)}
                className="flex-1 py-2.5 rounded-[9px] border border-border text-sm font-semibold text-ink-soft hover:bg-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => changeRole(confirmPromotion.user, confirmPromotion.newRole)}
                className="flex-1 py-2.5 rounded-[9px] text-sm font-bold text-paper"
                style={{ background: "#1F4032" }}
              >
                Yes, make admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
