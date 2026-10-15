import { useState, useEffect } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Skip if user already installed or dismissed prompt
    const isDismissed = localStorage.getItem("pwa_prompt_dismissed");
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    if (isDismissed || isStandalone) return;

    // 2. Check if the event was already captured in main.jsx
    if (window.deferredPwaPrompt) {
      setDeferredPrompt(window.deferredPwaPrompt);
      setShowPrompt(true);
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (iosDevice) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // 4. Listen for future beforeinstallprompt events
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 5. Mobile Fallback: Force-show prompt on mobile after 1.5s if not standalone
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      );
    const timer = setTimeout(() => {
      if (isMobile && !isStandalone) {
        setShowPrompt(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPwaPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
    } else {
      // If browser doesn't expose native prompt, give user guidance
      alert(
        "To install PujoMap:\n1. Tap your browser menu (⋮ or share button)\n2. Select 'Add to Home screen' or 'Install app'",
      );
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-5 left-3 right-3 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white shadow-md">
          <Download className="h-5 w-5" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white">Install PujoMap App</h4>
          {isIOS ? (
            <p className="mt-0.5 text-[11px] text-slate-300 flex items-center gap-1">
              Tap <Share className="h-3 w-3 text-blue-400 inline" /> then{" "}
              <span className="font-semibold text-white">
                "Add to Home Screen"
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate-300">
              Add to home screen for full-screen navigation
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isIOS && (
            <button
              onClick={handleInstallClick}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-slate-950 transition-all active:scale-95 shadow-md"
            >
              Install
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
