"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default true until we check

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    const wasDismissed = localStorage.getItem("pwa_install_dismissed") === "1";
    if (wasDismissed) return;

    // iOS detection (Safari doesn't fire beforeinstallprompt)
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOSDevice) {
      setIsIOS(true);
      setDismissed(false);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    const appInstalledHandler = () => setDismissed(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", appInstalledHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  function handleDismiss() {
    localStorage.setItem("pwa_install_dismissed", "1");
    setDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDismissed(true);
    } else {
      handleDismiss();
    }
    setDeferredPrompt(null);
  }

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-pine text-paper text-sm shrink-0">
      <Download size={15} className="shrink-0 opacity-80" />
      <span className="flex-1">
        {isIOS ? (
          <>
            <strong>Save for offline use</strong> — tap{" "}
            <strong>Share</strong> then <strong>Add to Home Screen</strong>.
          </>
        ) : (
          <>
            <strong>Save for offline use</strong> — install this app so you can find
            hubs even without internet during an emergency.
          </>
        )}
      </span>
      {!isIOS && (
        <button
          onClick={handleInstall}
          className="px-3 py-1 rounded-md bg-paper text-pine font-semibold text-xs shrink-0"
        >
          Install
        </button>
      )}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}
