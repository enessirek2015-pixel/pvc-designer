export type FreeDrawTool =
  | "select"
  | "wall"
  | "line"
  | "rectangle"
  | "circle"
  | "arc"
  | "polyline"
  | "dimension"
  | "text"
  | "erase"
  | "window"
  | "door"
  | "sliding";

export type FreeDrawPoint = {
  x: number;
  y: number;
};

export type FreeDrawLineEntity = {
  id: string;
  type: "line";
  start: FreeDrawPoint;
  end: FreeDrawPoint;
};

export type FreeDrawRectangleEntity = {
  id: string;
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FreeDrawCircleEntity = {
  id: string;
  type: "circle";
  center: FreeDrawPoint;
  radius: number;
};

export type FreeDrawArcEntity = {
  id: string;
  type: "arc";
  start: FreeDrawPoint;
  mid: FreeDrawPoint;
  end: FreeDrawPoint;
};

export type FreeDrawPolylineEntity = {
  id: string;
  type: "polyline";
  points: FreeDrawPoint[];
  closed: boolean;
};

export type FreeDrawDimensionEntity = {
  id: string;
  type: "dimension";
  start: FreeDrawPoint;
  end: FreeDrawPoint;
  offset: number;
};

export type FreeDrawTextEntity = {
  id: string;
  type: "text";
  position: FreeDrawPoint;
  text: string;
};

export type FreeDrawWallType = "interior" | "exterior" | "partition" | "curtain";

export type FreeDrawWallEntity = {
  id: string;
  type: "wall";
  start: FreeDrawPoint;
  end: FreeDrawPoint;
  thickness: number;
  chainId?: string;
  segmentIndex?: number;
  wallType?: FreeDrawWallType;
  roomName?: string;
};

export type FreeDrawOpeningCategory = "window" | "door" | "sliding";

export type FreeDrawOpeningSwing = "fixed" | "left" | "right" | "double" | "sliding";
export type FreeDrawOpeningLeafKind = "fixed" | "left" | "right" | "slide-left" | "slide-right";
export type FreeDrawOpeningPreset =
  | "single-window"
  | "double-window"
  | "triple-window"
  | "window-toplight"
  | "single-door"
  | "door-sidelight"
  | "slider-2"
  | "slider-3";

export type FreeDrawOpeningEntity = {
  id: string;
  type: "opening";
  category: FreeDrawOpeningCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: number;
  topLight: boolean;
  swing: FreeDrawOpeningSwing;
  frameThickness: number;
  mullionThickness: number;
  glassInset: number;
  leafTypes?: FreeDrawOpeningLeafKind[];
  columnRatios?: number[];
  preset?: FreeDrawOpeningPreset;
  hostWallId?: string | null;
  hostOrientation?: "horizontal" | "vertical" | null;
};

export type FreeDrawEntity =
  | FreeDrawWallEntity
  | FreeDrawLineEntity
  | FreeDrawRectangleEntity
  | FreeDrawCircleEntity
  | FreeDrawArcEntity
  | FreeDrawPolylineEntity
  | FreeDrawDimensionEntity
  | FreeDrawTextEntity
  | FreeDrawOpeningEntity;

export type FreeDrawDraft = {
  tool: Exclude<FreeDrawTool, "select" | "erase" | "text">;
  points: FreeDrawPoint[];
  chainStart?: FreeDrawPoint;
  chainId?: string;
  segmentIndex?: number;
  wallType?: FreeDrawWallType;
  roomName?: string;
};

export type Segment = {
  start: FreeDrawPoint;
  end: FreeDrawPoint;
};

export const FREE_DRAW_WALL_TYPE_OPTIONS: Array<{ value: FreeDrawWallType; label: string; shortLabel: string }> = [
  { value: "interior", label: "Ic Duvar", shortLabel: "IC" },
  { value: "exterior", label: "Dis Duvar", shortLabel: "DIS" },
  { value: "partition", label: "Bolme", shortLabel: "BLM" },
  { value: "curtain", label: "Giydirme", shortLabel: "GYD" }
];

export function createFreeDrawId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function roundPoint(point: FreeDrawPoint) {
  return {
    x: Number(point.x.toFixed(3)),
    y: Number(point.y.toFixed(3))
  };
}

export function distanceBetween(a: FreeDrawPoint, b: FreeDrawPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getMidpoint(a: FreeDrawPoint, b: FreeDrawPoint): FreeDrawPoint {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeRectangle(first: FreeDrawPoint, second: FreeDrawPoint) {
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  const width = Math.abs(second.x - first.x);
  const height = Math.abs(second.y - first.y);

  return { x, y, width, height };
}

export function createLineEntity(start: FreeDrawPoint, end: FreeDrawPoint): FreeDrawLineEntity {
  return {
    id: createFreeDrawId("line"),
    type: "line",
    start: roundPoint(start),
    end: roundPoint(end)
  };
}

export function createRectangleEntity(first: FreeDrawPoint, second: FreeDrawPoint): FreeDrawRectangleEntity {
  const rect = normalizeRectangle(first, second);

  return {
    id: createFreeDrawId("rect"),
    type: "rectangle",
    ...rect
  };
}

export function createCircleEntity(center: FreeDrawPoint, edge: FreeDrawPoint): FreeDrawCircleEntity {
  return {
    id: createFreeDrawId("circle"),
    type: "circle",
    center: roundPoint(center),
    radius: Number(distanceBetween(center, edge).toFixed(3))
  };
}

export function createArcEntity(start: FreeDrawPoint, mid: FreeDrawPoint, end: FreeDrawPoint): FreeDrawArcEntity {
  return {
    id: createFreeDrawId("arc"),
    type: "arc",
    start: roundPoint(start),
    mid: roundPoint(mid),
    end: roundPoint(end)
  };
}

export function createPolylineEntity(points: FreeDrawPoint[], closed = false): FreeDrawPolylineEntity {
  return {
    id: createFreeDrawId("polyline"),
    type: "polyline",
    points: points.map(roundPoint),
    closed
  };
}

export function createDimensionEntity(start: FreeDrawPoint, end: FreeDrawPoint, offset = 42): FreeDrawDimensionEntity {
  return {
    id: createFreeDrawId("dimension"),
    type: "dimension",
    start: roundPoint(start),
    end: roundPoint(end),
    offset
  };
}

export function createTextEntity(position: FreeDrawPoint, text: string): FreeDrawTextEntity {
  return {
    id: createFreeDrawId("text"),
    type: "text",
    position: roundPoint(position),
    text
  };
}

export function createWallEntity(
  first: FreeDrawPoint,
  second: FreeDrawPoint,
  thickness = 240,
  chainId?: string,
  segmentIndex?: number,
  wallType: FreeDrawWallType = "interior",
  roomName?: string
): FreeDrawWallEntity {
  const horizontal = Math.abs(second.x - first.x) >= Math.abs(second.y - first.y);
  const start = roundPoint({ x: first.x, y: first.y });
  const end = horizontal
    ? roundPoint({ x: second.x, y: first.y })
    : roundPoint({ x: first.x, y: second.y });

  return {
    id: createFreeDrawId("wall"),
    type: "wall",
    start,
    end,
    thickness: Math.max(100, Math.round(thickness)),
    chainId,
    segmentIndex,
    wallType,
    roomName: roomName?.trim() ? roomName.trim() : undefined
  };
}

export function getWallTypeLabel(wallType: FreeDrawWallType = "interior") {
  return FREE_DRAW_WALL_TYPE_OPTIONS.find((option) => option.value === wallType)?.label ?? "Ic Duvar";
}

export function getWallTypeShortLabel(wallType: FreeDrawWallType = "interior") {
  return FREE_DRAW_WALL_TYPE_OPTIONS.find((option) => option.value === wallType)?.shortLabel ?? "IC";
}

export function getWallThicknessPresets(wallType: FreeDrawWallType = "interior") {
  switch (wallType) {
    case "exterior":
      return [200, 240, 300, 360];
    case "partition":
      return [100, 120, 140, 160];
    case "curtain":
      return [60, 80, 100, 120];
    default:
      return [140, 200, 240, 300];
  }
}

export function getWallChainMetadata(walls: FreeDrawWallEntity[]) {
  const anchor = walls.find((wall) => wall.roomName?.trim()) ?? walls[0];
  return {
    wallType: anchor?.wallType ?? "interior",
    roomName: anchor?.roomName?.trim() ?? ""
  };
}

export function createOpeningEntity(
  category: FreeDrawOpeningCategory,
  first: FreeDrawPoint,
  second: FreeDrawPoint
): FreeDrawOpeningEntity {
  const rect = normalizeRectangle(first, second);
  const width = Math.max(rect.width, 400);
  const height = Math.max(rect.height, category === "door" ? 900 : 600);

  if (category === "door") {
    return {
      id: createFreeDrawId("door"),
      type: "opening",
      category,
      x: rect.x,
      y: rect.y,
      width,
      height,
      columns: 1,
      topLight: false,
      swing: "right",
      frameThickness: 80,
      mullionThickness: 64,
      glassInset: 24,
      leafTypes: ["right"],
      columnRatios: [1],
      preset: "single-door",
      hostWallId: null,
      hostOrientation: null
    };
  }

  if (category === "sliding") {
    return {
      id: createFreeDrawId("slider"),
      type: "opening",
      category,
      x: rect.x,
      y: rect.y,
      width,
      height,
      columns: 2,
      topLight: false,
      swing: "sliding",
      frameThickness: 82,
      mullionThickness: 66,
      glassInset: 24,
      leafTypes: ["slide-left", "slide-right"],
      columnRatios: [1, 1],
      preset: "slider-2",
      hostWallId: null,
      hostOrientation: null
    };
  }

  return {
    id: createFreeDrawId("window"),
    type: "opening",
    category,
    x: rect.x,
    y: rect.y,
    width,
    height,
    columns: 2,
    topLight: false,
    swing: "double",
    frameThickness: 70,
    mullionThickness: 60,
    glassInset: 24,
    leafTypes: ["left", "right"],
    columnRatios: [1, 1],
    preset: "double-window",
    hostWallId: null,
    hostOrientation: null
  };
}

export function normalizeOpeningRatios(columns: number, ratios?: number[]) {
  if (!ratios?.length) {
    return Array.from({ length: columns }, () => 1);
  }

  const safe = ratios.slice(0, columns).map((value) => Math.max(0.25, Number(value) || 1));
  while (safe.length < columns) {
    safe.push(1);
  }
  return safe;
}

export function getDefaultLeafTypes(
  category: FreeDrawOpeningCategory,
  columns: number,
  swing: FreeDrawOpeningSwing = category === "sliding" ? "sliding" : "double"
): FreeDrawOpeningLeafKind[] {
  if (category === "sliding") {
    if (columns <= 2) {
      return ["slide-left", "slide-right"];
    }
    return ["slide-left", ...Array.from({ length: columns - 2 }, () => "fixed" as const), "slide-right"];
  }

  if (category === "door") {
    if (columns <= 1) {
      return [swing === "left" ? "left" : "right"];
    }
    return ["fixed", swing === "left" ? "left" : "right"];
  }

  if (columns <= 1) {
    return [swing === "left" ? "left" : swing === "fixed" ? "fixed" : "right"];
  }
  if (columns === 2) {
    return swing === "fixed" ? ["fixed", "fixed"] : ["left", "right"];
  }
  return ["left", ...Array.from({ length: columns - 2 }, () => "fixed" as const), "right"];
}

export function getOpeningLeafTypes(entity: FreeDrawOpeningEntity) {
  const fallback = getDefaultLeafTypes(entity.category, entity.columns, entity.swing);
  if (!entity.leafTypes?.length) {
    return fallback;
  }

  const next = entity.leafTypes.slice(0, entity.columns);
  while (next.length < entity.columns) {
    next.push(fallback[next.length] ?? "fixed");
  }
  return next;
}

export function buildOpeningPresetPatch(
  preset: FreeDrawOpeningPreset,
  entity?: FreeDrawOpeningEntity
): Partial<FreeDrawOpeningEntity> {
  switch (preset) {
    case "single-window":
      return {
        preset,
        category: "window",
        columns: 1,
        topLight: false,
        swing: "right",
        frameThickness: 70,
        mullionThickness: 60,
        columnRatios: [1],
        leafTypes: ["right"]
      };
    case "double-window":
      return {
        preset,
        category: "window",
        columns: 2,
        topLight: false,
        swing: "double",
        frameThickness: 70,
        mullionThickness: 60,
        columnRatios: [1, 1],
        leafTypes: ["left", "right"]
      };
    case "triple-window":
      return {
        preset,
        category: "window",
        columns: 3,
        topLight: false,
        swing: "double",
        frameThickness: 70,
        mullionThickness: 60,
        columnRatios: [1, 1, 1],
        leafTypes: ["left", "fixed", "right"]
      };
    case "window-toplight":
      return {
        preset,
        category: "window",
        columns: Math.max(2, entity?.columns ?? 2),
        topLight: true,
        swing: "double",
        frameThickness: 72,
        mullionThickness: 60,
        columnRatios: normalizeOpeningRatios(Math.max(2, entity?.columns ?? 2), entity?.columnRatios),
        leafTypes: getDefaultLeafTypes("window", Math.max(2, entity?.columns ?? 2), "double")
      };
    case "single-door":
      return {
        preset,
        category: "door",
        columns: 1,
        topLight: false,
        swing: "right",
        frameThickness: 80,
        mullionThickness: 64,
        columnRatios: [1],
        leafTypes: ["right"]
      };
    case "door-sidelight":
      return {
        preset,
        category: "door",
        columns: 2,
        topLight: false,
        swing: "right",
        frameThickness: 80,
        mullionThickness: 64,
        columnRatios: [0.72, 0.28],
        leafTypes: ["fixed", "right"]
      };
    case "slider-2":
      return {
        preset,
        category: "sliding",
        columns: 2,
        topLight: false,
        swing: "sliding",
        frameThickness: 82,
        mullionThickness: 66,
        columnRatios: [1, 1],
        leafTypes: ["slide-left", "slide-right"]
      };
    case "slider-3":
      return {
        preset,
        category: "sliding",
        columns: 3,
        topLight: false,
        swing: "sliding",
        frameThickness: 82,
        mullionThickness: 66,
        columnRatios: [1, 1, 1],
        leafTypes: ["slide-left", "fixed", "slide-right"]
      };
    default:
      return {};
  }
}

export function cloneEntity<T extends FreeDrawEntity>(entity: T): T {
  return JSON.parse(JSON.stringify(entity)) as T;
}

export function cloneDraft(draft: FreeDrawDraft | null) {
  return draft
    ? {
        tool: draft.tool,
        points: draft.points.map(roundPoint),
        chainStart: draft.chainStart ? roundPoint(draft.chainStart) : undefined,
        chainId: draft.chainId,
        segmentIndex: draft.segmentIndex,
        wallType: draft.wallType,
        roomName: draft.roomName
      }
    : null;
}

export function applyOrthoConstraint(origin: FreeDrawPoint, point: FreeDrawPoint) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: point.x, y: origin.y };
  }
  return { x: origin.x, y: point.y };
}

