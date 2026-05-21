import OwnBoatPanel from "./components/OwnBoatPanel";
import TacticalTable from "./components/TacticalTable";
import WindOverlayPanel from "./components/WindOverlayPanel";
import RaceMapLoader from "./components/RaceMapLoader";
import { ownBoat, targets, hrrGrid } from "./lib/mockData";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rambler Smart Bridge</h1>
          <p className="text-xs text-gray-500 mt-0.5">J/99 · USA 99 · MMSI 338380946 · PHRF Spinnaker 1</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-yellow-500 font-mono">⚠ Mock Data · Preview Build</div>
        </div>
      </div>

      <OwnBoatPanel boat={ownBoat} />
      <RaceMapLoader boat={ownBoat} targets={targets} windGrid={hrrGrid} />
      <TacticalTable targets={targets} boat={ownBoat} />
      <WindOverlayPanel />

      <p className="text-xs text-gray-700 text-center pb-2">
        Rambler Smart Bridge · Raspberry Pi 5 + Signal K + InfluxDB · Preview — mock data only
      </p>
    </main>
  );
}
