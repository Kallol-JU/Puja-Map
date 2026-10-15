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
import useMapStore from "../../store/useMapStore";

function describeManeuver(step) {
  if (!step) return { Icon: Navigation, label: "Head to destination" };

  const { type, modifier } = step;

  if (type === "arrive")
    return { Icon: MapPin, label: "Arrive at destination" };
  if (type === "depart") return { Icon: Navigation, label: "Start route" };
  if (type === "roundabout" || type === "rotary" || type === "roundabout turn")
    return { Icon: RotateCw, label: "Take roundabout" };

  switch (modifier) {
    case "left":
      return { Icon: ArrowLeft, label: "Turn left" };
    case "right":
      return { Icon: ArrowRight, label: "Turn right" };
    case "slight left":
      return {
        Icon: ArrowUpLeft,
        label: type === "fork" ? "Keep left" : "Bear left",
      };
    case "slight right":
      return {
        Icon: ArrowUpRight,
        label: type === "fork" ? "Keep right" : "Bear right",
      };
    case "sharp left":
      return { Icon: CornerUpLeft, label: "Sharp left" };
    case "sharp right":
      return { Icon: CornerUpRight, label: "Sharp right" };
    case "uturn":
      return { Icon: Undo2, label: "Make U-turn" };
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

export default function ActiveNavPanel({
  step,
  distance,
  destinationPandal,
  isRerouting = false,
}) {
  const clearNavigation = useMapStore((state) => state.clearNavigation);

  const activeStep = step || {
    type: "depart",
    instruction: destinationPandal
      ? `Heading to ${destinationPandal.name}`
      : "Follow blue route",
  };

  const { Icon, label } = describeManeuver(activeStep);
  const isArrival = activeStep.type === "arrive";
  const dist = formatDistance(distance);

  const headline = isRerouting
    ? "Rerouting…"
    : !isArrival && dist
      ? `${label} in ${dist}`
      : label;
  const secondary = isRerouting
    ? "Finding a new route"
    : activeStep.instruction;

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20">
        <Icon className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold leading-tight text-white">
          {headline}
        </p>
        {secondary && (
          <p className="mt-0.5 truncate text-xs font-medium leading-snug text-slate-300">
            {secondary}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => clearNavigation()}
        className="shrink-0 whitespace-nowrap rounded-xl border border-slate-700/60 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 shadow-sm transition-all hover:bg-red-600/90 hover:text-white active:scale-95"
      >
        Exit
      </button>
    </div>
  );
}
