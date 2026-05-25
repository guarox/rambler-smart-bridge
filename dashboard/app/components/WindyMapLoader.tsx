"use client";
import dynamic from "next/dynamic";
import type { OwnBoat } from "../lib/mockData";
import type { RouteState, MarkMetrics } from "../lib/mockData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WindyMap = dynamic(() => import("./WindyMap"), { ssr: false });

export default function WindyMapLoader(props: {
  boat: OwnBoat & { trail?: [number, number][] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targets: any[];
  routeState?: RouteState;
  markMetrics?: MarkMetrics | null;
  predictWindRoutes?: any;
  onClose: () => void;
}) {
  return <WindyMap {...props} />;
}
