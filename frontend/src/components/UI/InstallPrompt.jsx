import { useState, useEffect } from "react";
import { Download, X, Share, ExternalLink } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // 1. Skip if already running as an installed standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    if (isStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();

    // 2. Detect In-App WebViews (WhatsApp, Instagram, Facebook)
    const inApp = /instagram|fban|fbav|whatsapp|line|micromessenger|wv/i.test(
      userAgent,
    );
    if (inApp) {
      setIsInAppBrowser(true);
      setShowPrompt(true);
      return;
    }

    // 3. Check if native install event was already captured
    if (window.deferredPwaPrompt) {
      setDeferredPrompt(window.deferredPwaPrompt);
      setShowPrompt(true);
    }

    // 4. Detect genuine iOS (without native prompt support)
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (iosDevice && !window.deferredPwaPrompt) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    // 5. Event Listener for Android / Chrome / Samsung Internet
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
      setDeferredPrompt(e);
      setIsIOS(false); // Enable native button if browser supports it
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 6. Fallback: Show banner after 1s on mobile viewports
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      ) || window.innerWidth < 768;

    const timer = setTimeout(() => {
      if (isMobile) {
        setShowPrompt(true);
      }
    }, 1000);

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
      alert(
        "To install PujoMap:\n\n1. Tap the 3 dots (⋮) in your browser top right.\n2. Tap 'Add to Home screen' or 'Install app'.",
      );
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  const hasNativePrompt = Boolean(deferredPrompt || window.deferredPwaPrompt);

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none">
      <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white shadow-md">
          <Download className="h-5 w-5" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white">Install PujoMap App</h4>

          {isInAppBrowser ? (
            <p className="mt-0.5 text-[11px] text-amber-300 font-medium flex items-center gap-1">
              <ExternalLink className="h-3 w-3 inline shrink-0" />
              Tap <span className="font-bold">⋮</span> & select{" "}
              <span className="font-bold">"Open in Chrome"</span>
            </p>
          ) : isIOS && !hasNativePrompt ? (
            <p className="mt-0.5 text-[11px] text-slate-300">
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

        {/* Action Button */}
        <div className="flex items-center gap-1 shrink-0">
          {(!isIOS || hasNativePrompt) && !isInAppBrowser && (
            <button
              onClick={handleInstallClick}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition-all active:scale-95 shadow-md"
            >
              Install
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