export function formatMeasurement(length: number) {
  return `${Math.round(length)} mm`;
}

export function getOpeningGeometry(entity: FreeDrawOpeningEntity) {
  const frameInset = entity.frameThickness;
  const mullion = entity.mullionThickness;
  const outer = {
    x: entity.x,
    y: entity.y,
    width: entity.width,
    height: entity.height
  };
  const inner = {
    x: entity.x + frameInset,
    y: entity.y + frameInset,
    width: Math.max(entity.width - frameInset * 2, 60),
    height: Math.max(entity.height - frameInset * 2, 60)
  };
  const toplightHeight = entity.topLight ? clamp(Math.round(inner.height * 0.22), 140, 260) : 0;
  const mainRect = {
    x: inner.x,
    y: inner.y + toplightHeight + (entity.topLight ? mullion : 0),
    width: inner.width,
    height: Math.max(inner.height - toplightHeight - (entity.topLight ? mullion : 0), 60)
  };

  const dividerXs: number[] = [];
  const clearWidth = Math.max(mainRect.width - mullion * (entity.columns - 1), 40);
  const ratios = normalizeOpeningRatios(entity.columns, entity.columnRatios);
  const ratioSum = ratios.reduce((total, value) => total + value, 0) || entity.columns;
  const cells: Array<{ x: number; y: number; width: number; height: number }> = [];
  let cursorX = mainRect.x;

  ratios.forEach((ratio, index) => {
    const cellWidth = clearWidth * (ratio / ratioSum);
    cells.push({
      x: cursorX,
      y: mainRect.y,
      width: cellWidth,
      height: mainRect.height
    });
    cursorX += cellWidth;
    if (index < ratios.length - 1) {
      dividerXs.push(cursorX + mullion * 0.5);
      cursorX += mullion;
    }
  });

  const glassCells = cells.map((cell) => ({
    x: cell.x + entity.glassInset,
    y: cell.y + entity.glassInset,
    width: Math.max(cell.width - entity.glassInset * 2, 20),
    height: Math.max(cell.height - entity.glassInset * 2, 20)
  }));

  const toplightRect = entity.topLight
    ? {
        x: inner.x + entity.glassInset,
        y: inner.y + entity.glassInset,
        width: Math.max(inner.width - entity.glassInset * 2, 20),
        height: Math.max(toplightHeight - entity.glassInset * 2, 20)
      }
    : null;

  return {
    outer,
    inner,
    mainRect,
    toplightHeight,
    dividerXs,
    ratios,
    cells,
    glassCells,
    toplightRect
  };
}

