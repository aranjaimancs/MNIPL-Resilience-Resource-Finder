"use client";

import { useState, useMemo } from "react";
import {
  MapPin,
  Building2,
  ClipboardList,
  Users,
  Search,
  ChevronDown,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import type { ManagedUser } from "@/app/admin/users/page";

// ── Role display config ────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────

export function UserManagement({
  users: initialUsers,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [confirmPromotion, setConfirmPromotion] = useState<{
    user: ManagedUser;
    newRole: Role;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    id: string;
    message: string;
    ok: boolean;
  } | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function changeRole(targetUser: ManagedUser, newRole: Role) {
    setConfirmPromotion(null);
    setOpenDropdown(null);
    setLoadingId(targetUser.id);

    const { error } = await supabase.rpc("admin_set_role", {
      target_id: targetUser.id,
      new_role: newRole,
    });

    if (error) {
      setFeedback({ id: targetUser.id, message: error.message, ok: false });
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      setFeedback({
        id: targetUser.id,
        message: `${targetUser.email} is now ${ROLES[newRole].label}`,
        ok: true,
      });
      setTimeout(() => setFeedback(null), 3500);
    }

    setLoadingId(null);
  }

  function requestRoleChange(targetUser: ManagedUser, newRole: Role) {
    if (newRole === targetUser.role) { setOpenDropdown(null); return; }
    // Promoting to mnipl_admin deserves an extra confirmation step
    if (newRole === "mnipl_admin") {
      setOpenDropdown(null);
      setConfirmPromotion({ user: targetUser, newRole });
      return;
    }
    changeRole(targetUser, newRole);
  }

  const isSelf = (u: ManagedUser) => u.id === currentUserId;

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
            className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold opacity-70 hover:opacity-100 text-paper transition-opacity"
          >
            <ClipboardList size={15} /> <span className="hidden sm:inline">Review queue</span>
          </a>
          <a
            href="/admin/users"
            className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-sm font-semibold bg-paper text-pine"
          >
            <Users size={15} /> <span className="hidden sm:inline">Users</span>
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

      <main className="max-w-3xl mx-auto w-full p-5 sm:p-6">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-2">
          <Users size={22} className="text-pine" />
          <div>
            <h1 className="font-display font-semibold text-2xl text-ink">Manage users</h1>
            <p className="text-sm text-ink-soft mt-0.5">
              {users.length} account{users.length !== 1 ? "s" : ""} · change roles to grant or
              remove dashboard access
            </p>
          </div>
        </div>

        {/* Role legend */}
        <div className="flex flex-wrap gap-2 mt-3 mb-5">
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

        {/* Toast feedback */}
        {feedback && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${
              feedback.ok
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {feedback.ok ? "✓" : "✗"} {feedback.message}
          </div>
        )}

        {/* User list */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-soft">
            No users match your search.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((u) => {
              const roleInfo = ROLES[u.role as Role] ?? ROLES.resident;
              const busy = loadingId === u.id;
              const self = isSelf(u);

              return (
                <div
                  key={u.id}
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  {/* Avatar initials */}
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
                      {self && (
                        <span className="ml-1.5 text-[10px] font-bold text-ink-soft uppercase tracking-wide">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-soft truncate">{u.email}</div>
                  </div>

                  {/* Role control */}
                  {self ? (
                    // Can't change your own role — show a static pill
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
                          {/* Click-away backdrop */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdown(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[200px]">
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
                                    className="mt-0.5 w-2 h-2 rounded-full shrink-0"
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

      {/* Confirm mnipl_admin promotion modal */}
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
                  approve hubs, reject submissions, and manage all other users — including
                  promoting others to admin.
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
                onClick={() =>
                  changeRole(confirmPromotion.user, confirmPromotion.newRole)
                }
                className="flex-1 py-2.5 rounded-[9px] text-sm font-bold text-paper transition-colors"
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
