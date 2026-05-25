"use client";
import { OwnBoat, RouteState, Waypoint, MarkMetrics, StartLineMetrics, MarkType, RoundingDir, haversineNm, bearingDeg } from "../lib/mockData";

interface Props {
  boat: OwnBoat;
  routeState: RouteState;
  markMetrics: MarkMetrics | null;
  startMetrics: StartLineMetrics | null;
  onRouteChange: (r: RouteState) => void;
}

const TYPE_LABELS: Record<MarkType, string> = {
  "mark": "Mark",
  "start-port": "Start P",
  "start-stbd": "Start S",
};

const TYPE_CYCLE: MarkType[] = ["mark", "start-port", "start-stbd"];

function nextMarkName(waypoints: Waypoint[]): string {
  const marks = waypoints.filter(w => w.type === "mark");
  return `Mark ${marks.length + 1}`;
}

export default function WaypointPanel({ boat, routeState, markMetrics, startMetrics, onRouteChange }: Props) {
  const { waypoints, activeIndex } = routeState;

  function ping() {
    const id = crypto.randomUUID();
    const newMark: Waypoint = {
      id,
      name: nextMarkName(waypoints),
      lat: boat.lat,
      lon: boat.lon,
      type: "mark",
      roundingDir: "port",
    };
    const newWaypoints = [...waypoints, newMark];
    onRouteChange({ waypoints: newWaypoints, activeIndex: newWaypoints.length - 1 });
  }

  function deleteMark(idx: number) {
    const newWaypoints = waypoints.filter((_, i) => i !== idx);
    let newActive = activeIndex;
    if (activeIndex === idx) newActive = newWaypoints.length > 0 ? Math.min(idx, newWaypoints.length - 1) : -1;
    else if (activeIndex > idx) newActive = activeIndex - 1;
    onRouteChange({ waypoints: newWaypoints, activeIndex: newActive });
  }

  function setActive(idx: number) {
    onRouteChange({ ...routeState, activeIndex: activeIndex === idx ? -1 : idx });
  }

  function cycleType(idx: number) {
    const mark = waypoints[idx];
    const current = TYPE_CYCLE.indexOf(mark.type);
    const next = TYPE_CYCLE[(current + 1) % TYPE_CYCLE.length];
    const updated = waypoints.map((w, i) => i === idx ? { ...w, type: next } : w);
    onRouteChange({ ...routeState, waypoints: updated });
  }

  function toggleRounding(idx: number) {
    const updated = waypoints.map((w, i) =>
      i === idx ? { ...w, roundingDir: (w.roundingDir === "port" ? "starboard" : "port") as RoundingDir } : w
    );
    onRouteChange({ ...routeState, waypoints: updated });
  }

  function prev() {
    if (waypoints.length === 0) return;
    const next = activeIndex <= 0 ? waypoints.length - 1 : activeIndex - 1;
    onRouteChange({ ...routeState, activeIndex: next });
  }

  function next() {
    if (waypoints.length === 0) return;
    const nextIdx = activeIndex >= waypoints.length - 1 ? 0 : activeIndex + 1;
    onRouteChange({ ...routeState, activeIndex: nextIdx });
  }

  const activeMark = activeIndex >= 0 ? waypoints[activeIndex] : null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Marks</h2>
        <div className="flex items-center gap-2">
          {waypoints.length > 1 && (
            <>
              <button onClick={prev} className="min-h-[44px] px-3 py-2 rounded border border-gray-600 text-gray-400 hover:text-white text-sm font-mono active:bg-gray-700 transition-colors">← Prev</button>
              <button onClick={next} className="min-h-[44px] px-3 py-2 rounded border border-gray-600 text-gray-400 hover:text-white text-sm font-mono active:bg-gray-700 transition-colors">Next →</button>
            </>
          )}
          <button
            onClick={ping}
            className="min-h-[44px] px-4 py-2 rounded border border-green-600/60 text-green-400 hover:text-green-200 hover:border-green-400 active:bg-green-900/30 text-sm font-mono font-bold transition-colors"
          >
            + Ping
          </button>
        </div>
      </div>

      {/* Mark list */}
      {waypoints.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No marks. Tap + Ping to drop a mark at current position, or use Add Mark mode on the chart.</p>
      ) : (
        <div className="space-y-1">
          {waypoints.map((w, i) => {
            const dist = haversineNm(boat.lat, boat.lon, w.lat, w.lon);
            const brg = bearingDeg(boat.lat, boat.lon, w.lat, w.lon);
            const isActive = i === activeIndex;
            return (
              <div
                key={w.id}
                className={`flex items-center gap-2 px-3 py-3 rounded text-sm transition-colors cursor-pointer ${isActive ? "bg-blue-950/40 border border-blue-500/40" : "hover:bg-gray-800/50 active:bg-gray-800 border border-transparent"}`}
                onClick={() => setActive(i)}
              >
                <span className={`text-base ${isActive ? "text-blue-400" : "text-gray-500"}`}>{isActive ? "◉" : "○"}</span>
                <span className={`font-semibold min-w-[72px] text-sm ${isActive ? "text-white" : "text-gray-300"}`}>{w.name}</span>
                <span className="text-gray-500 font-mono text-sm">{dist.toFixed(2)}nm</span>
                <span className="text-gray-600 font-mono text-sm">{Math.round(brg)}°</span>
                <button
                  onClick={e => { e.stopPropagation(); cycleType(i); }}
                  className="min-h-[36px] px-2.5 py-1.5 rounded border border-gray-600 text-gray-400 hover:text-white text-sm font-mono active:bg-gray-700 transition-colors"
                >
                  {TYPE_LABELS[w.type]}
                </button>
                {w.type === "mark" && (
                  <button
                    onClick={e => { e.stopPropagation(); toggleRounding(i); }}
                    className="min-h-[36px] px-2.5 py-1.5 rounded border border-gray-600 text-gray-400 hover:text-white text-sm font-mono active:bg-gray-700 transition-colors"
                  >
                    {w.roundingDir === "port" ? "Port" : "Stbd"}
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); deleteMark(i); }}
                  className="ml-auto min-h-[36px] min-w-[36px] px-2.5 py-1.5 rounded border border-red-700/40 text-red-500 hover:text-red-300 text-sm font-mono active:bg-red-900/20 transition-colors"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Active mark metrics */}
      {activeMark && markMetrics && (
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Active → <span className="text-white font-semibold">{activeMark.name}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-800 rounded p-2 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Bearing</div>
              <div className="text-lg font-bold font-mono text-white">{Math.round(markMetrics.bearing)}°</div>
            </div>
            <div className="bg-gray-800 rounded p-2 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Dist</div>
              <div className="text-lg font-bold font-mono text-white">{markMetrics.distance.toFixed(2)}</div>
              <div className="text-xs text-gray-600">nm</div>
            </div>
            <div className="bg-gray-800 rounded p-2 text-center">
              <div className="text-xs text-gray-500 mb-0.5">TTM</div>
              <div className={`text-lg font-bold font-mono ${markMetrics.ttm < 999 ? "text-white" : "text-gray-600"}`}>
                {markMetrics.ttm < 999 ? markMetrics.ttm.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-gray-600">min</div>
            </div>
            <div className="bg-gray-800 rounded p-2 text-center">
              <div className="text-xs text-gray-500 mb-0.5">VMG↑</div>
              <div className={`text-lg font-bold font-mono ${markMetrics.vmgToMark > 0 ? "text-green-400" : "text-red-400"}`}>
                {markMetrics.vmgToMark.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600">kts</div>
            </div>
          </div>
        </div>
      )}

      {/* Start line metrics */}
      {startMetrics && (
        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Start Line</span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              startMetrics.biasEnd === "port" ? "bg-red-900/40 text-red-300" :
              startMetrics.biasEnd === "starboard" ? "bg-green-900/40 text-green-300" :
              "bg-gray-700 text-gray-400"
            }`}>
              {startMetrics.biasEnd === "port" ? `← Port +${startMetrics.biasDeg.toFixed(1)}°` :
               startMetrics.biasEnd === "starboard" ? `Stbd → +${startMetrics.biasDeg.toFixed(1)}°` :
               "Even"}
            </span>
            <span className="text-xs font-mono text-gray-400">
              {startMetrics.distToLine.toFixed(3)} nm to line
            </span>
            <span className="text-xs font-mono text-gray-400">
              TTB {startMetrics.timeToLine < 999 ? startMetrics.timeToLine.toFixed(1) : "—"} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