export function getWallOrientation(entity: FreeDrawWallEntity) {
  return Math.abs(entity.end.x - entity.start.x) >= Math.abs(entity.end.y - entity.start.y) ? "horizontal" : "vertical";
}

export function getWallGeometry(entity: FreeDrawWallEntity) {
  const orientation = getWallOrientation(entity);
  if (orientation === "horizontal") {
    const left = Math.min(entity.start.x, entity.end.x);
    const right = Math.max(entity.start.x, entity.end.x);
    const centerY = entity.start.y;
    return {
      orientation,
      left,
      right,
      top: centerY - entity.thickness * 0.5,
      bottom: centerY + entity.thickness * 0.5,
      rect: {
        x: left,
        y: centerY - entity.thickness * 0.5,
        width: right - left,
        height: entity.thickness
      },
      centerline: {
        start: { x: left, y: centerY },
        end: { x: right, y: centerY }
      },
      length: right - left
    };
  }

  const top = Math.min(entity.start.y, entity.end.y);
  const bottom = Math.max(entity.start.y, entity.end.y);
  const centerX = entity.start.x;
  return {
    orientation,
    top,
    bottom,
    left: centerX - entity.thickness * 0.5,
    right: centerX + entity.thickness * 0.5,
    rect: {
      x: centerX - entity.thickness * 0.5,
      y: top,
      width: entity.thickness,
      height: bottom - top
    },
    centerline: {
      start: { x: centerX, y: top },
      end: { x: centerX, y: bottom }
    },
    length: bottom - top
  };
}

