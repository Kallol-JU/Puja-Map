import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  Undo2,
  RotateCw,
  Navigation,
  MapPin,
} from "lucide-react";

// Pick an icon + short verb phrase from Mapbox's maneuver type/modifier
function describeManeuver({ type, modifier }) {
  if (type === "arrive") return { Icon: MapPin, label: "Arrive at destination" };
  if (type === "depart") return { Icon: Navigation, label: "Start" };
  if (type === "roundabout" || type === "rotary" || type === "roundabout turn")
    return { Icon: RotateCw, label: "Take the roundabout" };

  switch (modifier) {
    case "left":
      return { Icon: ArrowLeft, label: "Turn left" };
    case "right":
      return { Icon: ArrowRight, label: "Turn right" };
    case "slight left":
      return { Icon: ArrowUpLeft, label: type === "fork" ? "Keep left" : "Bear left" };
    case "slight right":
      return { Icon: ArrowUpRight, label: type === "fork" ? "Keep right" : "Bear right" };
    case "sharp left":
      return { Icon: CornerUpLeft, label: "Sharp left" };
    case "sharp right":
      return { Icon: CornerUpRight, label: "Sharp right" };
    case "uturn":
      return { Icon: Undo2, label: "Make a U-turn" };
    case "straight":
    default:
      return { Icon: ArrowUp, label: "Continue straight" };
  }
}

function formatDistance(meters) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function ActiveNavPanel({ step, distance, onEnd }) {
  if (!step) return null;

  const { Icon, label } = describeManeuver(step);
  const isArrival = step.type === "arrive";
  const dist = formatDistance(distance);

  // "Turn left in 100 m" once we have a GPS fix, otherwise just "Turn left"
  const headline = !isArrival && dist ? `${label} in ${dist}` : label;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-4 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-xl ring-1 ring-white/10">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
          <Icon className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold leading-tight">{headline}</p>
          {step.instruction && (
            <p className="mt-0.5 truncate text-sm text-slate-300">{step.instruction}</p>
          )}
        </div>

        {onEnd && (
          <button
            type="button"
            onClick={onEnd}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            End
          </button>
        )}
      </div>
    </div>
  );
}
