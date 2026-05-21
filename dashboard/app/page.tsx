"use client";
import OwnBoatPanel from "./components/OwnBoatPanel";
import TacticalTable from "./components/TacticalTable";
import WindOverlayPanel from "./components/WindOverlayPanel";
import RaceMapLoader from "./components/RaceMapLoader";
import { useSimulatedLiveData } from "./lib/useSimulatedLiveData";

export default function Home() {
  const { boat, boatTrail, targets, windGrid } = useSimulatedLiveData();
  const boatWithTrail = { ...boat, trail: boatTrail };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rambler Smart Bridge</h1>
          <p className="text-xs text-gray-500 mt-0.5">J/99 · USA 99 · MMSI 338380946 · PHRF Spinnaker 1</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-green-500 font-mono">● Simulated Live · 2s updates</div>
        </div>
      </div>

      <OwnBoatPanel boat={boat} />
      <RaceMapLoader boat={boatWithTrail} targets={targets} windGrid={windGrid} />
      <TacticalTable targets={targets} boat={boat} />
      <WindOverlayPanel boat={boat} windGrid={windGrid} />

      <p className="text-xs text-gray-700 text-center pb-2">
        Rambler Smart Bridge · Raspberry Pi 5 + Signal K + InfluxDB · Simulated live data
      </p>
    </main>
  );
}
