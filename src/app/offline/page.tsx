export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-paper text-ink px-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-pine flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F4EFE3"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="font-display font-semibold text-2xl">You&apos;re offline</h1>
        <p className="text-ink-soft max-w-sm leading-relaxed">
          Visit the Resilience Resources app while you have internet to save hub
          locations and the map for offline use. Then it will work even during
          an emergency.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl px-5 py-4 max-w-sm text-left space-y-2">
        <p className="text-sm font-semibold text-ink">To prepare for next time:</p>
        <ol className="text-sm text-ink-soft space-y-1 list-decimal list-inside">
          <li>Open the app while connected to Wi-Fi</li>
          <li>Browse the map around your neighborhood</li>
          <li>Install the app to your home screen</li>
        </ol>
      </div>

      <a
        href="/"
        className="px-5 py-2.5 bg-pine text-paper rounded-lg font-semibold text-sm"
      >
        Try again
      </a>
    </div>
  );
}
