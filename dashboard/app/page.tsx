"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import OwnBoatPanel from "./components/OwnBoatPanel";
import TacticalTable from "./components/TacticalTable";
import WindOverlayPanel from "./components/WindOverlayPanel";
import RaceMapLoader from "./components/RaceMapLoader";
import PerformancePanel from "./components/PerformancePanel";
import StartTimer from "./components/StartTimer";
import WindTrendPanel from "./components/WindTrendPanel";
import SailChartPanel from "./components/SailChartPanel";
import WaypointPanel from "./components/WaypointPanel";
import TimelinePanel from "./components/TimelinePanel";
import GuideModal from "./components/GuideModal";
import SignalKSettings from "./components/SignalKSettings";
import YellowbrickSettings from "./components/YellowbrickSettings";
import PredictWindSettings, { PredictWindConfig } from "./components/PredictWindSettings";
import WindyMapLoader from "./components/WindyMapLoader";
import { useSimulatedLiveData, SimSpeedRate, SIM_SPEED_RATES } from "./lib/useSimulatedLiveData";
import { useHrrrArchive } from "./lib/useHrrrArchive";
import { useSignalKLiveData } from "./lib/useSignalKLiveData";
import { useYellowbrickData, YBConfig, normName } from "./lib/useYellowbrickData";
import { RouteState, defaultRouteState, Waypoint, polarTarget, OwnBoat, WindCell, TargetSource } from "./lib/mockData";
import {
  CaptureFrame, RaceSession, BUFFER_MAX,
  frameFromLiveData, loadSessions, saveSessions, computeWindShiftHistory,
} from "./lib/captureBuffer";

const LS_KEY = "rambler_waypoints";

function loadRouteState(): RouteState {
  if (typeof window === "undefined") return defaultRouteState;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as RouteState;
  } catch { /* ignore */ }
  return defaultRouteState;
}

