#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

# Default paths, supporting both Raspberry Pi (production) and local Mac testing
GRIBS_DIR = "/home/guarox/gribs"
if not os.path.exists("/home/guarox") and os.path.exists("/Users/guarox"):
    GRIBS_DIR = "/Users/guarox/gribs"
elif not os.path.exists(GRIBS_DIR):
    GRIBS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gribs")

os.makedirs(GRIBS_DIR, exist_ok=True)

GRIB_FILE_PATH = os.path.join(GRIBS_DIR, "hrrr_latest.grib2")
JSON_FILE_PATH = os.path.join(GRIBS_DIR, "hrrr_latest.json")

# Lake Michigan / Huron Bounds (Lat: 41.0 to 46.5, Lon: -88.5 to -84.0)
LAT_MIN, LAT_MAX = 41.0, 46.5
LON_MIN, LON_MAX = -88.5, -84.0
GRID_SPACING = 0.2  # ~12nm resolution, yields ~23 * 15 = ~345 points

def get_grid_coordinates():
    lats = []
    lons = []
    curr_lat = LAT_MIN
    while curr_lat <= LAT_MAX + 0.001:
        lats.append(round(curr_lat, 3))
        curr_lat += GRID_SPACING
    
    curr_lon = LON_MIN
    while curr_lon <= LON_MAX + 0.001:
        lons.append(round(curr_lon, 3))
        curr_lon += GRID_SPACING
        
    coords = []
    for lat in lats:
        for lon in lons:
            coords.append((lat, lon))
    return coords

def download_grib_file():
    """
    Downloads filtered HRRR GRIB2 wind data from NOAA NOMADS.
    Restricts to UGRD/VGRD at 10m above ground level for the Great Lakes.
    Iterates backward from current UTC hour to find the latest available forecast run.
    """
    print("Attempting to download filtered GRIB2 file from NOAA NOMADS...")
    now_utc = datetime.now(timezone.utc)
    
    # Try the last 6 runs (HRRR cycles hourly, but takes 1.5 - 2 hours to appear on NOMADS)
    for hours_ago in range(6):
        target_time = now_utc - timedelta(hours=hours_ago)
        date_str = target_time.strftime("%Y%m%d")
        cycle_str = f"{target_time.hour:02d}"
        
        # NOAA GRIB filter query URL
        params = {
            "file": f"hrrr.t{cycle_str}z.wrfsfcf00.grib2",
            "lev_10_m_above_ground": "on",
            "var_UGRD": "on",
            "var_VGRD": "on",
            "subregion": "",
            "leftlon": str(LON_MIN),
            "rightlon": str(LON_MAX),
            "toplat": str(LAT_MAX),
            "bottomlat": str(LAT_MIN),
            "dir": f"/hrrr.{date_str}/conus"
        }
        
        query_string = urllib.parse.urlencode(params)
        url = f"https://nomads.ncep.noaa.gov/cgi-bin/filter_hrrr_2d.pl?{query_string}"
        
        print(f"Checking HRRR run: Date={date_str}, Cycle={cycle_str}z...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'RamblerSmartBridge/1.0'})
            with urllib.request.urlopen(req, timeout=15) as response:
                content = response.read()
                # If we get HTML instead of a GRIB file (e.g. error page), try previous run
                if b"<html" in content or b"<HTML" in content or len(content) < 5000:
                    print(f"Cycle {cycle_str}z not ready yet or returned error. Trying previous hour...")
                    continue
                
                with open(GRIB_FILE_PATH, "wb") as f:
                    f.write(content)
                print(f"Successfully downloaded GRIB2 ({len(content) / 1024:.1f} KB) to {GRIB_FILE_PATH}")
                return date_str, cycle_str
        except Exception as e:
            print(f"Error checking cycle {cycle_str}z: {e}")
            continue
            
    print("Failed to download latest GRIB2 file from NOMADS. Using offline/cached data.")
    return None, None

def fetch_grid_data_json():
    """
    Fetches HRRR wind speed & direction from Open-Meteo (hrrr_conus) for coordinates.
    Saves parsed grid as a JSON structure.
    """
    print("Fetching HRRR grid forecast points from Open-Meteo forecast service...")
    coords = get_grid_coordinates()
    lats = [str(c[0]) for c in coords]
    lons = [str(c[1]) for c in coords]
    
    # Open-Meteo allows querying multiple coordinates in a single call (up to 1000)
    url = f"https://api.open-meteo.com/v1/forecast?latitude={','.join(lats)}&longitude={','.join(lons)}&hourly=wind_speed_10m,wind_direction_10m&models=hrrr_conus&wind_speed_unit=kn&timezone=UTC"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RamblerSmartBridge/1.0'})
        with urllib.request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Open-Meteo returns a list of results when querying multiple coordinates
            results = data if isinstance(data, list) else [data]
            
            parsed_grid = []
            for idx, res in enumerate(results):
                lat = coords[idx][0]
                lon = coords[idx][1]
                
                # Fetch first forecast hour (current hour)
                speeds = res.get("hourly", {}).get("wind_speed_10m", [])
                dirs = res.get("hourly", {}).get("wind_direction_10m", [])
                
                speed = speeds[0] if speeds else 15.0
                direction = dirs[0] if dirs else 270.0
                
                parsed_grid.append({
                    "lat": lat,
                    "lon": lon,
                    "speed": round(speed, 2),
                    "dir": round(direction, 1)
                })
                
            # Write grid to JSON file
            payload = {
                "timestamp": int(datetime.now(timezone.utc).timestamp()),
                "model": "HRRR (CONUS 3km)",
                "grid": parsed_grid
            }
            with open(JSON_FILE_PATH, "w") as f:
                json.dump(payload, f, indent=2)
                
            print(f"Successfully generated parsed JSON grid ({len(parsed_grid)} points) at {JSON_FILE_PATH}")
            return True
    except Exception as e:
        print(f"Error fetching wind grid: {e}")
        # Build a fallback synthetic grid centered on the region
        return False

def build_fallback_json():
    if os.path.exists(JSON_FILE_PATH):
        print("JSON grid file already exists. Retaining current file.")
        return
        
    print("Building fallback synthetic JSON grid...")
    coords = get_grid_coordinates()
    parsed_grid = []
    # Seed with standard WNW breeze
    for lat, lon in coords:
        parsed_grid.append({
            "lat": lat,
            "lon": lon,
            "speed": 14.5,
            "dir": 280.0
        })
        
    payload = {
        "timestamp": int(datetime.now(timezone.utc).timestamp()),
        "model": "Fallback Synthetic Grid",
        "grid": parsed_grid
    }
    with open(JSON_FILE_PATH, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Created fallback JSON grid at {JSON_FILE_PATH}")

if __name__ == "__main__":
    # Check if network is connected (or dummy flag/argument bypasses NOMADS check)
    has_internet = True
    try:
        urllib.request.urlopen("https://www.google.com", timeout=2)
    except Exception:
        has_internet = False
        print("No internet connectivity detected. Running in offline mode.")

    if has_internet:
        date_str, cycle_str = download_grib_file()
        success = fetch_grid_data_json()
        if not success:
            build_fallback_json()
    else:
        build_fallback_json()
