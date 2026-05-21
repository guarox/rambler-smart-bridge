"use client";
import dynamic from "next/dynamic";
import { OwnBoat, Target, WindCell } from "../lib/mockData";

const RaceMap = dynamic(() => import("./RaceMap"), { ssr: false });

export default function RaceMapLoader(props: { boat: OwnBoat; targets: Target[]; windGrid: WindCell[] }) {
  return <RaceMap {...props} />;
}
