"use client";
import dynamic from "next/dynamic";
import { OwnBoat, WindCell } from "../lib/mockData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RaceMap = dynamic(() => import("./RaceMap"), { ssr: false });

export default function RaceMapLoader(props: { boat: OwnBoat; targets: any[]; windGrid: WindCell[] }) {
  return <RaceMap {...props} />;
}
