"use client";
import OwnBoatPanel from "./components/OwnBoatPanel";
import TacticalTable from "./components/TacticalTable";
import WindOverlayPanel from "./components/WindOverlayPanel";
import RaceMapLoader from "./components/RaceMapLoader";
import PerformancePanel from "./components/PerformancePanel";
import StartTimer from "./components/StartTimer";
import { useSimulatedLiveData } from "./lib/useSimulatedLiveData";

export default function Home() {
  const { boat, boatTrail, targets, windGrid, twdHistory } = useSimulatedLiveData();
  const boatWithTrail = { ...boat, trail: boatTrail };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            <span className="text-green-400">●</span> Rambler
            <span className="text-slate-500 font-normal text-sm ml-2">J/99 · USA 99 · PHRF Spinnaker 1</span>
          </h1>
        </div>
        <div className="text-xs text-slate-500 font-mono">Simulated · 2s</div>
      </div>

      {/* Row 1: instruments + timer */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2"><OwnBoatPanel boat={boat} /></div>
        <StartTimer />
      </div>

      {/* Row 2: performance */}
      <PerformancePanel boat={boat} twdHistory={twdHistory} />

      {/* Row 3: map */}
      <RaceMapLoader boat={boatWithTrail} targets={targets} windGrid={windGrid} />

      {/* Row 4: tactical + wind */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="lg:col-span-3"><TacticalTable targets={targets} boat={boat} /></div>
        <div className="lg:col-span-2"><WindOverlayPanel boat={boat} windGrid={windGrid} /></div>
      </div>
    </main>
  );
}