export function findNearestWall(point: FreeDrawPoint, entities: FreeDrawEntity[], tolerance = 180) {
  let best: { entity: FreeDrawWallEntity; distance: number } | null = null;

  for (const entity of entities) {
    if (entity.type !== "wall") {
      continue;
    }

    const geometry = getWallGeometry(entity);
    const projection = projectPointToSegment(point, geometry.centerline.start, geometry.centerline.end, true);
    const distance = distanceBetween(point, projection);
    const expandedDistance = distance - entity.thickness * 0.5;
    if (expandedDistance <= tolerance && (!best || expandedDistance < best.distance)) {
      best = { entity, distance: expandedDistance };
    }
  }

  return best?.entity ?? null;
}

export function getHostedOpeningsForWallId(
  entities: FreeDrawEntity[],
  wallId: string,
  excludeOpeningId?: string
) {
  return entities
    .filter(
      (entity): entity is FreeDrawOpeningEntity =>
        entity.type === "opening" && entity.hostWallId === wallId && entity.id !== excludeOpeningId
    )
    .sort((left, right) =>
      (left.hostOrientation ?? "horizontal") === "horizontal" ? left.x - right.x : left.y - right.y
    );
}

function fitHostedSpanToGaps(
  desiredStart: number,
  desiredSpan: number,
  minSpan: number,
  wallStart: number,
  wallEnd: number,
  occupied: Array<{ start: number; end: number }>
) {
  const startLimit = wallStart + 40;
  const endLimit = wallEnd - 40;
  const gaps: Array<{ start: number; end: number; width: number }> = [];
  let cursor = startLimit;

  occupied.forEach((segment) => {
    if (segment.start > cursor) {
      gaps.push({
        start: cursor,
        end: segment.start,
        width: segment.start - cursor
      });
    }
    cursor = Math.max(cursor, segment.end);
  });

  if (cursor < endLimit) {
    gaps.push({
      start: cursor,
      end: endLimit,
      width: endLimit - cursor
    });
  }

  if (!gaps.length) {
    return {
      start: clamp(desiredStart, startLimit, Math.max(startLimit, endLimit - desiredSpan)),
      span: Math.max(minSpan, Math.min(desiredSpan, endLimit - startLimit))
    };
  }

  const preferredCenter = desiredStart + desiredSpan * 0.5;
  const candidates = gaps.map((gap) => {
    const span = Math.max(Math.min(desiredSpan, gap.width), Math.min(minSpan, gap.width));
    const start = clamp(preferredCenter - span * 0.5, gap.start, gap.end - span);
    return {
      start,
      span,
      distance: Math.abs(preferredCenter - (start + span * 0.5)),
      gapWidth: gap.width
    };
  });

  candidates.sort((left, right) => {
    if ((left.span >= minSpan) !== (right.span >= minSpan)) {
      return left.span >= minSpan ? -1 : 1;
    }
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }
    return right.gapWidth - left.gapWidth;
  });

  if (!candidates.length) {
    return {
      start: clamp(desiredStart, startLimit, Math.max(startLimit, endLimit - desiredSpan)),
      span: Math.max(minSpan, Math.min(desiredSpan, endLimit - startLimit))
    };
  }

  const best = candidates[0];
  return {
    start: best.start,
    span: best.span
  };
}

