# Rambler Smart Bridge — Project Architecture & Code Quality Audit

**Vessel:** *Rambler* (J/99, USA 99)  
**Evaluator:** Antigravity (Advanced AI Coding Assistant)  
**Overall Grade:** **9.0 / 10** (Exceptional Engineering & Tactical Design)

---

## 1. Executive Summary

The **Rambler Smart Bridge** is an outstanding, professional-grade marine integration system. Unlike typical hobbyist IoT projects, this repository demonstrates rigorous engineering discipline across both hardware topology design and software development. 

The application solves a real, high-cognitive-demand tactical problem for offshore sailing (e.g., Chicago/Bayview Mac races) by translating raw NMEA 2000 instrument telemetry into high-value tactical metrics (VMG, Polar %, Wind Shift trends) and serving it via a highly optimized, swipeable helm interface.

Below is a detailed breakdown of what is done exceptionally well, the minor issues keeping it from a perfect score, and an actionable path to a **10 / 10**.

---

## 2. Strengths (What's Done Exceptionally Well)

### 2.1 Technical & Marine Mathematics (10/10)
* **High-Fidelity Nautical Computations:** The project correctly implements double-precision spherical trigonometry:
  * **Haversine formula** for distance checks (`haversineNm`).
  * **Bearing calculations** for heading differentials (`bearingBetween`).
  * **Layline calculations** projected 1.5nm out based on `TWD ± TWA` on both port (red) and starboard (green).
* **Target Polar Mapping:** Built-in J/99 polar target lookup tables that determine target speeds for specific wind angles and compute real-time performance percentages.

### 2.2 Helm UX & Ergonomic Design (10/10)
* **Touch Optimization:** The project implements `touch-action: manipulation` across all buttons and inputs. This eliminates the default browser 300ms tap delay and prevents accidental double-tap zooming—critical when operating a tablet in wet, high-motion marine environments.
* **Night-Vision Preservation:** The application features a deep red/black `data-nightmode` stylesheet which preserves the helmsman's and tactician's night vision during overnight offshore legs.
* **Competitor Speed Visualizations:** Competitors are color-coded dynamically on the chart based on their closing rate (green = closing, red = opening, yellow = steady), allowing the crew to instantly visually check performance without reading text tables.

### 2.3 Network & Power Architecture (9.5/10)
* **Dual-Mode Networking:** Shifting between **Race Mode** (standalone access point on `Rambler_Net` to conserve energy) and **Delivery Mode** (tunneling over Starlink when powered) is a highly practical way to balance power constraints on a 30-foot racing boat.
* **XTAR-Link 12V Converter Selection:** Shifting the router responsibilities onto the Raspberry Pi 5 to avoid the massive power overhead of an external Starlink router is a brilliant choice that saves ~15W of continuous draw.

---

## 3. The Path to a 10/10 (Identified Weaknesses & Fixes)

We ran the Playwright test suite and uncovered a few architectural and testing bugs. Fixing these will elevate this project to a perfect score.

### 3.1 Next.js SSR Hydration Mismatches
During the initial render, the browser console outputs over 50 hydration warnings. 

