"use client";
import dynamic from "next/dynamic";
import { OwnBoat, WindCell, RouteState, MarkMetrics } from "../lib/mockData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RaceMap = dynamic(() => import("./RaceMap"), { ssr: false });

export default function RaceMapLoader(props: {
  boat: OwnBoat;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targets: any[];
  windGrid: WindCell[];
  routeState?: RouteState;
  markMetrics?: MarkMetrics | null;
  predictWindRoutes?: any;
  onAddWaypoint?: (lat: number, lon: number) => void;
  onExpand?: () => void;
  nightMode?: boolean;
}) {
  return <RaceMap {...props} />;
}