export function fitHostedOpeningToWall(
  opening: FreeDrawOpeningEntity,
  wall: FreeDrawWallEntity,
  entities: FreeDrawEntity[],
  excludeOpeningId?: string
) {
  const geometry = getWallGeometry(wall);
  const orientation = opening.hostOrientation ?? geometry.orientation;
  const minSpan = opening.category === "door" ? 800 : opening.category === "sliding" ? 1200 : 700;
  const hosted = getHostedOpeningsForWallId(entities, wall.id, excludeOpeningId);

  if (orientation === "horizontal") {
    const occupied = hosted.map((item) => ({
      start: item.x,
      end: item.x + item.width
    }));
    const fitted = fitHostedSpanToGaps(opening.x, opening.width, minSpan, geometry.left, geometry.right, occupied);
    return {
      ...opening,
      x: fitted.start,
      y: geometry.rect.y,
      width: fitted.span,
      height: geometry.rect.height,
      hostWallId: wall.id,
      hostOrientation: "horizontal" as const
    };
  }

  const occupied = hosted.map((item) => ({
    start: item.y,
    end: item.y + item.height
  }));
  const fitted = fitHostedSpanToGaps(opening.y, opening.height, minSpan, geometry.top, geometry.bottom, occupied);
  return {
    ...opening,
    x: geometry.rect.x,
    y: fitted.start,
    width: geometry.rect.width,
    height: fitted.span,
    hostWallId: wall.id,
    hostOrientation: "vertical" as const
  };
}

