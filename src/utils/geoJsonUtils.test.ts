import { normalizeRegionForPostGIS } from "./geoJsonUtils";

// PostGIS columns hold a Geometry (Polygon/MultiPolygon), never a FeatureCollection or Feature wrapper.
// The instance registry hit this and failed during database setup.
// These tests verify that normalizeRegionForPostGIS correctly handles the region shapes
// used across the application: bare geometries, single/multiple Feature collections, and empty or null values.

const polygon = (x: number) => ({
  type: "Polygon",
  coordinates: [
    [
      [x, 0],
      [x + 1, 0],
      [x + 1, 1],
      [x, 1],
      [x, 0],
    ],
  ],
});

describe("normalizeRegionForPostGIS", () => {
  // Case 1 from Test Plan: null input returns null
  it("returns null when passed null (no region configured)", () => {
    // Null indicates no operating region has been set for the instance.
    expect(normalizeRegionForPostGIS(null)).toBeNull();
  });

  // Case 2 from Test Plan: bare Polygon from createVolosInstance.ts returned unchanged
  it("passes seeded live bare Polygon geometry from createVolosInstance.ts untouched", () => {
    // Seeded Volos instance polygon coordinates (lon 22.88-23.02, lat 39.33-39.41)
    const volosPolygon = {
      type: "Polygon",
      coordinates: [
        [
          [22.88, 39.33],
          [23.02, 39.33],
          [23.02, 39.41],
          [22.88, 39.41],
          [22.88, 39.33],
        ],
      ],
    };
    const result = normalizeRegionForPostGIS(volosPolygon);
    // toBe, not toEqual: this path promises to hand back the very same object, so identity is
    // the assertion that would catch a future version that copied it instead.
    expect(result).toBe(volosPolygon);
  });

  // Case 3 from Test Plan: FeatureCollection with one Polygon feature
  it("unwraps a single-feature FeatureCollection to its bare geometry", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: polygon(0) }],
    });

    expect(result).toEqual(polygon(0));
  });

  // Case 4 from Test Plan: FeatureCollection with two Polygon features
  it("merges a FeatureCollection with two polygon features into a single MultiPolygon", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: polygon(0) },
        { type: "Feature", geometry: polygon(10) },
      ],
    });

    expect(result.type).toBe("MultiPolygon");
    expect(result.coordinates).toEqual([
      polygon(0).coordinates,
      polygon(10).coordinates,
    ]);
  });

  // Case 5 from Test Plan. Both of these mean "a collection holding no geometry", and both
  // must answer null — a FeatureCollection is not valid input for ST_GeomFromGeoJSON.
  it("returns null when a FeatureCollection has an empty features array", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [],
    });

    expect(result).toBeNull();
  });

  it("returns null when every feature carries a null geometry", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: null, properties: {} }],
    });

    expect(result).toBeNull();
  });

  // The map hands back a bare Feature[] (Map.tsx:75) and the registration path can pass it
  // straight in, so arrays must normalise exactly like the equivalent FeatureCollection.
  it("normalises a bare array of Features the same as a FeatureCollection", () => {
    const asArray = normalizeRegionForPostGIS([
      { type: "Feature", geometry: polygon(0), properties: {} },
      { type: "Feature", geometry: polygon(10), properties: {} },
    ]);
    const asCollection = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: polygon(0), properties: {} },
        { type: "Feature", geometry: polygon(10), properties: {} },
      ],
    });

    expect(asArray).toEqual(asCollection);
    expect(asArray.type).toBe("MultiPolygon");
  });

  it("unwraps a single-element Feature array to its bare geometry", () => {
    const result = normalizeRegionForPostGIS([
      { type: "Feature", geometry: polygon(3), properties: {} },
    ])

    expect(result).toEqual(polygon(3));
  });

  it("returns null for an empty Feature array (the map's cleared-map shape)", () => {
    expect(normalizeRegionForPostGIS([])).toBeNull();
  });

  // Case 6 from Test Plan: single Feature wrapping a Polygon
  it("unwraps a single Feature wrapping a Polygon to its bare geometry", () => {
    const result = normalizeRegionForPostGIS({
      type: "Feature",
      geometry: polygon(3),
    });

    expect(result).toEqual(polygon(3));
  });

  // Edge / failure cases
  it("drops features whose geometry is null in a FeatureCollection", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: null },
        { type: "Feature", geometry: polygon(0) },
      ],
    });

    expect(result).toEqual(polygon(0));
  });

  it("returns null when a FeatureCollection contains only null geometries", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: null }],
    });

    expect(result).toBeNull();
  });

  it("falls back to the first geometry when feature types are mixed", () => {
    const point = { type: "Point", coordinates: [1, 2] };
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: polygon(0) },
        { type: "Feature", geometry: point },
      ],
    });

    expect(result).toEqual(polygon(0));
  });

  it("passes non-object values through untouched", () => {
    expect(normalizeRegionForPostGIS(undefined)).toBeUndefined();
    expect(normalizeRegionForPostGIS("invalid")).toBe("invalid");
  });
});
