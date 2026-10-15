import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if user already dismissed or installed recently
    const isDismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (isDismissed) return;

    // Detect iOS Safari (iOS doesn't trigger 'beforeinstallprompt')
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    if (iosDevice && !isStandalone) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // Android / Desktop Chrome / Brave / Edge event listener
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md">
        {/* App Icon Indicator */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white shadow-md">
          <Download className="h-6 w-6" />
        </div>

        {/* Text Content */}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-white">Install PujoMap App</h4>
          {isIOS ? (
            <p className="mt-0.5 text-xs text-slate-300 flex items-center gap-1">
              Tap <Share className="h-3 w-3 text-blue-400 inline" /> then{" "}
              <span className="font-semibold text-white">
                "Add to Home Screen"
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-300">
              Add to home screen for fast full-screen navigation
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && (
            <button
              onClick={handleInstallClick}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 text-xs font-bold text-slate-950 transition-all active:scale-95 shadow-md shadow-emerald-500/20"
            >
              Install
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