export function createSmartOpeningEntity(
  category: FreeDrawOpeningCategory,
  first: FreeDrawPoint,
  second: FreeDrawPoint,
  entities: FreeDrawEntity[]
) {
  const midpoint = getMidpoint(first, second);
  const wall = findNearestWall(midpoint, entities);
  if (!wall) {
    return createOpeningEntity(category, first, second);
  }

  const wallGeometry = getWallGeometry(wall);
  const opening = createOpeningEntity(category, first, second);
  const minSpan = category === "door" ? 800 : category === "sliding" ? 1200 : 700;

  if (wallGeometry.orientation === "horizontal") {
    const rawLeft = Math.min(first.x, second.x);
    const rawRight = Math.max(first.x, second.x);
    const span = Math.max(rawRight - rawLeft, minSpan);
    const centerX = (rawLeft + rawRight) * 0.5;
    const maxSpan = Math.max(wallGeometry.length - 80, minSpan);
    const width = clamp(span, minSpan, maxSpan);
    const x = clamp(centerX - width * 0.5, wallGeometry.left + 40, wallGeometry.right - width - 40);
    return fitHostedOpeningToWall({
      ...opening,
      x,
      y: wallGeometry.rect.y,
      width,
      height: wallGeometry.rect.height,
      hostWallId: wall.id,
      hostOrientation: "horizontal" as const,
      topLight: false
    }, wall, entities);
  }

  const rawTop = Math.min(first.y, second.y);
  const rawBottom = Math.max(first.y, second.y);
  const span = Math.max(rawBottom - rawTop, minSpan);
  const centerY = (rawTop + rawBottom) * 0.5;
  const maxSpan = Math.max(wallGeometry.length - 80, minSpan);
  const height = clamp(span, minSpan, maxSpan);
  const y = clamp(centerY - height * 0.5, wallGeometry.top + 40, wallGeometry.bottom - height - 40);

  return fitHostedOpeningToWall({
    ...opening,
    x: wallGeometry.rect.x,
    y,
    width: wallGeometry.rect.width,
    height,
    hostWallId: wall.id,
    hostOrientation: "vertical" as const,
    topLight: false
  }, wall, entities);
}

export function getDimensionGeometry(entity: FreeDrawDimensionEntity) {
  const angle = Math.atan2(entity.end.y - entity.start.y, entity.end.x - entity.start.x);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const startOffset = {
    x: entity.start.x + nx * entity.offset,
    y: entity.start.y + ny * entity.offset
  };
  const endOffset = {
    x: entity.end.x + nx * entity.offset,
    y: entity.end.y + ny * entity.offset
  };
  const labelPoint = {
    x: (startOffset.x + endOffset.x) * 0.5 + nx * 14,
    y: (startOffset.y + endOffset.y) * 0.5 + ny * 14
  };

  return {
    startOffset,
    endOffset,
    labelPoint,
    length: distanceBetween(entity.start, entity.end)
  };
}

function getCircleFromThreePoints(start: FreeDrawPoint, mid: FreeDrawPoint, end: FreeDrawPoint) {
  const determinant =
    2 *
    (start.x * (mid.y - end.y) +
      mid.x * (end.y - start.y) +
      end.x * (start.y - mid.y));

  if (Math.abs(determinant) < 0.0001) {
    return null;
  }

  const ux =
    ((start.x * start.x + start.y * start.y) * (mid.y - end.y) +
      (mid.x * mid.x + mid.y * mid.y) * (end.y - start.y) +
      (end.x * end.x + end.y * end.y) * (start.y - mid.y)) /
    determinant;
  const uy =
    ((start.x * start.x + start.y * start.y) * (end.x - mid.x) +
      (mid.x * mid.x + mid.y * mid.y) * (start.x - end.x) +
      (end.x * end.x + end.y * end.y) * (mid.x - start.x)) /
    determinant;

  const center = { x: ux, y: uy };
  return {
    center,
    radius: distanceBetween(center, start)
  };
}

function normalizeAngle(angle: number) {
  let value = angle;
  while (value < 0) {
    value += Math.PI * 2;
  }
  while (value >= Math.PI * 2) {
    value -= Math.PI * 2;
  }
  return value;
}

function angleDeltaCcW(from: number, to: number) {
  const start = normalizeAngle(from);
  const end = normalizeAngle(to);
  return end >= start ? end - start : Math.PI * 2 - start + end;
}

function angleDeltaCw(from: number, to: number) {
  const start = normalizeAngle(from);
  const end = normalizeAngle(to);
  return start >= end ? start - end : Math.PI * 2 - end + start;
}

export function buildArcSamplePoints(entity: FreeDrawArcEntity, segmentCount = 28) {
  const circle = getCircleFromThreePoints(entity.start, entity.mid, entity.end);
  if (!circle) {
    return [entity.start, entity.mid, entity.end];
  }

  const startAngle = Math.atan2(entity.start.y - circle.center.y, entity.start.x - circle.center.x);
  const midAngle = Math.atan2(entity.mid.y - circle.center.y, entity.mid.x - circle.center.x);
  const endAngle = Math.atan2(entity.end.y - circle.center.y, entity.end.x - circle.center.x);
  const ccwSpan = angleDeltaCcW(startAngle, endAngle);
  const ccwMidSpan = angleDeltaCcW(startAngle, midAngle);
  const useCcw = ccwMidSpan < ccwSpan;
  const totalSpan = useCcw ? ccwSpan : angleDeltaCw(startAngle, endAngle);

  const points: FreeDrawPoint[] = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    const ratio = index / segmentCount;
    const angle = useCcw ? startAngle + totalSpan * ratio : startAngle - totalSpan * ratio;
    points.push({
      x: circle.center.x + Math.cos(angle) * circle.radius,
      y: circle.center.y + Math.sin(angle) * circle.radius
    });
  }

  return points;
}