export default function Home() {
  // ── Route / waypoints ──────────────────────────────────────────────────────
  const [routeState, setRouteState] = useState<RouteState>(defaultRouteState);

  const handleRouteChange = useCallback((r: RouteState) => {
    setRouteState(r);
    try { localStorage.setItem(LS_KEY, JSON.stringify(r)); } catch { /* ignore */ }
  }, []);

  const handleAddWaypoint = useCallback((lat: number, lon: number) => {
    setRouteState(prev => {
      const existing = prev.waypoints.filter(w => w.type === "mark");
      const newMark: Waypoint = {
        id: crypto.randomUUID(),
        name: `Mark ${existing.length + 1}`,
        lat, lon, type: "mark", roundingDir: "port",
      };
      const newWaypoints = [...prev.waypoints, newMark];
      const next = { waypoints: newWaypoints, activeIndex: newWaypoints.length - 1 };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ── Signal K connection ────────────────────────────────────────────────────
  const [signalkUrl, setSignalkUrl] = useState<string>("");
  const [showSkSettings, setShowSkSettings] = useState(false);

  const handleSkUrlChange = useCallback((url: string) => {
    setSignalkUrl(url);
    try { localStorage.setItem("rambler_signalk_url", url); } catch { /* ignore */ }
  }, []);

  // ── Local vs Vercel mode ──────────────────────────────────────────────────
  // On Pi (local): SK-only, no simulation fallback — show real data or waiting state
  // On Vercel:     SK with simulation fallback (Mac 2025 fleet for planning/testing)
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);

  // ── Yellowbrick race feed ──────────────────────────────────────────────────
  const LS_YB_KEY = "rambler_yb_config";
  const [ybConfig, setYbConfig] = useState<YBConfig | null>(null);
  const [showYbSettings, setShowYbSettings] = useState(false);

  // ── PredictWind Weather Routing ────────────────────────────────────────────
  const LS_PW_KEY = "rambler_pw_config";
  const [pwConfig, setPwConfig] = useState<PredictWindConfig>({ email: "", token: "", models: ["PWG", "PWE", "ECMWF", "GFS"] });
  const [showPwSettings, setShowPwSettings] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwErrorMessage, setPwErrorMessage] = useState<string | null>(null);
  const [pwRoutes, setPwRoutes] = useState<any | null>(null);

  // Load configuration from localStorage on mount (prevents Next.js SSR hydration warnings)
  useEffect(() => {
    setRouteState(loadRouteState());
    setSignalkUrl(localStorage.getItem("rambler_signalk_url") ?? "");
    
    const host = window.location.hostname;
    const isLocal = !host.includes("vercel.app") && 
                    host !== "rambler99.vercel.app" && 
                    host !== "localhost" && 
                    host !== "127.0.0.1";
    setIsLocalMode(isLocal);

    try {
      const raw = localStorage.getItem("rambler_yb_config");
      if (raw) {
        const c = JSON.parse(raw) as YBConfig;
        if (c.raceId) setYbConfig(c);
      }
    } catch { /* ignore */ }

    try {
      const rawPw = localStorage.getItem("rambler_pw_config");
      if (rawPw) {
        setPwConfig(JSON.parse(rawPw) as PredictWindConfig);
      }
      const rawRoutes = localStorage.getItem("rambler_pw_routes");
      if (rawRoutes) {
        setPwRoutes(JSON.parse(rawRoutes));
        setPwStatus("success");
      }
    } catch { /* ignore */ }
  }, []);

  // ── Live data (Signal K if connected, simulation fallback on Vercel) ───────
  const [simSpeed, setSimSpeed] = useState<SimSpeedRate>(1);
  const skData = useSignalKLiveData(signalkUrl || null, routeState);
  const isSignalKConnected = skData?.connected ?? false;
  const skStatus = skData?.status ?? "disconnected";
  // Real wind only for simulated mode — disabled when Signal K is live or on Pi
  const hrrrArchive = useHrrrArchive(!isSignalKConnected && !isLocalMode);
  const simData = useSimulatedLiveData(
    routeState,
    simSpeed,
    hrrrArchive.status === "ok" ? hrrrArchive.raceStartGrid : undefined
  );
  // Local Pi: use SK only — no sim fallback (empty state when no instruments)
  // Vercel:   use SK with sim fallback
  const liveData = isLocalMode ? (skData ?? simData) : (skData ?? simData);
  const isWaitingForInstruments = isLocalMode && !skData;
  const [alarmThreshold, setAlarmThreshold] = useState(85);

  const handleYbConfigChange = useCallback((cfg: YBConfig) => {
    const next = cfg.raceId ? cfg : null;
    setYbConfig(next);
    try { localStorage.setItem(LS_YB_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, []);

  const handlePwConfigChange = useCallback((cfg: PredictWindConfig) => {
    setPwConfig(cfg);
    try { localStorage.setItem(LS_PW_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, []);

  const handleCalculatePredictWindRoute = useCallback(async () => {
    const activeWp = routeState.waypoints[routeState.activeIndex];
    const destination = activeWp || routeState.waypoints[routeState.waypoints.length - 1] || { lat: 45.85, lon: -84.72 };

    setPwStatus("loading");
    setPwErrorMessage(null);

    try {
      const queryParams = new URLSearchParams({
        email: pwConfig.email,
        password: pwConfig.token,
        startLat: String(liveData.boat.lat),
        startLon: String(liveData.boat.lon),
        endLat: String(destination.lat),
        endLon: String(destination.lon),
        models: pwConfig.models.join(","),
      });

      const response = await fetch(`/api/predictwind?${queryParams.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setPwRoutes(result.routes);
      setPwStatus("success");
      try { localStorage.setItem("rambler_pw_routes", JSON.stringify(result.routes)); } catch { /* ignore */ }
    } catch (err: any) {
      setPwStatus("error");
      setPwErrorMessage(err.message || "Failed to calculate route");
    }
  }, [pwConfig, routeState, liveData.boat]);

  const ybData = useYellowbrickData(ybConfig, liveData.boat, routeState);

  // Merge AIS/sim targets with Yellowbrick (AIS within 5nm takes precedence)
  const mergedTargets = useMemo(() => {
    // On local Pi with no instruments: show no fleet (don't show sim fleet on boat)
    if (isWaitingForInstruments) return [];
    const aisSource: TargetSource = skData ? "ais" : "simulated";
    const tagged = liveData.targets.map(t => ({ ...t, source: aisSource }));
    if (!ybData || ybData.targets.length === 0) return tagged;
    const nearbyNames = new Set(tagged.filter(t => t.distance < 5).map(t => normName(t.name)));
    return [...tagged, ...ybData.targets.filter(t => !nearbyNames.has(normName(t.name)))];
  }, [liveData.targets, ybData, skData]);

  // ── Capture buffer (ring buffer, never causes re-renders) ──────────────────
  const captureBufferRef = useRef<CaptureFrame[]>([]);
  const [bufferTick, setBufferTick] = useState(0); // increments each frame, drives TimelinePanel

  useEffect(() => {
    const pct = Math.round((liveData.boat.bsp / polarTarget(liveData.boat.tws, Math.abs(liveData.boat.twa))) * 100);
    const vmg = parseFloat((liveData.boat.bsp * Math.cos((Math.abs(liveData.boat.twa) * Math.PI) / 180)).toFixed(2));
    const frame = frameFromLiveData(liveData.boat, mergedTargets, liveData.windGrid, pct, vmg);
    const buf = captureBufferRef.current;
    if (buf.length >= BUFFER_MAX) buf.shift();
    buf.push(frame);
    setBufferTick(t => t + 1);
  }, [liveData.boat, mergedTargets]); // fires every 2s when boat state ticks

  // ── Replay state ───────────────────────────────────────────────────────────
  const [replayIndex, setReplayIndex] = useState(-1);

  // Reconstruct historical data when replaying
  const displayData = useMemo(() => {
    const buf = captureBufferRef.current;
    if (replayIndex < 0 || buf.length === 0) {
      return {
        boat: liveData.boat,
        boatTrail: liveData.boatTrail,
        targets: liveData.targets,
        windGrid: liveData.windGrid,
        twdHistory: liveData.twdHistory,
        polarHistory: liveData.polarHistory,
        windShiftHistory: liveData.windShiftHistory,
        vmgHistory: liveData.vmgHistory,
        markMetrics: liveData.markMetrics,
        startMetrics: liveData.startMetrics,
      };
    }

    const idx = Math.min(replayIndex, buf.length - 1);
    const frame = buf[idx];
    const winStart = Math.max(0, idx - 59);
    const window = buf.slice(winStart, idx + 1);

    const replayBoat: OwnBoat = {
      sog: frame.sog, cog: frame.cog, bsp: frame.bsp,
      twa: frame.twa, tws: frame.tws, twd: frame.twd,
      depth: frame.depth, lat: frame.lat, lon: frame.lon,
    };

    const replayTrail = window.map(f => [f.lat, f.lon] as [number, number]);

    const replayTargets = frame.targets.map(t => ({
      mmsi: t.mmsi, name: t.name,
      lat: t.lat, lon: t.lon,
      sog: t.sog, cog: t.cog,
      distance: t.dist, bearing: t.bearing,
      closingRate: t.closingRate,
      effectiveWindAngle: Math.abs(((t.cog - frame.twd + 360) % 360) - 180),
      isHigher: frame.twa < Math.abs(((t.cog - frame.twd + 360) % 360) - 180),
      isFaster: frame.sog > t.sog,
      distanceHistory: [t.dist],
      trail: [[t.lat, t.lon]] as [number, number][],
    }));

    const replayWindGrid: WindCell[] = [{ lat: frame.lat, lon: frame.lon, speed: frame.hrrr.speed, dir: frame.hrrr.dir }];

    const twdHist = window.map(f => f.twd);
    const polarHist = window.map(f => f.polarPct);
    const vmgHist = window.map(f => f.vmg);
    const wsHist = computeWindShiftHistory(twdHist);

    return {
      boat: replayBoat,
      boatTrail: replayTrail,
      targets: replayTargets,
      windGrid: replayWindGrid,
      twdHistory: twdHist,
      polarHistory: polarHist,
      windShiftHistory: wsHist,
      vmgHistory: vmgHist,
      markMetrics: liveData.markMetrics, // keep active mark metrics from live state
      startMetrics: liveData.startMetrics,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayIndex, bufferTick, liveData]);

  const { boat, boatTrail, targets, windGrid, twdHistory, polarHistory, windShiftHistory, vmgHistory, markMetrics, startMetrics } = displayData;
  const boatWithTrail = { ...boat, trail: boatTrail };
  const isLive = replayIndex < 0;

  // ── Race sessions ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<RaceSession[]>([]);
  const [activeSession, setActiveSession] = useState<RaceSession | null>(null);
  useEffect(() => { setSessions(loadSessions()); }, []);

  const handleStartSession = useCallback(() => {
    const existing = sessions.filter(s => s.endTs !== null);
    const name = `Race ${existing.length + 1}`;
    const session: RaceSession = { id: crypto.randomUUID(), name, startTs: Date.now(), endTs: null };
    setActiveSession(session);
    const next = [...sessions, session];
    setSessions(next);
    saveSessions(next);
  }, [sessions]);

  const handleEndSession = useCallback(() => {
    if (!activeSession) return;
    const closed = { ...activeSession, endTs: Date.now() };
    setActiveSession(null);
    const next = sessions.map(s => s.id === closed.id ? closed : s);
    setSessions(next);
    saveSessions(next);
  }, [activeSession, sessions]);

  const handleDeleteSession = useCallback((id: string) => {
    const next = sessions.filter(s => s.id !== id);
    setSessions(next);
    saveSessions(next);
  }, [sessions]);

  // ── Fullscreen wind map ────────────────────────────────────────────────────
  const [fullscreenMap, setFullscreenMap] = useState(false);

  // ── Swipe pages ────────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState(0);
  const swipeRef = useRef<HTMLDivElement>(null);
  const PAGE_LABELS = ["HELM", "CHART", "TACTICAL", "WIND"];

  const scrollToPage = useCallback((idx: number) => {
    const el = swipeRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }, []);

  const handleSwipeScroll = useCallback(() => {
    const el = swipeRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setActivePage(page);
  }, []);

  // ── Guide modal ────────────────────────────────────────────────────────────
  const [showGuide, setShowGuide] = useState(false);

  // ── Night mode ─────────────────────────────────────────────────────────────
  const [nightMode, setNightMode] = useState(false);

  return (
    <div data-nightmode={nightMode ? "true" : "false"}>
    {/* Fullscreen wind map — replaces dashboard entirely when open */}
    {fullscreenMap && (
      <WindyMapLoader
        boat={boatWithTrail}
        targets={mergedTargets}
        routeState={routeState}
        markMetrics={markMetrics ?? null}
        predictWindRoutes={pwRoutes}
        onClose={() => setFullscreenMap(false)}
      />
    )}
    {!fullscreenMap && <main
      className="h-screen flex flex-col overflow-hidden"
      style={nightMode ? { background: '#0a0000', color: '#ff4444' } : { background: '#020617', color: 'white' }}
    >
      {/* Signal K settings modal */}
      {showSkSettings && (
        <SignalKSettings
          signalkUrl={signalkUrl}
          status={skStatus}
          onUrlChange={handleSkUrlChange}
          onClose={() => setShowSkSettings(false)}
        />
      )}

      {/* Yellowbrick settings modal */}
      {showYbSettings && (
        <YellowbrickSettings
          config={ybConfig ?? { raceId: "" }}
          status={ybData?.status ?? "idle"}
          lastUpdateMs={ybData?.lastUpdateMs ?? null}
          boatCount={ybData?.boatCount ?? 0}
          errorMessage={ybData?.errorMessage ?? null}
          onConfigChange={handleYbConfigChange}
          onClose={() => setShowYbSettings(false)}
        />
      )}

      {/* PredictWind settings modal */}
      {showPwSettings && (
        <PredictWindSettings
          config={pwConfig}
          status={pwStatus}
          errorMessage={pwErrorMessage}
          onConfigChange={handlePwConfigChange}
          onCalculateRoute={handleCalculatePredictWindRoute}
          onClose={() => setShowPwSettings(false)}
        />
      )}

      {/* Guide modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            <span className="text-green-400">●</span> Rambler
            <span className="text-slate-500 font-normal text-sm ml-2">J/99 · USA 99 · PHRF Spinnaker 1</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Signal K status / connect button */}
          <button
            onClick={() => setShowSkSettings(true)}
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-mono font-bold transition-colors ${
              isSignalKConnected
                ? "border-green-500/60 text-green-400 bg-green-900/20"
                : signalkUrl
                ? "border-yellow-500/60 text-yellow-400 animate-pulse"
                : "border-slate-600 text-slate-500 hover:text-slate-300"
            }`}
            title={isSignalKConnected ? "Signal K live — tap to configure" : "Tap to connect Signal K"}
          >
            {isSignalKConnected ? "⬤ LIVE" : signalkUrl ? "◌ SK…" : "⬡ Simulated"}
          </button>
          {/* Yellowbrick feed button */}
          <button
            onClick={() => setShowYbSettings(true)}
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-mono font-bold transition-colors ${
              ybData?.status === "ok"
                ? "border-blue-500/60 text-blue-400 bg-blue-900/20"
                : ybConfig
                ? "border-yellow-500/60 text-yellow-400 animate-pulse"
                : "border-slate-600 text-slate-500 hover:text-slate-300"
            }`}
            title={ybData?.status === "ok" ? `YB live — ${ybData.boatCount} boats` : "Tap to configure Yellowbrick feed"}
          >
            {ybData?.status === "ok" ? `⬤ YB ${ybData.boatCount}` : ybConfig ? "◌ YB…" : "⬡ YB"}
          </button>
          {/* PredictWind Weather Routing button */}
          <button
            onClick={() => setShowPwSettings(true)}
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-mono font-bold transition-colors ${
              pwStatus === "loading"
                ? "border-yellow-500/60 text-yellow-400 animate-pulse"
                : pwStatus === "success"
                ? "border-green-500/60 text-green-400 bg-green-900/20"
                : pwStatus === "error"
                ? "border-red-500/60 text-red-400 bg-red-900/20"
                : "border-slate-600 text-slate-500 hover:text-slate-300"
            }`}
            title={pwStatus === "success" ? "PredictWind routes active — tap to configure" : "Tap to configure PredictWind routing"}
          >
            {pwStatus === "loading" ? "◌ PW…" : pwStatus === "success" ? "⬤ PW" : pwStatus === "error" ? "✕ PW" : "⬡ PW"}
          </button>
          {/* HRRR archive wind status */}
          {hrrrArchive.status === "ok" && !isSignalKConnected && !isLocalMode && (
            <span className="text-xs font-mono text-cyan-400 border border-cyan-600/40 rounded px-2 py-1">
              ⛈ Mac '25 Wind
            </span>
          )}
          {hrrrArchive.status === "loading" && !isSignalKConnected && !isLocalMode && (
            <span className="text-xs font-mono text-slate-500 animate-pulse px-2 py-1">
              Loading wind&hellip;
            </span>
          )}
          {/* Sim speed controls — only in simulation mode on Vercel */}
          {!isSignalKConnected && !isLocalMode && (
            <div className="flex items-center gap-1">
              {SIM_SPEED_RATES.map(rate => (
                <button
                  key={rate}
                  onClick={() => setSimSpeed(rate)}
                  className={`min-h-[44px] px-2 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    simSpeed === rate
                      ? "bg-blue-600 text-white border border-blue-400"
                      : "border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400"
                  }`}
                  title={`Sim speed ${rate}×`}
                >
                  {rate}×
                </button>
              ))}
            </div>
          )}
          {/* Replay badge */}
          {!isLive && (
            <span className="text-xs font-mono font-bold px-2 py-1 rounded text-orange-300 animate-pulse">⏪ REPLAY</span>
          )}
          {/* Night mode toggle */}
          <button
            onClick={() => setNightMode(v => !v)}
            className={`w-11 h-11 rounded-full border transition-colors flex items-center justify-center text-base ${
              nightMode
                ? "border-red-800 bg-red-950/60 text-red-400"
                : "border-slate-600 text-slate-400 hover:text-white hover:border-slate-400"
            }`}
            title={nightMode ? "Night mode (tap for day)" : "Day mode (tap for night)"}
          >
            {nightMode ? "🌙" : "☀"}
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="w-11 h-11 rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 active:bg-slate-700 text-base font-bold transition-colors flex items-center justify-center"
            aria-label="Open guide"
          >
            ?
          </button>
        </div>
      </div>

      {/* ── Swipe pages ─────────────────────────────────────────────────── */}
      <div
        ref={swipeRef}
        onScroll={handleSwipeScroll}
        className="flex-1 flex overflow-x-scroll overflow-y-hidden"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >

        {/* ── Page 1: HELM ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 w-screen overflow-y-auto p-3 space-y-3" style={{ scrollSnapAlign: 'start' }}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2"><OwnBoatPanel boat={boat} dataSource={
              isSignalKConnected ? "live"
              : isWaitingForInstruments ? "waiting"
              : signalkUrl ? "connecting"
              : "simulated"
            } /></div>
            <StartTimer />
          </div>
          <PerformancePanel
            boat={boat}
            twdHistory={twdHistory}
            polarHistory={polarHistory}
            alarmThreshold={alarmThreshold}
            onAlarmThresholdChange={setAlarmThreshold}
          />
          <WaypointPanel
            boat={boat}
            routeState={routeState}
            markMetrics={markMetrics ?? null}
            startMetrics={startMetrics ?? null}
            onRouteChange={handleRouteChange}
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SailChartPanel tws={boat.tws} twa={Math.abs(boat.twa)} />
            <WindOverlayPanel boat={boat} windGrid={windGrid} />
          </div>
        </div>

        {/* ── Page 2: CHART ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 w-screen overflow-y-auto p-3" style={{ scrollSnapAlign: 'start' }}>
          <RaceMapLoader
            boat={boatWithTrail}
            targets={mergedTargets}
            windGrid={windGrid}
            routeState={routeState}
            markMetrics={markMetrics ?? null}
            predictWindRoutes={pwRoutes}
            onAddWaypoint={handleAddWaypoint}
            onExpand={() => setFullscreenMap(true)}
            nightMode={nightMode}
          />
        </div>

        {/* ── Page 3: TACTICAL ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 w-screen overflow-y-auto p-3 space-y-3" style={{ scrollSnapAlign: 'start' }}>
          <TacticalTable targets={mergedTargets} boat={boat} />
          <TimelinePanel
            bufferRef={captureBufferRef}
            sessions={sessions}
            activeSession={activeSession}
            replayIndex={replayIndex}
            onReplayIndexChange={setReplayIndex}
            onStartSession={handleStartSession}
            onEndSession={handleEndSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>

        {/* ── Page 4: WIND ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 w-screen overflow-y-auto p-3 space-y-3" style={{ scrollSnapAlign: 'start' }}>
          <WindTrendPanel windShiftHistory={windShiftHistory} vmgHistory={vmgHistory} polarHistory={polarHistory} alarmThreshold={alarmThreshold} />
          <WindOverlayPanel boat={boat} windGrid={windGrid} />
        </div>

      </div>

      {/* ── Page dots ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 py-2 border-t border-slate-800">
        {PAGE_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => scrollToPage(i)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activePage === i
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activePage === i ? 'bg-white' : 'bg-slate-600'}`} />
            {label}
          </button>
        ))}
      </div>
    </main>}
    </div>
  );
}
