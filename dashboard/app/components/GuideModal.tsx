"use client";

interface Props {
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-700 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">{title}</h3>
      <div className="space-y-2 text-sm text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

function Row({ term, def }: { term: string; def: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono text-yellow-300 min-w-[80px] shrink-0">{term}</span>
      <span className="text-gray-300">{def}</span>
    </div>
  );
}

export default function GuideModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm"
      style={{ zIndex: 9999, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      <div className="flex items-start justify-center min-h-full p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-4 shadow-2xl">
        {/* Header — sticky within the scrollable container */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4 sticky top-0 bg-slate-900 rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Rambler Smart Bridge — Tactician Guide</h2>
            <p className="text-sm text-gray-500 mt-0.5">J/99 · USA 99 · Reference for all panels and controls</p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 text-2xl transition-colors ml-3"
            aria-label="Close guide"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">

          {/* ── Instruments ── */}
          <Section title="📡 Instrument Panel">
            <p>Shows real-time B&G sensor data from the NMEA 2000 backbone, updated every 2 seconds.</p>
            <div className="space-y-1 mt-2">
              <Row term="BSP" def="Boat speed through water (knots) — from B&G paddlewheel/transducer." />
              <Row term="SOG" def="Speed over ground (knots) — GPS-derived, includes current effects." />
              <Row term="COG" def="Course over ground (degrees true) — direction of travel over the seabed." />
              <Row term="TWS" def="True wind speed (knots) — B&G calculated from AWS, AWA, and BSP." />
              <Row term="TWD" def="True wind direction (degrees true) — direction wind is blowing FROM." />
              <Row term="TWA" def="True wind angle (degrees) — angle between bow and true wind." />
              <Row term="DEPTH" def="Water depth below transducer (meters)." />
            </div>
          </Section>

          {/* ── Start Timer ── */}
          <Section title="⏱ Start Timer">
            <p>Standard race countdown sequence.</p>
            <div className="space-y-1 mt-2">
              <Row term="5m/4m/3m/1m" def="Click to preset timer. Gun fired when it reaches 00:00." />
              <Row term="Sync" def="Rounds to nearest whole minute — use when you hear a gun and need to reset to a round number." />
              <Row term="▶ Start" def="Begins countdown. Timer turns red and pulses in the final minute." />
              <Row term="■ Stop" def="Pauses the countdown. Click a preset to reset." />
            </div>
            <p className="text-gray-500 text-xs mt-2">After 00:00, the timer continues counting up (time since start), shown in green.</p>
          </Section>

          {/* ── Performance ── */}
          <Section title="📊 Performance Panel">
            <div className="space-y-1">
              <Row term="VMG" def="Velocity Made Good upwind — BSP × cos(TWA). Maximizing this is the goal upwind." />
              <Row term="% Polar" def="BSP as a percentage of the J/99 target speed for current TWS and TWA. 100% = sailing exactly at target. Green ≥95%, Yellow ≥85%, Red <85%." />
              <Row term="Wind Shift" def="Net TWD change over the last 2 minutes. ▲ Lift = wind freed up (good on port tack). ▼ Header = wind headed you (consider tacking)." />
              <Row term="Tack" def="Shows ⟳ TACK when a sustained header is detected. Shows HOLD otherwise. Acts on the 2-minute TWD trend, not individual oscillations." />
              <Row term="Alarm" def="Set a polar% threshold. After 3 consecutive readings below it (~6s), an audio beep + DRIVER ALERT fires. Click ACK to dismiss." />
            </div>
          </Section>

          {/* ── Race Chart ── */}
          <Section title="🗺 Race Chart">
            <p className="mb-2">Esri Ocean Basemap (nautical chart with depth contours). Updated every 2 seconds.</p>
            <div className="space-y-1">
              <Row term="Pan" def="Default mode — click and drag to pan, scroll to zoom." />
              <Row term="✦ Add" def="Click anywhere on the chart to drop a waypoint at that location. Returns to Pan after each click." />
              <Row term="📏 Ruler" def="Click two points to measure distance (nm) and bearing (° True) between them. ✕ Clear removes the measurement." />
              <Row term="Laylines" def="Red (port) and green (starboard) dashed lines showing the optimal tacking angle from the active mark. Based on TWA and J/99 polar. Toggle ON/OFF." />
              <Row term="◎ Rings" def="Range rings at 0.5, 1.0, and 2.0 nm centered on Rambler. Toggle ON/OFF." />
              <Row term="⊕ Fleet" def="Zooms map to show all boats." />
              <Row term="⤢ Full" def="Expands to full-screen Windy-style wind map with animated particles, HRRR gradient, and forecast playback. See the Wind Map section below." />
            </div>
            <p className="text-gray-500 text-xs mt-2">Boat colors: Green = closing, Red = opening, Yellow = steady (based on closing rate).</p>
          </Section>

          {/* ── Wind Map ── */}
          <Section title="🌪 Full-Screen Wind Map">
            <p>Tap <span className="font-mono text-blue-400">⤢ Full</span> on the Race Chart header to expand into a Windy-style full-screen wind map. Shows animated wind particles, a color-coded wind speed gradient, and live competitor badges — all on one screen. Tap <span className="font-mono text-gray-300">✕</span> to return to the dashboard.</p>

            {/* Layout diagram */}
            <div className="bg-gray-800 rounded-lg p-3 mt-3 font-mono text-xs text-gray-300 leading-relaxed">
              <div className="text-gray-500 mb-1">── Full-screen wind map layout ─────────────────</div>
              <div className="flex justify-between">
                <span className="text-gray-400">BSP <span className="text-white font-bold">7.4</span> kts  SOG <span className="text-white font-bold">7.2</span> kts  TWS <span className="text-white font-bold">14.5</span> kts  TWD <span className="text-white font-bold">274°</span></span>
                <span><span className="text-green-400">● LIVE</span> <span className="text-gray-500">[✕]</span></span>
              </div>
              <div className="mt-1 border border-slate-700 rounded p-2 text-center text-gray-600 relative" style={{ height: "60px" }}>
                <span className="absolute top-1 left-2 text-green-400 text-[10px]">████ wind gradient</span>
                <span className="absolute top-4 left-8 text-white/50 text-[9px]">· · · particles · · ·</span>
                <span className="absolute top-6 left-16 text-green-300 text-[9px]">[Ohana ▼0.21]  [Paradigm ↑ ▼2.0]</span>
                <span className="absolute top-1 right-2 text-slate-500 text-[10px]">🌐</span>
              </div>
              <div className="mt-1 text-gray-500">Now — Live  [◀] [▶ Play] [▶] [Live]  +11hr</div>
              <div className="text-gray-600">Now ────────────────────────── +3h ─── +6h ─── +9h</div>
            </div>

            <p className="font-semibold text-white mt-4 mb-2">Instrument Strip (top bar)</p>
            <p className="text-sm text-gray-300">Shows BSP, SOG, COG, TWS, TWD, TWA — updated every 2s. In forecast mode, TWS and TWD show the predicted values for the selected hour rather than live B&G readings.</p>

            <p className="font-semibold text-white mt-4 mb-2">Wind Color Scale</p>
            <div className="grid grid-cols-2 gap-1 mt-1 text-sm">
              {[
                { color: "#1e3a8a", label: "< 5 kt", desc: "Calm — drifting" },
                { color: "#1d4ed8", label: "5–8 kt", desc: "Light air" },
                { color: "#0ea5e9", label: "8–11 kt", desc: "Light breeze" },
                { color: "#22c55e", label: "11–14 kt", desc: "Moderate — ideal" },
                { color: "#eab308", label: "14–18 kt", desc: "Fresh breeze" },
                { color: "#f97316", label: "18–23 kt", desc: "Strong breeze" },
                { color: "#ef4444", label: "> 23 kt", desc: "Near gale" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded shrink-0 inline-block" style={{ background: color }} />
                  <span className="text-white font-mono text-xs">{label}</span>
                  <span className="text-gray-500 text-xs">{desc}</span>
                </div>
              ))}
            </div>

            <p className="font-semibold text-white mt-4 mb-2">Wind Particles</p>
            <p className="text-sm text-gray-300">Animated white streaks flow in the true wind direction. Particle speed is proportional to wind speed — faster streaks = more wind. They help you see the wind field pattern at a glance: where it's filling in, where it's dying, and where pressure zones shift across the course. The particles animate continuously and update when you advance the forecast.</p>

            <p className="font-semibold text-white mt-4 mb-2">Weather Layers (🌐 top right)</p>
            <div className="space-y-1">
              <Row term="🌪 Wind" def="HRRR wind speed gradient + animated flow particles. Best layer for tactical sailing decisions." />
              <Row term="🌧 Rain" def="Precipitation overlay — see approaching squalls, rain bands, and convective cells. Critical for safety and predicting wind shifts." />
              <Row term="🌡 Temp" def="Surface temperature — useful for identifying sea breezes, cold fronts, and thermal activity that drives wind patterns." />
            </div>
            <p className="text-gray-500 text-xs mt-1">Tip: On a forecast day, start with Wind layer to see the pressure pattern, then check Rain to see if any squalls are inbound.</p>

            <p className="font-semibold text-white mt-4 mb-2">Weather Model — HRRR</p>
            <p className="text-sm text-gray-300">The <strong className="text-white">High-Resolution Rapid Refresh (HRRR)</strong> is NOAA's highest-resolution US forecast model. Key specs for racing:</p>
            <div className="space-y-1 mt-1">
              <Row term="Resolution" def="3km grid spacing — finer than GFS (25km) or ECMWF (9km). Resolves lake breezes and local coastal effects." />
              <Row term="Update cycle" def="Runs every hour with 18-hour forecast. The freshest hourly update is always used." />
              <Row term="Coverage" def="Continental US + coastal waters. Covers all Great Lakes racing venues." />
              <Row term="Best for" def="Buoy racing, inshore, and day races within 50nm of shore. Less accurate >100nm offshore (use GFS for ocean races)." />
            </div>

            <p className="font-semibold text-white mt-4 mb-2">Controls</p>
            <div className="space-y-1">
              <Row term="⊕ center" def="Bottom-left button — re-centers the map on the fleet. Use if you accidentally zoomed or panned away." />
              <Row term="● LIVE" def="Green badge = current B&G data. Drag slider right to enter forecast." />
              <Row term="⏲ +Xhr" def="Amber badge = HRRR forecast X hours ahead. TWS/TWD strip updates to forecast values." />
              <Row term="◀ ▶" def="Step one hour at a time. Watch how the gradient color shifts to anticipate pressure changes." />
              <Row term="▶ Play" def="Runs through 11+ hours of forecast at 0.7s per hour. Watch the full wind evolution like a movie." />
              <Row term="Live" def="Snap back to real-time instantly." />
            </div>

            <p className="font-semibold text-white mt-4 mb-2">Data Source</p>
            <p className="text-sm text-gray-300">Wind data: <strong className="text-white">NOAA HRRR</strong> via Open-Meteo API (free, no key needed). 5×5 grid covering ±30nm around the boat. Auto-refreshes when the boat moves more than 1nm. If no internet, falls back to synthetic data based on current B&G wind.</p>

            <p className="font-semibold text-white mt-4 mb-2">Tactical Use</p>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-300 text-sm">
              <li><strong className="text-white">Pre-race planning:</strong> Open wind map before the start gun. Play the forecast to see if the wind will shift left or right over the next few hours. Adjust which tack to start on.</li>
              <li><strong className="text-white">During upwind:</strong> Check if the yellow/orange patch (stronger pressure) is left or right of the course. Particles show exactly which direction to sail toward it.</li>
              <li><strong className="text-white">Competitor intel:</strong> Badges show closing rate live. See who's in the puff and who's in a hole.</li>
              <li><strong className="text-white">Return to dashboard:</strong> Tap ✕ to go back to instruments, tactical table, and marks.</li>
            </ol>
          </Section>

          {/* ── Marks ── */}
          <Section title="✦ Marks & Waypoints">
            <p>The Marks panel is below the Performance panel. It lets you drop, manage, and navigate to waypoints. The <strong className="text-white">active mark</strong> drives all tactical calculations — laylines on the chart, TTM, VMG↑, and competitor layline status in the Tactical Table.</p>

            {/* Panel layout diagram */}
            <div className="bg-gray-800 rounded-lg p-3 mt-3 font-mono text-xs text-gray-300 leading-relaxed">
              <div className="text-gray-500 mb-1">── Marks panel layout ──────────────────────</div>
              <div className="flex justify-between"><span className="text-gray-400">MARKS</span><span className="text-green-400">[ + Ping ]</span></div>
              <div className="mt-1 border border-blue-500/40 rounded px-2 py-1 bg-blue-950/30">
                <span className="text-blue-400">◉</span> <span className="text-white">Mark 1</span>
                <span className="text-gray-500 ml-2">0.42nm  318°</span>
                <span className="text-gray-500 ml-2">[Mark▼] [Port] [×]</span>
              </div>
              <div className="mt-1 px-2 py-1">
                <span className="text-gray-500">○</span> <span className="text-gray-300">Mark 2</span>
                <span className="text-gray-500 ml-2">1.20nm  045°</span>
                <span className="text-gray-500 ml-2">[Mark▼] [Stbd] [×]</span>
              </div>
              <div className="mt-1 px-2 py-1">
                <span className="text-gray-500">●</span> <span className="text-gray-300">Start P</span>
                <span className="text-gray-500 ml-2">0.80nm  270°</span>
                <span className="text-gray-500 ml-2">[Start P▼]  [×]</span>
              </div>
              <div className="flex justify-end gap-2 mt-1 text-gray-500">
                <span>[← Prev]</span><span>[Next →]</span>
              </div>
              <div className="border-t border-gray-700 mt-2 pt-2">
                <div className="text-gray-500">ACTIVE → <span className="text-white">Mark 1</span></div>
                <div className="grid grid-cols-4 gap-1 mt-1 text-center">
                  <div><div className="text-gray-500">Bearing</div><div className="text-white">318°</div></div>
                  <div><div className="text-gray-500">Dist</div><div className="text-white">0.42nm</div></div>
                  <div><div className="text-gray-500">TTM</div><div className="text-white">3.2min</div></div>
                  <div><div className="text-gray-500">VMG↑</div><div className="text-green-400">+7.8kts</div></div>
                </div>
              </div>
              <div className="border-t border-gray-700 mt-2 pt-2 text-gray-400">
                START LINE  <span className="text-red-300">← Port favored +3.2°</span>
                <span className="ml-4 text-gray-500">0.12nm to line  TTB: 0.8min</span>
              </div>
            </div>

            {/* Controls reference */}
            <p className="font-semibold text-white mt-4 mb-2">Controls</p>
            <div className="space-y-1">
              <Row term="+ Ping" def="Drop a mark at Rambler's current GPS position instantly. Use this at the leeward gate, top mark, or any position as you sail past. Names auto-increment (Mark 1, Mark 2…)." />
              <Row term="✦ Add" def="Switch to Add Mark mode on the Race Chart, then tap anywhere on the map to place a mark at that exact lat/lon." />
              <Row term="◉ active" def="Blue filled dot = active mark. Tap any row to set it active (tap again to deactivate). Only one mark can be active at a time." />
              <Row term="Type ▼" def="Tap to cycle: Mark → Start P (port end) → Start S (starboard end). Start P and Start S together define the start line — both must be set for start line calculations to appear." />
              <Row term="Port / Stbd" def="Rounding direction — which side you'll leave the mark on. Affects which layline is the approach layline shown on the chart." />
              <Row term="× delete" def="Remove the mark. If it was active, the nearest remaining mark becomes active." />
              <Row term="← Prev / Next →" def="Cycle through marks in order. Useful mid-race to advance to the next leg mark without looking down." />
            </div>

            {/* Active mark metrics */}
            <p className="font-semibold text-white mt-4 mb-2">Active Mark Metrics</p>
            <div className="space-y-1">
              <Row term="Bearing" def="True compass bearing from Rambler to the active mark. Cross-check with your plotter." />
              <Row term="Dist" def="Haversine distance in nautical miles." />
              <Row term="TTM" def="Time to Mark — minutes to reach the mark at current VMG toward it. Updates every 2 seconds. Goes to — if VMG is negative (sailing away)." />
              <Row term="VMG↑" def="Velocity Made Good toward the mark. Green = approaching, red = sailing away. This is the primary number to optimise upwind." />
            </div>

            {/* Start line */}
            <p className="font-semibold text-yellow-300 mt-4 mb-2">Start Line (requires Start P + Start S marks)</p>
            <div className="space-y-1">
              <Row term="Bias" def="Which end of the line is favoured — the end closer to perpendicular with the true wind. Port favoured = go left to start. Stbd favoured = go right. The degree value tells you how much it matters; <2° is effectively square." />
              <Row term="Dist to line" def="Cross-track distance from Rambler to the nearest point on the start line (nm). Watch this tick down on your approach." />
              <Row term="TTB" def="Time to Burn — minutes at current SOG until you cross the line. Use with the Start Timer: if TTB matches the clock, you're perfectly timed." />
            </div>

            {/* Workflow */}
            <p className="font-semibold text-white mt-4 mb-2">Race Workflow</p>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-300 text-sm">
              <li><strong className="text-white">Before the start:</strong> Sail to the port end, tap <span className="text-green-400 font-mono">+ Ping</span>, set type to <span className="font-mono text-gray-300">Start P</span>. Sail to the stbd end, ping again, set type to <span className="font-mono text-gray-300">Start S</span>. Start line bias and TTB appear instantly.</li>
              <li><strong className="text-white">Upwind leg:</strong> Ping the windward mark as you round the leeward gate, or use <span className="font-mono text-gray-300">✦ Add</span> on the chart if you can see it. Set it active. Laylines on the chart now radiate from the mark. Watch TTM to plan your tacks.</li>
              <li><strong className="text-white">Rounding:</strong> Tap <span className="font-mono text-gray-300">Next →</span> when you round to advance to the next mark. The system switches all calculations to the new active mark.</li>
              <li><strong className="text-white">Competitor leverage:</strong> The Tactical Table gains a <span className="font-mono text-gray-300">Layline</span> column — see who is inside the layline vs overstanding.</li>
            </ol>

            <p className="text-gray-500 text-sm mt-3">Marks persist in the browser across page reloads. Clear them before a new race using the × buttons.</p>
          </Section>

          {/* ── Tactical Table ── */}
          <Section title="🎯 Tactical Table">
            <p>One row per AIS target within range, sorted by distance (closest first).</p>
            <div className="space-y-1 mt-2">
              <Row term="Dist" def="Haversine distance from Rambler to target (nm)." />
              <Row term="Brg" def="True bearing from Rambler to target (degrees)." />
              <Row term="Closing Rate" def="Rate of change in distance (nm/hr). ▼ green = closing (threat or opportunity). ▲ red = opening." />
              <Row term="SOG" def="Target's speed over ground (knots)." />
              <Row term="Wind °" def="Target's effective wind angle — how pinched or free they are sailing." />
              <Row term="Higher?" def="Green badge = we are sailing at a tighter angle (higher = we have leverage). Red = they are higher." />
              <Row term="Faster?" def="Green = our SOG > their SOG. Red = they are faster." />
              <Row term="→Mark" def="Target's distance to the active mark (nm). Shows only when a mark is active." />
              <Row term="Layline" def="Target's position relative to the mark's laylines: Outside (still working), Port/Stbd ✓ (on layline), Over! (overstanding)." />
              <Row term="Trend" def="Sparkline of last 10 distance readings — visual trend of opening/closing." />
            </div>
          </Section>

          {/* ── Timeline ── */}
          <Section title="⏮ Timeline & Race Capture">
            <p>The system continuously records all sensor data to an in-memory ring buffer (last 2 hours, ~1.3MB). Nothing is sent to a server.</p>
            <div className="space-y-1 mt-2">
              <Row term="Scrubber" def="Drag the slider to travel back in time. The entire dashboard (instruments, map, table, trend charts) replays that moment." />
              <Row term="REPLAY badge" def="Orange pulsing badge in the header indicates you are viewing historical data, not live." />
              <Row term="▶ Live" def="Returns to real-time mode instantly." />
              <Row term="▶ Start Race" def="Stamps the current moment as the beginning of a race session. Appears as a colored block on the timeline track." />
              <Row term="■ End Race" def="Stamps the end of the current race. Session is saved with name and duration." />
              <Row term="⬇ Export All" def="Downloads a CSV of the full buffer (all captured data since page load)." />
              <Row term="⬇ per race" def="Each saved race has its own export button — downloads only that race's data." />
            </div>
            <p className="text-gray-500 text-xs mt-2">Buffer resets on page reload. Race session names (but not the raw data) survive reload via localStorage.</p>
            <p className="font-semibold text-blue-300 mt-2 text-xs">CSV columns: timestamp, datetime, sog, cog, bsp, twa, tws, twd, depth, lat, lon, polar_pct, vmg, [per competitor: mmsi, name, dist, bearing, closing_rate, sog, cog, lat, lon], hrrr_speed, hrrr_dir</p>
          </Section>

          {/* ── Wind Panels ── */}
          <Section title="💨 Wind Panels">
            <p className="font-semibold text-gray-200">Wind Trends (2-minute line charts)</p>
            <div className="space-y-1 mt-1">
              <Row term="Net Wind Shift" def="How much TWD has rotated in the last 2 minutes. Positive = veered (header on port, lift on stbd). Negative = backed (lift on port, header on stbd)." />
              <Row term="VMG Upwind" def="Rolling VMG toward the mark (or generic upwind). Use to confirm trim changes are helping." />
              <Row term="% Polar" def="Rolling polar performance. The horizontal dashed line is your alarm threshold." />
            </div>
            <p className="font-semibold text-gray-200 mt-3">HRRR vs B&G Panel</p>
            <p className="mt-1">Compares the nearest NOAA HRRR weather model grid point to the actual B&G instruments. A large delta means you are in a localized feature (puff, sea breeze cell, convergence zone) not captured by the model.</p>
            <div className="space-y-1 mt-1">
              <Row term="Δ Speed" def="Actual TWS minus HRRR model TWS (knots). Positive = more breeze than forecast." />
              <Row term="Δ Direction" def="Actual TWD minus HRRR TWD (degrees). Large values indicate a persistent local shift." />
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-5 py-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">Rambler Smart Bridge · J/99 USA 99 · Signal K + B&G NMEA 2000</span>
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-base font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
