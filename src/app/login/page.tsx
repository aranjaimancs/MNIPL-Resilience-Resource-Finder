"use client";

import { Suspense, useState } from "react";
import { MapPin, Mail, Lock, User, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only allow same-origin relative paths — reject external URLs and protocol-relative paths
  const rawRedirect = searchParams.get("redirect") ?? "/";
  const redirect = /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : "/";

  const supabase = createClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setLoading(false);
        router.push(redirect);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setMessage("Check your email to confirm your account.");
        setLoading(false);
      }
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img
            src="/mnipl-logo.png"
            alt="Minnesota Interfaith Power & Light"
            className="h-10 w-auto"
          />
          <div className="leading-tight">
            <div className="font-display font-semibold text-xl text-ink">Resilience Resources</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setMessage(null); }}
                className="flex-1 py-3.5 text-sm font-semibold transition-colors"
                style={{
                  color: tab === t ? "#1F4032" : "#4A5750",
                  borderBottom: tab === t ? "2px solid #1F4032" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-700">
                {message}
              </div>
            )}

            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 border border-border rounded-xl py-2.5 text-sm font-semibold text-ink bg-white hover:bg-paper transition-colors mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-ink-soft font-medium">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {tab === "signup" && (
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-ink-soft" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-paper text-sm text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
              )}
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-ink-soft" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-paper text-sm text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-ink-soft" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-paper text-sm text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-pine text-paper text-sm font-bold hover:bg-pine-soft transition-colors disabled:opacity-60"
              >
                {loading ? "Please wait…" : tab === "login" ? "Sign in" : "Create account"}
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            Back to map
          </a>
          <p className="text-xs text-ink-soft">
            Hub operators:{" "}
            <a href="mailto:info@mnipl.org" className="underline hover:text-ink">
              contact MNIPL
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