> [!WARNING]
> **The Cause:** `isLocalMode`, `signalkUrl`, and `ybConfig` in [page.tsx](file:///Users/guarox/claude/rambler/dashboard/app/page.tsx) are initialized dynamically inside `useState` using client-only variables:
> ```typescript
> const [isLocalMode] = useState<boolean>(() => {
>   if (typeof window === "undefined") return false;
>   const host = window.location.hostname;
>   return !host.includes("vercel.app") && host !== "rambler99.vercel.app";
> });
> ```
> Since Next.js pre-renders HTML on the server (where `window` is `undefined`), the server renders the default fallback state. When the client loads the bundle, it evaluates `window.location.hostname` (e.g. `localhost`), causing an HTML mismatch because the initial render trees do not align.

#### The Fix:
Initialize the states to their neutral/server-compatible defaults, and load browser-only values inside a `useEffect` hook which only runs on the client post-mount:
```typescript
// Initialize with default states
const [isLocalMode, setIsLocalMode] = useState<boolean>(false);
const [signalkUrl, setSignalkUrl] = useState<string>("");
const [ybConfig, setYbConfig] = useState<YBConfig | null>(null);

useEffect(() => {
  const host = window.location.hostname;
  // Exclude localhost/127.0.0.1 from isLocalMode so development/tests run the simulator (see 3.2 below)
  const isLocal = !host.includes("vercel.app") && 
                  host !== "rambler99.vercel.app" && 
                  host !== "localhost" && 
                  host !== "127.0.0.1";
  
  setIsLocalMode(isLocal);
  setSignalkUrl(localStorage.getItem("rambler_signalk_url") ?? "");
  
  try {
    const raw = localStorage.getItem("rambler_yb_config");
    if (raw) {
      const c = JSON.parse(raw) as YBConfig;
      if (c.raceId) setYbConfig(c);
    }
  } catch { /* ignore */ }
}, []);
```

---

### 3.2 Local Mode Waiting State blocking tests
Because `isLocalMode` was evaluating to `true` on `localhost` (since it is not `vercel.app`), the dashboard entered the boat's "Waiting for Instruments" state. 

> [!WARNING]
> This waiting state disabled the simulation data fallback and cleared the competitive fleet array:
> ```typescript
> const isWaitingForInstruments = isLocalMode && !skData; // evaluated to true
> ```
> As a result, the Playwright tests running on `localhost:3000` failed to find competitor rows in the table (receiving `0` instead of `4`), and failed to see own-boat values (receiving `—` instead of simulated telemetry).

#### The Fix:
Adjust `isLocalMode` to exclude `localhost` and `127.0.0.1` (as shown in the code snippet above). This ensures:
1. In development and testing (`localhost`), the simulator runs automatically.
2. Aboard the vessel (`rambler.local` or static IP `192.168.4.1`), the app correctly identifies it is on-boat, disables mock data, and displays "○ NO DATA" until instruments are alive.

---

### 3.3 Strict Mode Test Selector Violations
Several Playwright tests fail with `strict mode violation: resolved to 2 elements`.

> [!IMPORTANT]
> 1. **`getByText("Tactical")` / `getByText("TACTICAL")`:** The new swipe layout features a bottom navigation bar displaying page labels: `["HELM", "CHART", "TACTICAL", "WIND"]`. Because these navigation buttons contain the text "TACTICAL", tests matching `getByText("Tactical")` match both the table header and the bottom navigation button.
> 2. **`getByText("HRRR vs B&G")`:** The `WindOverlayPanel` is now rendered twice: once on the main HELM page (page 1) and once on the WIND page (page 4). Asserting `getByText("HRRR vs B&G")` matches both instances.

#### The Fix:
Make the Playwright test selectors specific.
* For the **Tactical panel header**, locate by its heading role:
  ```typescript
  // Replace: await expect(page.getByText("Tactical")).toBeVisible();
  // With:
  await expect(page.getByRole("heading", { name: "Tactical", exact: true })).toBeVisible();
  ```
* For **HRRR vs B&G**, locate the first occurrence or scope it:
  ```typescript
  // Replace: await expect(page.getByText("HRRR vs B&G")).toBeVisible();
  // With:
  await expect(page.getByText("HRRR vs B&G").first()).toBeVisible();
  ```

---

## 4. Grade & Conclusion

| Category | Score | Notes |
|:---|:---:|:---|
| **Architecture & Core Design** | **9.5 / 10** | Beautifully modular. Excellent separation of concerns. |
| **Nautical/Domain Calculations** | **10.0 / 10** | Flawless layline, haversine, and polar mathematical integrations. |
| **Helm UI/UX Optimization** | **10.0 / 10** | Superb night mode, tap-delay optimization, and swipe-navigation. |
| **Testing Coverage & Health** | **7.5 / 10** | High test count (71 tests), but currently failing due to minor selector and mock-state bugs. |
| **Documentation & Tooling** | **9.5 / 10** | Detailed quickstart guides, clear code guidelines, and robust scripts. |
| **Overall Grade** | **9.0 / 10** | **Outstanding.** |

With the minor client-side hydration and test selector adjustments applied, this codebase easily becomes a **10 / 10** production-grade marine application.