export function getEntitySegments(entity: FreeDrawEntity): Segment[] {
  if (entity.type === "wall") {
    const geometry = getWallGeometry(entity);
    const { rect, centerline } = geometry;
    const topLeft = { x: rect.x, y: rect.y };
    const topRight = { x: rect.x + rect.width, y: rect.y };
    const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };
    const bottomLeft = { x: rect.x, y: rect.y + rect.height };
    return [
      { start: topLeft, end: topRight },
      { start: topRight, end: bottomRight },
      { start: bottomRight, end: bottomLeft },
      { start: bottomLeft, end: topLeft },
      { start: centerline.start, end: centerline.end }
    ];
  }

  if (entity.type === "line") {
    return [{ start: entity.start, end: entity.end }];
  }

  if (entity.type === "rectangle") {
    const topLeft = { x: entity.x, y: entity.y };
    const topRight = { x: entity.x + entity.width, y: entity.y };
    const bottomRight = { x: entity.x + entity.width, y: entity.y + entity.height };
    const bottomLeft = { x: entity.x, y: entity.y + entity.height };
    return [
      { start: topLeft, end: topRight },
      { start: topRight, end: bottomRight },
      { start: bottomRight, end: bottomLeft },
      { start: bottomLeft, end: topLeft }
    ];
  }

  if (entity.type === "polyline") {
    const segments = entity.points.slice(1).map((point, index) => ({
      start: entity.points[index],
      end: point
    }));
    if (entity.closed && entity.points.length > 2) {
      segments.push({
        start: entity.points[entity.points.length - 1],
        end: entity.points[0]
      });
    }
    return segments;
  }

  if (entity.type === "arc") {
    const points = buildArcSamplePoints(entity);
    return points.slice(1).map((point, index) => ({
      start: points[index],
      end: point
    }));
  }

  if (entity.type === "dimension") {
    const geometry = getDimensionGeometry(entity);
    return [
      { start: entity.start, end: geometry.startOffset },
      { start: geometry.startOffset, end: geometry.endOffset },
      { start: entity.end, end: geometry.endOffset }
    ];
  }

  if (entity.type === "opening") {
    const geometry = getOpeningGeometry(entity);
    const { outer, inner, cells, dividerXs, toplightHeight, mainRect } = geometry;
    const segments: Segment[] = [
      { start: { x: outer.x, y: outer.y }, end: { x: outer.x + outer.width, y: outer.y } },
      { start: { x: outer.x + outer.width, y: outer.y }, end: { x: outer.x + outer.width, y: outer.y + outer.height } },
      { start: { x: outer.x + outer.width, y: outer.y + outer.height }, end: { x: outer.x, y: outer.y + outer.height } },
      { start: { x: outer.x, y: outer.y + outer.height }, end: { x: outer.x, y: outer.y } },
      { start: { x: inner.x, y: inner.y }, end: { x: inner.x + inner.width, y: inner.y } },
      { start: { x: inner.x + inner.width, y: inner.y }, end: { x: inner.x + inner.width, y: inner.y + inner.height } },
      { start: { x: inner.x + inner.width, y: inner.y + inner.height }, end: { x: inner.x, y: inner.y + inner.height } },
      { start: { x: inner.x, y: inner.y + inner.height }, end: { x: inner.x, y: inner.y } }
    ];

    if (entity.topLight) {
      const y = inner.y + toplightHeight + entity.mullionThickness * 0.5;
      segments.push({ start: { x: inner.x, y }, end: { x: inner.x + inner.width, y } });
    }

    dividerXs.forEach((x) => {
      segments.push({
        start: { x, y: mainRect.y },
        end: { x, y: mainRect.y + mainRect.height }
      });
    });

    cells.forEach((cell) => {
      segments.push(
        { start: { x: cell.x, y: cell.y }, end: { x: cell.x + cell.width, y: cell.y } },
        { start: { x: cell.x + cell.width, y: cell.y }, end: { x: cell.x + cell.width, y: cell.y + cell.height } },
        { start: { x: cell.x + cell.width, y: cell.y + cell.height }, end: { x: cell.x, y: cell.y + cell.height } },
        { start: { x: cell.x, y: cell.y + cell.height }, end: { x: cell.x, y: cell.y } }
      );
    });

    return segments;
  }

  return [];
}

