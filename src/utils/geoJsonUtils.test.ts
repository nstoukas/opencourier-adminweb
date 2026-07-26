import { normalizeRegionForPostGIS } from "./geoJsonUtils";

// PostGIS columns hold a Geometry, never a FeatureCollection — the registry hit exactly
// this and failed at setup time. These cases pin each branch of the conversion.

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
  it("unwraps a single-feature FeatureCollection to its bare geometry", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: polygon(0) }],
    });

    expect(result).toEqual(polygon(0));
  });

  it("merges several polygons into one MultiPolygon", () => {
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

  it("drops features whose geometry is null", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: null },
        { type: "Feature", geometry: polygon(0) },
      ],
    });

    expect(result).toEqual(polygon(0));
  });

  it("returns null when a FeatureCollection carries no usable geometry", () => {
    const result = normalizeRegionForPostGIS({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: null }],
    });

    expect(result).toBeNull();
  });

  it("unwraps a lone Feature", () => {
    const result = normalizeRegionForPostGIS({
      type: "Feature",
      geometry: polygon(3),
    });

    expect(result).toEqual(polygon(3));
  });

  it("passes an existing geometry through untouched", () => {
    const geometry = polygon(5);
    expect(normalizeRegionForPostGIS(geometry)).toBe(geometry);
  });

  it("passes non-objects through rather than throwing", () => {
    expect(normalizeRegionForPostGIS(null)).toBeNull();
    expect(normalizeRegionForPostGIS(undefined)).toBeUndefined();
  });

  it("falls back to the first geometry when types are mixed", () => {
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
});
