import {
  distanceBetween,
  getEntityEndpoints,
  getEntityMidpoints,
  getEntitySegments,
  projectPointToSegment,
  type FreeDrawEntity,
  type FreeDrawPoint
} from "./freeDrawTools";

export type FreeDrawSnapMarker = "square" | "triangle" | "diamond" | "grid";
export type FreeDrawExternalGuide = {
  orientation: "vertical" | "horizontal";
  position: number;
  label?: string;
};

export type FreeDrawSnapCandidate = {
  point: FreeDrawPoint;
  label: "END" | "MID" | "PERP" | "GRID" | "GUIDE";
  marker: FreeDrawSnapMarker;
  distance: number;
  priority: number;
  guideLabel?: string;
};

export type FreeDrawSnapSettings = {
  endpoint: boolean;
  midpoint: boolean;
  perpendicular: boolean;
  grid: boolean;
  gridSize: number;
};

export function resolveFreeDrawSnap(
  point: FreeDrawPoint | null,
  entities: FreeDrawEntity[],
  settings: FreeDrawSnapSettings,
  zoom: number,
  basePoint?: FreeDrawPoint | null,
  externalGuides: FreeDrawExternalGuide[] = []
) {
  if (!point) {
    return null;
  }

  const threshold = 14 / Math.max(zoom, 0.25);
  const candidates: FreeDrawSnapCandidate[] = [];

  if (settings.endpoint) {
    for (const entity of entities) {
      for (const endpoint of getEntityEndpoints(entity)) {
        const distance = distanceBetween(point, endpoint);
        if (distance <= threshold) {
          candidates.push({
            point: endpoint,
            label: "END",
            marker: "square",
            distance,
            priority: 0
          });
        }
      }
    }
  }

  if (settings.midpoint) {
    for (const entity of entities) {
      for (const midpoint of getEntityMidpoints(entity)) {
        const distance = distanceBetween(point, midpoint);
        if (distance <= threshold) {
          candidates.push({
            point: midpoint,
            label: "MID",
            marker: "triangle",
            distance,
            priority: 1
          });
        }
      }
    }
  }

  if (settings.perpendicular && basePoint) {
    for (const entity of entities) {
      for (const segment of getEntitySegments(entity)) {
        const projection = projectPointToSegment(basePoint, segment.start, segment.end, true);
        const distance = distanceBetween(point, projection);
        if (distance <= threshold * 1.5) {
          candidates.push({
            point: projection,
            label: "PERP",
            marker: "diamond",
            distance,
            priority: 2
          });
        }
      }
    }
  }

  if (settings.grid) {
    const gridSize = Math.max(1, settings.gridSize);
    const gridPoint = {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
    candidates.push({
      point: gridPoint,
      label: "GRID",
      marker: "grid",
      distance: distanceBetween(point, gridPoint),
      priority: 3
    });
  }

  for (const guide of externalGuides) {
    const guidePoint =
      guide.orientation === "vertical"
        ? { x: guide.position, y: point.y }
        : { x: point.x, y: guide.position };
    const distance = distanceBetween(point, guidePoint);
    if (distance <= threshold) {
      candidates.push({
        point: guidePoint,
        label: "GUIDE",
        marker: "diamond",
        distance,
        priority: 2,
        guideLabel: guide.label
      });
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates.sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return left.distance - right.distance;
  })[0];
}
