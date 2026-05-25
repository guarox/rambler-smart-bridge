import { test, expect } from "@playwright/test";

test("weather API endpoint returns valid HRRR grid data", async ({ request }) => {
  const response = await request.get("/api/weather/hrrr");
  expect(response.ok()).toBeTruthy();
  
  const body = await response.json();
  expect(body).toHaveProperty("model");
  expect(body).toHaveProperty("timestamp");
  expect(body).toHaveProperty("grid");
  
  const grid = body.grid;
  expect(Array.isArray(grid)).toBeTruthy();
  expect(grid.length).toBeGreaterThan(0);
  
  // Verify first grid cell structure
  const cell = grid[0];
  expect(cell).toHaveProperty("lat");
  expect(cell).toHaveProperty("lon");
  expect(cell).toHaveProperty("speed");
  expect(cell).toHaveProperty("dir");
  
  expect(typeof cell.lat).toBe("number");
  expect(typeof cell.lon).toBe("number");
  expect(typeof cell.speed).toBe("number");
  expect(typeof cell.dir).toBe("number");
});