export function getEntityEndpoints(entity: FreeDrawEntity) {
  if (entity.type === "wall") {
    const geometry = getWallGeometry(entity);
    return [
      { x: geometry.rect.x, y: geometry.rect.y },
      { x: geometry.rect.x + geometry.rect.width, y: geometry.rect.y },
      { x: geometry.rect.x + geometry.rect.width, y: geometry.rect.y + geometry.rect.height },
      { x: geometry.rect.x, y: geometry.rect.y + geometry.rect.height },
      geometry.centerline.start,
      geometry.centerline.end
    ];
  }
  if (entity.type === "line") {
    return [entity.start, entity.end];
  }
  if (entity.type === "rectangle") {
    return [
      { x: entity.x, y: entity.y },
      { x: entity.x + entity.width, y: entity.y },
      { x: entity.x + entity.width, y: entity.y + entity.height },
      { x: entity.x, y: entity.y + entity.height }
    ];
  }
  if (entity.type === "arc") {
    return [entity.start, entity.end];
  }
  if (entity.type === "polyline") {
    return entity.points;
  }
  if (entity.type === "dimension") {
    const geometry = getDimensionGeometry(entity);
    return [entity.start, entity.end, geometry.startOffset, geometry.endOffset];
  }
  if (entity.type === "text") {
    return [entity.position];
  }
  if (entity.type === "opening") {
    const geometry = getOpeningGeometry(entity);
    return [
      { x: geometry.outer.x, y: geometry.outer.y },
      { x: geometry.outer.x + geometry.outer.width, y: geometry.outer.y },
      { x: geometry.outer.x + geometry.outer.width, y: geometry.outer.y + geometry.outer.height },
      { x: geometry.outer.x, y: geometry.outer.y + geometry.outer.height },
      ...geometry.glassCells.flatMap((cell) => [
        { x: cell.x, y: cell.y },
        { x: cell.x + cell.width, y: cell.y + cell.height }
      ])
    ];
  }
  return [];
}

export function getEntityMidpoints(entity: FreeDrawEntity) {
  return getEntitySegments(entity).map((segment) => getMidpoint(segment.start, segment.end));
}

export function projectPointToSegment(
  point: FreeDrawPoint,
  start: FreeDrawPoint,
  end: FreeDrawPoint,
  clampToSegment = true
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 0.0001) {
    return start;
  }

  let ratio = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  if (clampToSegment) {
    ratio = clamp(ratio, 0, 1);
  }

  return {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio
  };
}

export function pointToSegmentDistance(point: FreeDrawPoint, segment: Segment) {
  const projected = projectPointToSegment(point, segment.start, segment.end, true);
  return distanceBetween(point, projected);
}

export function getEntityBounds(entity: FreeDrawEntity) {
  if (entity.type === "wall") {
    return getWallGeometry(entity).rect;
  }
  if (entity.type === "opening") {
    return { x: entity.x, y: entity.y, width: entity.width, height: entity.height };
  }
  if (entity.type === "rectangle") {
    return { x: entity.x, y: entity.y, width: entity.width, height: entity.height };
  }

  if (entity.type === "circle") {
    return {
      x: entity.center.x - entity.radius,
      y: entity.center.y - entity.radius,
      width: entity.radius * 2,
      height: entity.radius * 2
    };
  }

  const points =
    entity.type === "text"
      ? [
          entity.position,
          { x: entity.position.x + Math.max(entity.text.length * 11, 40), y: entity.position.y - 22 }
        ]
      : getEntityEndpoints(entity);

  if (!points.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

export function findEntityAtPoint(point: FreeDrawPoint, entities: FreeDrawEntity[], tolerance: number) {
  for (const entity of [...entities].reverse()) {
    if (entity.type === "wall") {
      const bounds = getEntityBounds(entity);
      if (
        point.x >= bounds.x - tolerance &&
        point.x <= bounds.x + bounds.width + tolerance &&
        point.y >= bounds.y - tolerance &&
        point.y <= bounds.y + bounds.height + tolerance
      ) {
        return entity.id;
      }
      continue;
    }

    if (entity.type === "opening") {
      const bounds = getEntityBounds(entity);
      if (
        point.x >= bounds.x - tolerance &&
        point.x <= bounds.x + bounds.width + tolerance &&
        point.y >= bounds.y - tolerance &&
        point.y <= bounds.y + bounds.height + tolerance
      ) {
        return entity.id;
      }
      continue;
    }

    if (entity.type === "circle") {
      const radialDistance = Math.abs(distanceBetween(point, entity.center) - entity.radius);
      if (radialDistance <= tolerance) {
        return entity.id;
      }
      continue;
    }

    if (entity.type === "text") {
      const bounds = getEntityBounds(entity);
      if (
        point.x >= bounds.x - tolerance &&
        point.x <= bounds.x + bounds.width + tolerance &&
        point.y >= bounds.y - bounds.height - tolerance &&
        point.y <= bounds.y + tolerance
      ) {
        return entity.id;
      }
      continue;
    }

    const isHit = getEntitySegments(entity).some((segment) => pointToSegmentDistance(point, segment) <= tolerance);
    if (isHit) {
      return entity.id;
    }
  }

  return null;
}
