import { useEffect, useMemo, useRef, useState } from "react";
import { getCanvasClientPoint, getCanvasWorldPoint } from "../../lib/canvasPointer";
import { buildFreeDrawFacadePrintHtml } from "./freeDrawFacadePrint";
import { buildFreeDrawPlanPrintHtml } from "./freeDrawPrint";
import { buildFreeDrawTechnicalPacketHtml, type FreeDrawFacadePacketItem } from "./freeDrawTechnicalPacket";
import { resolveFreeDrawSnap, type FreeDrawExternalGuide } from "./freeDrawSnap";
import {
  applyOrthoConstraint,
  buildArcSamplePoints,
  clamp,
  createSmartOpeningEntity,
  createWallEntity,
  distanceBetween,
  findEntityAtPoint,
  FREE_DRAW_WALL_TYPE_OPTIONS,
  formatMeasurement,
  getDefaultLeafTypes,
  getDimensionGeometry,
  getEntityBounds,
  getWallChainMetadata,
  getOpeningLeafTypes,
  getOpeningGeometry,
  fitHostedOpeningToWall,
  getHostedOpeningsForWallId,
  getWallGeometry,
  getWallThicknessPresets,
  getWallTypeLabel,
  getWallTypeShortLabel,
  type FreeDrawDraft,
  type FreeDrawEntity,
  type FreeDrawOpeningEntity,
  type FreeDrawPoint,
  type FreeDrawOpeningPreset,
  type FreeDrawWallEntity,
  type FreeDrawTool,
  type FreeDrawWallType
} from "./freeDrawTools";
import { useFreeDrawStore } from "./useFreeDrawStore";

const TOOLBAR_TOOLS: Array<{ value: FreeDrawTool; label: string }> = [
  { value: "select", label: "Select" },
  { value: "wall", label: "Duvar" },
  { value: "line", label: "Line" },
  { value: "rectangle", label: "Rect" },
  { value: "circle", label: "Circle" },
  { value: "arc", label: "Arc" },
  { value: "polyline", label: "Polyline" },
  { value: "dimension", label: "Dimension" },
  { value: "text", label: "Text" },
  { value: "erase", label: "Erase" },
  { value: "window", label: "Pencere" },
  { value: "door", label: "Kapi" },
  { value: "sliding", label: "Surme" }
];

const OPENING_PRESETS: Array<{ value: FreeDrawOpeningPreset; label: string }> = [
  { value: "single-window", label: "Tek Pencere" },
  { value: "double-window", label: "Cift Pencere" },
  { value: "triple-window", label: "Uclu Pencere" },
  { value: "window-toplight", label: "Vasistasli" },
  { value: "single-door", label: "Tek Kapi" },
  { value: "door-sidelight", label: "Kapi + Sabit" },
  { value: "slider-2", label: "Surme 2" },
  { value: "slider-3", label: "Surme 3" }
];

const ROOM_NAME_PRESETS = ["Salon", "Mutfak", "Yatak Odasi", "Banyo", "Ofis", "Balkon"];

const VIEWBOX_WIDTH = 2200;
const VIEWBOX_HEIGHT = 1400;

type FreeDrawCanvasProps = {
  onImportOpening?: (opening: FreeDrawOpeningEntity) => void;
  onImportWallFacade?: (wall: FreeDrawWallEntity, openings: FreeDrawOpeningEntity[]) => void;
  onImportFacadeBundle?: (bundle: FreeDrawFacadePacketItem[]) => void;
  focusChainId?: string | null;
  linkedFacadeDesigns?: Array<{
    designId: string;
    name: string;
    chainId?: string;
    bundleId?: string;
    bundleName?: string;
    roomName?: string;
    facadeTitle?: string;
    segmentLabel?: string;
    openingCount?: number;
    wallType?: FreeDrawWallType;
    active?: boolean;
    syncStatus?: "synced" | "stale" | "missing";
    revisionCount?: number;
    syncDiffCount?: number;
  }>;
  onLoadLinkedFacade?: (designId: string) => void;
  designerGuides?: Array<{
    orientation: "vertical" | "horizontal";
    positionMm: number;
    label: string;
  }>;
};

type FreeDrawFacadeProgramItem = FreeDrawFacadePacketItem & {
  chainId: string;
  roomName: string;
  wallType: FreeDrawWallType;
  totalLength: number;
  openingCount: number;
  solidLength: number;
  wallLength: number;
  wallThickness: number;
  segmentLabel: string;
};

type FreeDrawLinkedSegmentState = {
  linked: number;
  stale: number;
  missing: number;
  diffCount: number;
};

function buildGridTicks(min: number, max: number, step: number) {
  const start = Math.floor(min / step) * step;
  const values: number[] = [];
  for (let value = start; value <= max + step; value += step) {
    values.push(value);
  }
  return values;
}

function buildSegmentKey(chainId: string, segmentLabel?: string) {
  return `${chainId}:${segmentLabel ?? "Ana"}`;
}

function getDraftBasePoint(draft: FreeDrawDraft | null) {
  if (!draft || !draft.points.length) {
    return null;
  }
  return draft.points[draft.points.length - 1];
}

function buildDraftPreviewEntity(
  draft: FreeDrawDraft | null,
  point: FreeDrawPoint | null,
  entities: FreeDrawEntity[]
): FreeDrawEntity | null {
  if (!draft || !point || !draft.points.length) {
    return null;
  }

  const first = draft.points[0];
  const last = draft.points[draft.points.length - 1];

  switch (draft.tool) {
    case "wall":
      return createWallEntity(first, point, 240, draft.chainId, draft.segmentIndex, draft.wallType ?? "interior", draft.roomName);
    case "line":
      return { id: "preview-line", type: "line", start: last, end: point };
    case "rectangle": {
      const x = Math.min(first.x, point.x);
      const y = Math.min(first.y, point.y);
      return {
        id: "preview-rect",
        type: "rectangle",
        x,
        y,
        width: Math.abs(point.x - first.x),
        height: Math.abs(point.y - first.y)
      };
    }
    case "circle":
      return {
        id: "preview-circle",
        type: "circle",
        center: first,
        radius: distanceBetween(first, point)
      };
    case "arc":
      if (draft.points.length === 1) {
        return { id: "preview-line", type: "line", start: first, end: point };
      }
      return {
        id: "preview-arc",
        type: "arc",
        start: draft.points[0],
        mid: draft.points[1],
        end: point
      };
    case "polyline":
      return {
        id: "preview-polyline",
        type: "polyline",
        points: [...draft.points, point],
        closed: false
      };
    case "dimension":
      return {
        id: "preview-dimension",
        type: "dimension",
        start: first,
        end: point,
        offset: 42
      };
    case "window":
      return createSmartOpeningEntity("window", first, point, entities);
    case "door":
      return createSmartOpeningEntity("door", first, point, entities);
    case "sliding":
      return createSmartOpeningEntity("sliding", first, point, entities);
    default:
      return null;
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderSwingMarker(
  leafType: ReturnType<typeof getOpeningLeafTypes>[number],
  cell: { x: number; y: number; width: number; height: number }
) {
  const inset = 18;
  if (leafType === "fixed") {
    return null;
  }

  if (leafType === "slide-left" || leafType === "slide-right") {
    const arrowToRight = leafType === "slide-left";
    const startX = arrowToRight ? cell.x + inset : cell.x + cell.width - inset;
    const endX = arrowToRight ? cell.x + cell.width - inset : cell.x + inset;
    return (
      <g className="free-opening-swing">
        <line x1={startX} y1={cell.y + inset} x2={endX} y2={cell.y + inset} />
        <polyline
          points={
            arrowToRight
              ? `${endX - 22},${cell.y + inset - 8} ${endX},${cell.y + inset} ${endX - 22},${cell.y + inset + 8}`
              : `${endX + 22},${cell.y + inset - 8} ${endX},${cell.y + inset} ${endX + 22},${cell.y + inset + 8}`
          }
        />
      </g>
    );
  }

  const leftHinged = leafType === "left";
  const rightHinged = leafType === "right";

  if (!leftHinged && !rightHinged) {
    return null;
  }

  const handleX = leftHinged ? cell.x + inset : cell.x + cell.width - inset;
  const endX = leftHinged ? cell.x + cell.width - inset : cell.x + inset;
  const centerY = cell.y + cell.height * 0.5;

  return (
    <g className="free-opening-swing">
      <line x1={handleX} y1={cell.y + inset} x2={endX} y2={centerY} />
      <line x1={handleX} y1={cell.y + cell.height - inset} x2={endX} y2={centerY} />
    </g>
  );
}

type FreeDrawRoomRegion = {
  chainId: string;
  points: FreeDrawPoint[];
  areaM2: number;
  perimeterMm: number;
  bounds: { left: number; right: number; top: number; bottom: number };
  labelPoint: FreeDrawPoint;
  name: string;
  wallType: FreeDrawWallType;
  segmentCount: number;
};

type FreeDrawJoinMarker = {
  x: number;
  y: number;
  size: number;
  type: "L" | "T" | "X";
};

type FreeDrawEndpointMerge = {
  point: FreeDrawPoint;
  currentOrientation: "horizontal" | "vertical";
  currentInsetSign: 1 | -1;
  neighborInsetSign: 1 | -1;
  wallType: FreeDrawWallType;
  active: boolean;
};

function isPointInsidePolygon(point: FreeDrawPoint, polygon: FreeDrawPoint[]) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y || 1) +
          currentPoint.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function pointsAlmostEqual(left: FreeDrawPoint, right: FreeDrawPoint, tolerance = 0.5) {
  return distanceBetween(left, right) <= tolerance;
}

function buildRoomRegions(entities: FreeDrawEntity[]): FreeDrawRoomRegion[] {
  const chains = new Map<string, FreeDrawWallEntity[]>();
  entities.forEach((entity) => {
    if (entity.type === "wall" && entity.chainId) {
      const bucket = chains.get(entity.chainId) ?? [];
      bucket.push(entity);
      chains.set(entity.chainId, bucket);
    }
  });

  const rooms: FreeDrawRoomRegion[] = [];
  chains.forEach((walls, chainId) => {
    const ordered = [...walls].sort((left, right) => (left.segmentIndex ?? 0) - (right.segmentIndex ?? 0));
    const metadata = getWallChainMetadata(ordered);
    if (ordered.length < 4) {
      return;
    }
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    if (!first || !last) {
      return;
    }
    if (distanceBetween(first.start, last.end) > 1) {
      return;
    }

    const points = [first.start, ...ordered.map((wall) => wall.end)];
    let doubleArea = 0;
    let cx = 0;
    let cy = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const cross = current.x * next.y - next.x * current.y;
      doubleArea += cross;
      cx += (current.x + next.x) * cross;
      cy += (current.y + next.y) * cross;
    }
    const areaAbs = Math.abs(doubleArea) * 0.5;
    if (areaAbs < 10000) {
      return;
    }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const perimeterMm = ordered.reduce((sum, wall) => sum + distanceBetween(wall.start, wall.end), 0);
    const centroidDivisor = doubleArea === 0 ? 1 : 3 * doubleArea;
    const labelPoint =
      doubleArea === 0
        ? {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length
          }
        : {
            x: cx / centroidDivisor,
            y: cy / centroidDivisor
          };

    rooms.push({
      chainId,
      points,
      areaM2: areaAbs / 1_000_000,
      perimeterMm,
      bounds: {
        left: Math.min(...xs),
        right: Math.max(...xs),
        top: Math.min(...ys),
        bottom: Math.max(...ys)
      },
      labelPoint,
      name: metadata.roomName || `Oda ${rooms.length + 1}`,
      wallType: metadata.wallType,
      segmentCount: ordered.length
    });
  });

  return rooms;
}

function renderRoomRegion(
  room: FreeDrawRoomRegion,
  selected = false,
  active = false,
  onHoverChange?: (hovering: boolean) => void,
  syncState?: { linked: number; stale: number; missing: number; diffCount?: number }
) {
  const badgeText =
    syncState && syncState.linked
      ? `PVC ${syncState.linked}${syncState.stale ? ` / !${syncState.stale}` : ""}${syncState.missing ? ` / ?${syncState.missing}` : ""}${syncState.diffCount ? ` / Δ${syncState.diffCount}` : ""}`
      : null;
  return (
    <g
      className={`free-room-region ${room.wallType} ${selected ? "selected" : ""} ${active ? "active" : ""}`}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <polygon
        points={room.points.map((point) => `${point.x},${point.y}`).join(" ")}
        className={`free-room-fill ${room.wallType}`}
      />
      <text x={room.labelPoint.x} y={room.labelPoint.y - 8} className="free-room-label">
        {room.name}
      </text>
      <text x={room.labelPoint.x} y={room.labelPoint.y + 16} className="free-room-area">
        {room.areaM2.toFixed(2)} m2
      </text>
      <text x={room.labelPoint.x} y={room.labelPoint.y + 36} className="free-room-meta">
        {getWallTypeLabel(room.wallType)} / {room.segmentCount} segment
      </text>
      {badgeText && (
        <g className="free-room-sync-badge">
          <rect x={room.labelPoint.x - 64} y={room.labelPoint.y + 46} width={128} height={22} rx={11} className="free-room-sync-pill" />
          <text x={room.labelPoint.x} y={room.labelPoint.y + 61} className="free-room-sync-text">
            {badgeText}
          </text>
        </g>
      )}
    </g>
  );
}

function getWallSyncBadgeAnchor(wall: FreeDrawWallEntity) {
  const geometry = getWallGeometry(wall);
  const x =
    geometry.orientation === "horizontal"
      ? geometry.centerline.start.x + geometry.length * 0.5
      : geometry.rect.x + geometry.rect.width + 34;
  const y =
    geometry.orientation === "horizontal"
      ? geometry.rect.y - 18
      : geometry.centerline.start.y + geometry.length * 0.5;
  return { geometry, x, y };
}

function renderWallSyncBadge(
  wall: FreeDrawWallEntity,
  syncState?: FreeDrawLinkedSegmentState,
  onClick?: () => void,
  onHoverChange?: (hovering: boolean) => void
) {
  if (!syncState || !syncState.linked) {
    return null;
  }

  const { geometry, x, y } = getWallSyncBadgeAnchor(wall);
  const label = wall.segmentIndex !== undefined ? `S${wall.segmentIndex + 1}` : "ANA";
  const stateText = syncState.missing
    ? `?${syncState.missing}`
    : syncState.stale
      ? `!${syncState.stale}`
      : `${syncState.linked}`;
  const badgeClass = syncState.missing ? "missing" : syncState.stale ? "stale" : "synced";

  return (
    <g
      className={`free-wall-sync-badge ${badgeClass}`}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onMouseDown={(event) => {
        if (!onClick) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <rect x={x - 42} y={y - 11} width={84} height={22} rx={11} className="free-wall-sync-pill" />
      <text x={x} y={y + 4} className="free-wall-sync-text">
        {label} / {stateText}
      </text>
    </g>
  );
}

function renderWallSyncTooltip(
  wall: FreeDrawWallEntity,
  items: NonNullable<FreeDrawCanvasProps["linkedFacadeDesigns"]>,
  syncState: FreeDrawLinkedSegmentState,
  onHoverChange?: (hovering: boolean) => void
) {
  if (!items.length) {
    return null;
  }

  const { geometry, x, y } = getWallSyncBadgeAnchor(wall);
  const tooltipX = geometry.orientation === "horizontal" ? x + 54 : x + 46;
  const tooltipY = geometry.orientation === "horizontal" ? y - 84 : y - 72;
  const orderedItems = [...items].sort((left, right) => {
    const priority = (status?: "synced" | "stale" | "missing") =>
      status === "stale" ? 0 : status === "missing" ? 1 : 2;
    return priority(left.syncStatus) - priority(right.syncStatus);
  });
  const visibleItems = orderedItems.slice(0, 4);
  const rowHeight = 18;
  const tooltipHeight = 50 + visibleItems.length * rowHeight + (orderedItems.length > visibleItems.length ? 16 : 0);

  return (
    <g
      className="free-wall-sync-tooltip"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      transform={`translate(${tooltipX}, ${tooltipY})`}
    >
      <rect width={232} height={tooltipHeight} rx={14} className="free-wall-sync-tooltip-shell" />
      <text x={14} y={18} className="free-wall-sync-tooltip-title">
        {wall.segmentIndex !== undefined ? `Segment S${wall.segmentIndex + 1}` : "Ana Segment"}
      </text>
      <text x={218} y={18} className="free-wall-sync-tooltip-meta">
        {syncState.diffCount} fark
      </text>
      <text x={14} y={34} className="free-wall-sync-tooltip-subtitle">
        {syncState.linked} bagli cephe / {syncState.stale} stale / {syncState.missing} eksik
      </text>
      {visibleItems.map((item, index) => {
        const rowY = 52 + index * rowHeight;
        const statusClass = item.syncStatus ?? "synced";
        const statusLabel =
          statusClass === "stale" ? "Plan Degisti" : statusClass === "missing" ? "Kaynak Eksik" : "Senkron";
        return (
          <g key={`tooltip-${item.designId}`} className={`free-wall-sync-tooltip-row ${statusClass}`}>
            <circle cx={16} cy={rowY - 4} r={3.5} className="free-wall-sync-tooltip-dot" />
            <text x={26} y={rowY - 1} className="free-wall-sync-tooltip-name">
              {item.name}
            </text>
            <text x={26} y={rowY + 11} className="free-wall-sync-tooltip-detail">
              {statusLabel} / {item.syncDiffCount ?? 0} fark / {item.revisionCount ?? 0} rev
            </text>
          </g>
        );
      })}
      {orderedItems.length > visibleItems.length && (
        <text x={14} y={tooltipHeight - 10} className="free-wall-sync-tooltip-more">
          +{orderedItems.length - visibleItems.length} cephe daha
        </text>
      )}
    </g>
  );
}

function renderRoomSchedule(
  rooms: FreeDrawRoomRegion[],
  selectedChainId?: string,
  onSelectChain?: (chainId: string) => void,
  hoveredChainId?: string | null,
  onHoverChain?: (chainId: string | null) => void,
  linkedFacadeCountByChain?: Map<string, number>,
  linkedFacadeStatusByChain?: Map<string, { stale: number; missing: number; diffCount: number }>
) {
  if (!rooms.length) {
    return null;
  }

  const panelWidth = 278;
  const rowHeight = 28;
  const panelX = VIEWBOX_WIDTH - panelWidth - 36;
  const panelY = 36;
  const panelHeight = 52 + rooms.length * rowHeight;

  return (
    <g className="free-room-schedule">
      <rect x={panelX} y={panelY} width={panelWidth} height={panelHeight} rx={18} className="free-room-schedule-shell" />
      <text x={panelX + 20} y={panelY + 24} className="free-room-schedule-title">
        Oda Listesi
      </text>
      <text x={panelX + panelWidth - 70} y={panelY + 24} className="free-room-schedule-meta">
        m2 / Cevre
      </text>
      {rooms.map((room, index) => {
        const rowY = panelY + 34 + index * rowHeight;
        const linkedCount = linkedFacadeCountByChain?.get(room.chainId) ?? 0;
        const chainStatus = linkedFacadeStatusByChain?.get(room.chainId);
        const stateLabel =
          chainStatus?.missing
            ? ` / ?${chainStatus.missing}${chainStatus.diffCount ? ` / Δ${chainStatus.diffCount}` : ""}`
            : chainStatus?.stale
              ? ` / !${chainStatus.stale}${chainStatus.diffCount ? ` / Δ${chainStatus.diffCount}` : ""}`
              : "";
        return (
          <g
            key={`room-schedule-${room.chainId}`}
            className={`free-room-schedule-entry ${room.chainId === selectedChainId ? "selected" : ""} ${room.chainId === hoveredChainId ? "hovered" : ""}`}
            onMouseEnter={() => onHoverChain?.(room.chainId)}
            onMouseLeave={() => onHoverChain?.(null)}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelectChain?.(room.chainId);
            }}
          >
            <rect x={panelX + 12} y={rowY} width={panelWidth - 24} height={22} rx={10} className="free-room-schedule-row" />
            <text x={panelX + 24} y={rowY + 15} className="free-room-schedule-name">
              {room.name}
            </text>
            <text x={panelX + panelWidth - 24} y={rowY + 15} className="free-room-schedule-value">
              {room.areaM2.toFixed(2)} / {Math.round(room.perimeterMm)}{linkedCount ? ` / PVC ${linkedCount}${stateLabel}` : ""}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderPlanLegend(rooms: FreeDrawRoomRegion[]) {
  if (!rooms.length) {
    return null;
  }

  const counts = FREE_DRAW_WALL_TYPE_OPTIONS.map((option) => ({
    ...option,
    count: rooms.filter((room) => room.wallType === option.value).length
  })).filter((option) => option.count > 0);

  if (!counts.length) {
    return null;
  }

  const panelX = 36;
  const panelY = 36;
  const panelWidth = 234;
  const panelHeight = 42 + counts.length * 24;

  return (
    <g className="free-plan-legend">
      <rect x={panelX} y={panelY} width={panelWidth} height={panelHeight} rx={18} className="free-plan-legend-shell" />
      <text x={panelX + 18} y={panelY + 23} className="free-plan-legend-title">
        Duvar Tipleri
      </text>
      {counts.map((item, index) => {
        const y = panelY + 42 + index * 24;
        return (
          <g key={`legend-${item.value}`}>
            <rect x={panelX + 16} y={y - 10} width={16} height={10} rx={4} className={`free-plan-legend-chip ${item.value}`} />
            <text x={panelX + 42} y={y - 1} className="free-plan-legend-label">
              {item.label}
            </text>
            <text x={panelX + panelWidth - 18} y={y - 1} className="free-plan-legend-value">
              {item.count}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderRoomAxisOverlay(room: FreeDrawRoomRegion) {
  const margin = 64;
  const leftX = room.bounds.left - margin;
  const rightX = room.bounds.right + margin;
  const topY = room.bounds.top - margin;
  const bottomY = room.bounds.bottom + margin;

  return (
    <g className="free-room-axis-overlay">
      <line x1={room.bounds.left} y1={topY} x2={room.bounds.left} y2={bottomY} className="free-room-axis-line" />
      <line x1={room.bounds.right} y1={topY} x2={room.bounds.right} y2={bottomY} className="free-room-axis-line" />
      <line x1={leftX} y1={room.bounds.top} x2={rightX} y2={room.bounds.top} className="free-room-axis-line" />
      <line x1={leftX} y1={room.bounds.bottom} x2={rightX} y2={room.bounds.bottom} className="free-room-axis-line" />
      <circle cx={room.bounds.left} cy={topY} r="14" className="free-room-axis-bubble" />
      <circle cx={room.bounds.right} cy={topY} r="14" className="free-room-axis-bubble" />
      <circle cx={leftX} cy={room.bounds.top} r="14" className="free-room-axis-bubble" />
      <circle cx={leftX} cy={room.bounds.bottom} r="14" className="free-room-axis-bubble" />
      <text x={room.bounds.left} y={topY + 5} className="free-room-axis-text">A</text>
      <text x={room.bounds.right} y={topY + 5} className="free-room-axis-text">B</text>
      <text x={leftX} y={room.bounds.top + 5} className="free-room-axis-text">1</text>
      <text x={leftX} y={room.bounds.bottom + 5} className="free-room-axis-text">2</text>
    </g>
  );
}

function renderWallTypeSymbols(entity: FreeDrawWallEntity) {
  const geometry = getWallGeometry(entity);
  const wallType = entity.wallType ?? "interior";

  if (wallType === "interior") {
    return null;
  }

  const marks: JSX.Element[] = [];
  const inset = Math.max(geometry.orientation === "horizontal" ? geometry.rect.height : geometry.rect.width, 16) * 0.22;

  if (wallType === "exterior") {
    const step = 110;
    if (geometry.orientation === "horizontal") {
      for (let x = geometry.rect.x + 24; x < geometry.rect.x + geometry.rect.width - 24; x += step) {
        marks.push(
          <line
            key={`ext-${entity.id}-${x}`}
            x1={x - 14}
            y1={geometry.rect.y + inset}
            x2={x + 14}
            y2={geometry.rect.y + geometry.rect.height - inset}
            className="free-wall-type-symbol"
          />
        );
      }
    } else {
      for (let y = geometry.rect.y + 24; y < geometry.rect.y + geometry.rect.height - 24; y += step) {
        marks.push(
          <line
            key={`ext-${entity.id}-${y}`}
            x1={geometry.rect.x + inset}
            y1={y - 14}
            x2={geometry.rect.x + geometry.rect.width - inset}
            y2={y + 14}
            className="free-wall-type-symbol"
          />
        );
      }
    }
  }

  if (wallType === "partition") {
    const step = 160;
    if (geometry.orientation === "horizontal") {
      for (let x = geometry.rect.x + 18; x < geometry.rect.x + geometry.rect.width - 18; x += step) {
        marks.push(
          <line
            key={`partition-${entity.id}-${x}`}
            x1={x}
            y1={geometry.rect.y + 8}
            x2={x}
            y2={geometry.rect.y + geometry.rect.height - 8}
            className="free-wall-type-symbol partition"
          />
        );
      }
    } else {
      for (let y = geometry.rect.y + 18; y < geometry.rect.y + geometry.rect.height - 18; y += step) {
        marks.push(
          <line
            key={`partition-${entity.id}-${y}`}
            x1={geometry.rect.x + 8}
            y1={y}
            x2={geometry.rect.x + geometry.rect.width - 8}
            y2={y}
            className="free-wall-type-symbol partition"
          />
        );
      }
    }
  }

  if (wallType === "curtain") {
    const step = 140;
    if (geometry.orientation === "horizontal") {
      for (let x = geometry.rect.x + 24; x < geometry.rect.x + geometry.rect.width - 24; x += step) {
        marks.push(
          <line
            key={`curtain-${entity.id}-${x}`}
            x1={x}
            y1={geometry.rect.y + 6}
            x2={x}
            y2={geometry.rect.y + geometry.rect.height - 6}
            className="free-wall-type-symbol curtain"
          />
        );
      }
    } else {
      for (let y = geometry.rect.y + 24; y < geometry.rect.y + geometry.rect.height - 24; y += step) {
        marks.push(
          <line
            key={`curtain-${entity.id}-${y}`}
            x1={geometry.rect.x + 6}
            y1={y}
            x2={geometry.rect.x + geometry.rect.width - 6}
            y2={y}
            className="free-wall-type-symbol curtain"
          />
        );
      }
    }
  }

  return <g className={`free-wall-symbols ${wallType}`}>{marks}</g>;
}

function renderWallSectionLayers(entity: FreeDrawWallEntity) {
  const geometry = getWallGeometry(entity);
  const wallType = entity.wallType ?? "interior";

  if (wallType === "interior") {
    return null;
  }

  const layers: JSX.Element[] = [];

  if (wallType === "exterior") {
    if (geometry.orientation === "horizontal") {
      const upperY = geometry.rect.y + geometry.rect.height * 0.22;
      const lowerY = geometry.rect.y + geometry.rect.height * 0.78;
      layers.push(
        <line key={`${entity.id}-ext-upper`} x1={geometry.rect.x + 10} y1={upperY} x2={geometry.rect.x + geometry.rect.width - 10} y2={upperY} className="free-wall-section-layer exterior" />,
        <line key={`${entity.id}-ext-lower`} x1={geometry.rect.x + 10} y1={lowerY} x2={geometry.rect.x + geometry.rect.width - 10} y2={lowerY} className="free-wall-section-layer exterior" />,
        <line key={`${entity.id}-ext-core`} x1={geometry.rect.x + 10} y1={geometry.centerline.start.y} x2={geometry.rect.x + geometry.rect.width - 10} y2={geometry.centerline.start.y} className="free-wall-section-layer insulation" />
      );
    } else {
      const leftX = geometry.rect.x + geometry.rect.width * 0.22;
      const rightX = geometry.rect.x + geometry.rect.width * 0.78;
      layers.push(
        <line key={`${entity.id}-ext-left`} x1={leftX} y1={geometry.rect.y + 10} x2={leftX} y2={geometry.rect.y + geometry.rect.height - 10} className="free-wall-section-layer exterior" />,
        <line key={`${entity.id}-ext-right`} x1={rightX} y1={geometry.rect.y + 10} x2={rightX} y2={geometry.rect.y + geometry.rect.height - 10} className="free-wall-section-layer exterior" />,
        <line key={`${entity.id}-ext-core`} x1={geometry.centerline.start.x} y1={geometry.rect.y + 10} x2={geometry.centerline.start.x} y2={geometry.rect.y + geometry.rect.height - 10} className="free-wall-section-layer insulation" />
      );
    }
  }

  if (wallType === "partition") {
    const step = 150;
    if (geometry.orientation === "horizontal") {
      for (let x = geometry.rect.x + 26; x < geometry.rect.x + geometry.rect.width - 26; x += step) {
        layers.push(
          <line
            key={`${entity.id}-partition-layer-${x}`}
            x1={x}
            y1={geometry.rect.y + 10}
            x2={x}
            y2={geometry.rect.y + geometry.rect.height - 10}
            className="free-wall-section-layer partition"
          />
        );
      }
    } else {
      for (let y = geometry.rect.y + 26; y < geometry.rect.y + geometry.rect.height - 26; y += step) {
        layers.push(
          <line
            key={`${entity.id}-partition-layer-${y}`}
            x1={geometry.rect.x + 10}
            y1={y}
            x2={geometry.rect.x + geometry.rect.width - 10}
            y2={y}
            className="free-wall-section-layer partition"
          />
        );
      }
    }
  }

  if (wallType === "curtain") {
    if (geometry.orientation === "horizontal") {
      const upperY = geometry.rect.y + geometry.rect.height * 0.3;
      const lowerY = geometry.rect.y + geometry.rect.height * 0.7;
      layers.push(
        <line key={`${entity.id}-curtain-upper`} x1={geometry.rect.x + 8} y1={upperY} x2={geometry.rect.x + geometry.rect.width - 8} y2={upperY} className="free-wall-section-layer curtain" />,
        <line key={`${entity.id}-curtain-lower`} x1={geometry.rect.x + 8} y1={lowerY} x2={geometry.rect.x + geometry.rect.width - 8} y2={lowerY} className="free-wall-section-layer curtain" />
      );
    } else {
      const leftX = geometry.rect.x + geometry.rect.width * 0.3;
      const rightX = geometry.rect.x + geometry.rect.width * 0.7;
      layers.push(
        <line key={`${entity.id}-curtain-left`} x1={leftX} y1={geometry.rect.y + 8} x2={leftX} y2={geometry.rect.y + geometry.rect.height - 8} className="free-wall-section-layer curtain" />,
        <line key={`${entity.id}-curtain-right`} x1={rightX} y1={geometry.rect.y + 8} x2={rightX} y2={geometry.rect.y + geometry.rect.height - 8} className="free-wall-section-layer curtain" />
      );
    }
  }

  return <g className={`free-wall-section-layers ${wallType}`}>{layers}</g>;
}

function renderWallJoinGeometry(marker: FreeDrawJoinMarker, wallType: FreeDrawWallType) {
  const size = marker.size * 0.9;
  const half = size * 0.5;

  if (marker.type === "L") {
    return (
      <path
        d={`M ${marker.x - half} ${marker.y - half} L ${marker.x - half} ${marker.y + half} L ${marker.x + half} ${marker.y + half}`}
        className={`free-wall-join-geometry ${wallType}`}
      />
    );
  }

  if (marker.type === "T") {
    return (
      <g className={`free-wall-join-geometry-group ${wallType}`}>
        <line x1={marker.x - half} y1={marker.y} x2={marker.x + half} y2={marker.y} className={`free-wall-join-geometry ${wallType}`} />
        <line x1={marker.x} y1={marker.y - half} x2={marker.x} y2={marker.y + half} className={`free-wall-join-geometry ${wallType}`} />
      </g>
    );
  }

  return (
    <g className={`free-wall-join-geometry-group ${wallType}`}>
      <line x1={marker.x - half} y1={marker.y - half} x2={marker.x + half} y2={marker.y + half} className={`free-wall-join-geometry ${wallType}`} />
      <line x1={marker.x - half} y1={marker.y + half} x2={marker.x + half} y2={marker.y - half} className={`free-wall-join-geometry ${wallType}`} />
    </g>
  );
}

function renderWallJoinPatch(marker: FreeDrawJoinMarker, wallType: FreeDrawWallType, active = false) {
  const size = marker.size * 1.45;
  const half = size * 0.5;
  const className = `free-wall-join-patch ${wallType} ${active ? "active" : ""}`;

  if (marker.type === "L") {
    return (
      <path
        d={`M ${marker.x - half} ${marker.y - half} L ${marker.x - half} ${marker.y + half} L ${marker.x + half} ${marker.y + half} L ${marker.x + half} ${marker.y + half * 0.32} L ${marker.x - half * 0.32} ${marker.y + half * 0.32} L ${marker.x - half * 0.32} ${marker.y - half} Z`}
        className={className}
      />
    );
  }

  if (marker.type === "T") {
    return (
      <g className={className}>
        <rect x={marker.x - half} y={marker.y - half * 0.28} width={size} height={half * 0.56} rx={4} />
        <rect x={marker.x - half * 0.28} y={marker.y - half} width={half * 0.56} height={size} rx={4} />
      </g>
    );
  }

  return (
    <g className={className}>
      <rect x={marker.x - half * 0.22} y={marker.y - half} width={half * 0.44} height={size} rx={4} />
      <rect x={marker.x - half} y={marker.y - half * 0.22} width={size} height={half * 0.44} rx={4} />
      <rect x={marker.x - half * 0.86} y={marker.y - half * 0.86} width={size * 0.28} height={size * 0.28} rx={3} transform={`rotate(45 ${marker.x} ${marker.y})`} />
    </g>
  );
}

function renderWallEndpointMergePatch(merge: FreeDrawEndpointMerge, thickness: number) {
  const depth = Math.max(18, thickness * 0.34);
  const currentVector =
    merge.currentOrientation === "horizontal"
      ? { x: merge.currentInsetSign * depth, y: 0 }
      : { x: 0, y: merge.currentInsetSign * depth };
  const neighborVector =
    merge.currentOrientation === "horizontal"
      ? { x: 0, y: merge.neighborInsetSign * depth }
      : { x: merge.neighborInsetSign * depth, y: 0 };
  const p0 = merge.point;
  const p1 = { x: p0.x + currentVector.x, y: p0.y + currentVector.y };
  const p2 = { x: p1.x + neighborVector.x, y: p1.y + neighborVector.y };
  const p3 = { x: p0.x + neighborVector.x, y: p0.y + neighborVector.y };

  return (
    <polygon
      points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
      className={`free-wall-end-merge ${merge.wallType} ${merge.active ? "active" : ""}`}
    />
  );
}

function getWallJoinMarkers(entity: FreeDrawWallEntity, entities: FreeDrawEntity[]): FreeDrawJoinMarker[] {
  const geometry = getWallGeometry(entity);
  const markers: FreeDrawJoinMarker[] = [];

  for (const candidate of entities) {
    if (candidate.type !== "wall" || candidate.id === entity.id) {
      continue;
    }

    const other = getWallGeometry(candidate);
    if (other.orientation === geometry.orientation) {
      continue;
    }

    const x = geometry.orientation === "horizontal" ? other.centerline.start.x : geometry.centerline.start.x;
    const y = geometry.orientation === "horizontal" ? geometry.centerline.start.y : other.centerline.start.y;
    const inCurrent =
      x >= geometry.rect.x - 1 &&
      x <= geometry.rect.x + geometry.rect.width + 1 &&
      y >= geometry.rect.y - 1 &&
      y <= geometry.rect.y + geometry.rect.height + 1;
    const inOther =
      x >= other.rect.x - 1 &&
      x <= other.rect.x + other.rect.width + 1 &&
      y >= other.rect.y - 1 &&
      y <= other.rect.y + other.rect.height + 1;

    if (inCurrent && inOther) {
      const currentEndpoint =
        distanceBetween({ x, y }, geometry.centerline.start) < 0.5 ||
        distanceBetween({ x, y }, geometry.centerline.end) < 0.5;
      const otherEndpoint =
        distanceBetween({ x, y }, other.centerline.start) < 0.5 ||
        distanceBetween({ x, y }, other.centerline.end) < 0.5;
      const type: FreeDrawJoinMarker["type"] =
        currentEndpoint && otherEndpoint ? "L" : currentEndpoint || otherEndpoint ? "T" : "X";
      markers.push({
        x,
        y,
        size: Math.max(18, Math.min(entity.thickness, candidate.thickness) * 0.18),
        type
      });
    }
  }

  return markers;
}

function getWallEndpointMerges(
  entity: FreeDrawWallEntity,
  entities: FreeDrawEntity[],
  activeChainId: string | null
): FreeDrawEndpointMerge[] {
  const geometry = getWallGeometry(entity);
  const wallType = entity.wallType ?? "interior";
  const endpointConfigs = [
    {
      point: geometry.centerline.start,
      currentInsetSign: 1 as const
    },
    {
      point: geometry.centerline.end,
      currentInsetSign: -1 as const
    }
  ];
  const merges: FreeDrawEndpointMerge[] = [];

  for (const endpointConfig of endpointConfigs) {
    for (const candidate of entities) {
      if (candidate.type !== "wall" || candidate.id === entity.id) {
        continue;
      }

      const other = getWallGeometry(candidate);
      if (other.orientation === geometry.orientation) {
        continue;
      }

      const point = endpointConfig.point;
      const matchesStart = pointsAlmostEqual(point, other.centerline.start);
      const matchesEnd = pointsAlmostEqual(point, other.centerline.end);
      const intersectsBody =
        other.orientation === "horizontal"
          ? point.x >= other.left - 0.5 && point.x <= other.right + 0.5 && Math.abs(point.y - other.centerline.start.y) <= 0.5
          : point.y >= other.top - 0.5 && point.y <= other.bottom + 0.5 && Math.abs(point.x - other.centerline.start.x) <= 0.5;

      if (!matchesStart && !matchesEnd && !intersectsBody) {
        continue;
      }

      const neighborInsetSign =
        other.orientation === "horizontal"
          ? matchesStart
            ? 1
            : matchesEnd
              ? -1
              : point.x < other.centerline.start.x + other.length * 0.5
                ? 1
                : -1
          : matchesStart
            ? 1
            : matchesEnd
              ? -1
              : point.y < other.centerline.start.y + other.length * 0.5
                ? 1
                : -1;

      merges.push({
        point,
        currentOrientation: geometry.orientation as "horizontal" | "vertical",
        currentInsetSign: endpointConfig.currentInsetSign,
        neighborInsetSign,
        wallType,
        active: entity.chainId != null && entity.chainId === activeChainId
      });
      break;
    }
  }

  return merges;
}

function renderWallEntity(
  entity: FreeDrawWallEntity,
  selected: boolean,
  preview = false,
  hostedOpenings: FreeDrawOpeningEntity[] = [],
  joinMarkers: FreeDrawJoinMarker[] = [],
  activeChain = false,
  onHoverChange?: (hovering: boolean) => void,
  endpointMerges: FreeDrawEndpointMerge[] = []
) {
  const geometry = getWallGeometry(entity);
  const wallType = entity.wallType ?? "interior";
  const className = preview ? `free-draw-preview-wall ${wallType}` : `free-wall ${wallType} ${selected ? "selected" : ""} ${activeChain ? "active-chain" : ""}`;
  const fillSegments: Array<{ x: number; y: number; width: number; height: number }> = [];
  const centerSegments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  if (!preview && hostedOpenings.length) {
    if (geometry.orientation === "horizontal") {
      let cursor = geometry.rect.x;
      hostedOpenings.forEach((opening) => {
        if (opening.x > cursor) {
          fillSegments.push({
            x: cursor,
            y: geometry.rect.y,
            width: opening.x - cursor,
            height: geometry.rect.height
          });
          centerSegments.push({
            x1: cursor,
            y1: geometry.centerline.start.y,
            x2: opening.x,
            y2: geometry.centerline.start.y
          });
        }
        cursor = Math.max(cursor, opening.x + opening.width);
      });
      if (cursor < geometry.rect.x + geometry.rect.width) {
        fillSegments.push({
          x: cursor,
          y: geometry.rect.y,
          width: geometry.rect.x + geometry.rect.width - cursor,
          height: geometry.rect.height
        });
        centerSegments.push({
          x1: cursor,
          y1: geometry.centerline.start.y,
          x2: geometry.rect.x + geometry.rect.width,
          y2: geometry.centerline.start.y
        });
      }
    } else {
      let cursor = geometry.rect.y;
      hostedOpenings.forEach((opening) => {
        if (opening.y > cursor) {
          fillSegments.push({
            x: geometry.rect.x,
            y: cursor,
            width: geometry.rect.width,
            height: opening.y - cursor
          });
          centerSegments.push({
            x1: geometry.centerline.start.x,
            y1: cursor,
            x2: geometry.centerline.start.x,
            y2: opening.y
          });
        }
        cursor = Math.max(cursor, opening.y + opening.height);
      });
      if (cursor < geometry.rect.y + geometry.rect.height) {
        fillSegments.push({
          x: geometry.rect.x,
          y: cursor,
          width: geometry.rect.width,
          height: geometry.rect.y + geometry.rect.height - cursor
        });
        centerSegments.push({
          x1: geometry.centerline.start.x,
          y1: cursor,
          x2: geometry.centerline.start.x,
          y2: geometry.rect.y + geometry.rect.height
        });
      }
    }
  }

  return (
    <g
      className={className}
      onMouseEnter={() => !preview && onHoverChange?.(true)}
      onMouseLeave={() => !preview && onHoverChange?.(false)}
    >
      {preview || !fillSegments.length ? (
        <>
          <rect x={geometry.rect.x} y={geometry.rect.y} width={geometry.rect.width} height={geometry.rect.height} className="free-wall-fill" />
          <line x1={geometry.centerline.start.x} y1={geometry.centerline.start.y} x2={geometry.centerline.end.x} y2={geometry.centerline.end.y} className="free-wall-centerline" />
        </>
      ) : (
        <>
          {fillSegments.map((segment, index) => (
            <rect key={`${entity.id}-segment-${index}`} x={segment.x} y={segment.y} width={segment.width} height={segment.height} className="free-wall-fill" />
          ))}
          {centerSegments.map((segment, index) => (
            <line key={`${entity.id}-center-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="free-wall-centerline" />
          ))}
        </>
      )}
      {!preview && renderWallSectionLayers(entity)}
      {!preview && renderWallTypeSymbols(entity)}
      {!preview &&
        endpointMerges.map((merge, index) => (
          <g key={`${entity.id}-endpoint-merge-${index}`}>{renderWallEndpointMergePatch(merge, entity.thickness)}</g>
        ))}
      {!preview &&
        joinMarkers.map((marker, index) => (
          <g key={`${entity.id}-join-patch-${index}`}>{renderWallJoinPatch(marker, wallType, activeChain || selected)}</g>
        ))}
      {!preview &&
        joinMarkers.map((marker, index) => (
          <g key={`${entity.id}-join-geometry-${index}`}>{renderWallJoinGeometry(marker, wallType)}</g>
        ))}
      {!preview &&
        joinMarkers.map((marker, index) => (
          <g key={`${entity.id}-join-${index}`} className="free-wall-join-group">
            <rect
              x={marker.x - marker.size * 0.5}
              y={marker.y - marker.size * 0.5}
              width={marker.size}
              height={marker.size}
              className={`free-wall-join ${marker.type.toLowerCase()}`}
            />
            <text x={marker.x} y={marker.y + 4} className="free-wall-join-text">
              {marker.type}
            </text>
          </g>
        ))}
      {!preview && (
        <text
          x={geometry.orientation === "horizontal" ? geometry.rect.x + geometry.rect.width / 2 : geometry.rect.x + geometry.rect.width + 22}
          y={geometry.orientation === "horizontal" ? geometry.rect.y - 14 : geometry.rect.y + geometry.rect.height / 2}
          className={`free-wall-label ${geometry.orientation === "vertical" ? "vertical" : ""}`}
        >
          {getWallTypeShortLabel(wallType)} {Math.round(geometry.length)} / {Math.round(entity.thickness)} mm
        </text>
      )}
    </g>
  );
}

function renderHostedOpeningEntity(
  entity: FreeDrawOpeningEntity,
  selected: boolean,
  preview = false,
  activeChain = false,
  onHoverChange?: (hovering: boolean) => void
) {
  const orientation = entity.hostOrientation ?? (entity.width >= entity.height ? "horizontal" : "vertical");
  const inset = Math.min(Math.max(entity.frameThickness * 0.18, 12), orientation === "horizontal" ? entity.height * 0.25 : entity.width * 0.25);
  const inner = {
    x: entity.x + inset,
    y: entity.y + inset,
    width: Math.max(entity.width - inset * 2, 20),
    height: Math.max(entity.height - inset * 2, 20)
  };
  const leafTypes = getOpeningLeafTypes(entity);
  const className = preview ? "free-draw-preview-opening" : `free-opening hosted ${selected ? "selected" : ""} ${activeChain ? "active-chain" : ""}`;

  if (orientation === "horizontal") {
    const ratios = getOpeningGeometry(entity).ratios;
    const clearWidth = Math.max(inner.width - entity.mullionThickness * (entity.columns - 1), 20);
    let cursorX = inner.x;
    const ratioSum = ratios.reduce((sum, value) => sum + value, 0) || entity.columns;
    const cells = ratios.map((ratio, index) => {
      const width = clearWidth * (ratio / ratioSum);
      const cell = { x: cursorX, y: inner.y, width, height: inner.height };
      cursorX += width + (index < ratios.length - 1 ? entity.mullionThickness : 0);
      return cell;
    });

    return (
      <g
        className={className}
        onMouseEnter={() => !preview && onHoverChange?.(true)}
        onMouseLeave={() => !preview && onHoverChange?.(false)}
      >
        <rect x={entity.x} y={entity.y} width={entity.width} height={entity.height} className="free-opening-plan-cut" />
        <rect x={inner.x} y={inner.y} width={inner.width} height={inner.height} className="free-opening-plan-frame" />
        {cells.map((cell, index) => (
          <g key={`${entity.id}-plan-${index}`}>
            {index < cells.length - 1 && (
              <line
                x1={cell.x + cell.width + entity.mullionThickness * 0.5}
                y1={inner.y}
                x2={cell.x + cell.width + entity.mullionThickness * 0.5}
                y2={inner.y + inner.height}
                className="free-opening-divider"
              />
            )}
            {entity.category === "door" && (leafTypes[index] === "left" || leafTypes[index] === "right") && (
              <g className="free-opening-plan-swing">
                <line
                  x1={leafTypes[index] === "left" ? cell.x : cell.x + cell.width}
                  y1={cell.y}
                  x2={leafTypes[index] === "left" ? cell.x + cell.width : cell.x}
                  y2={cell.y + cell.height}
                />
                <path
                  d={
                    leafTypes[index] === "left"
                      ? `M ${cell.x} ${cell.y} A ${cell.width} ${cell.height} 0 0 1 ${cell.x + cell.width} ${cell.y + cell.height}`
                      : `M ${cell.x + cell.width} ${cell.y} A ${cell.width} ${cell.height} 0 0 0 ${cell.x} ${cell.y + cell.height}`
                  }
                />
              </g>
            )}
            {entity.category !== "door" && (
              <rect x={cell.x + 10} y={cell.y + 8} width={Math.max(cell.width - 20, 10)} height={Math.max(cell.height - 16, 10)} className="free-opening-plan-glass" />
            )}
            {entity.category === "sliding" && (
              <line
                x1={cell.x + 14}
                y1={cell.y + cell.height * 0.5}
                x2={cell.x + cell.width - 14}
                y2={cell.y + cell.height * 0.5}
                className="free-opening-divider"
              />
            )}
          </g>
        ))}
      </g>
    );
  }

  const ratios = getOpeningGeometry(entity).ratios;
  const clearHeight = Math.max(inner.height - entity.mullionThickness * (entity.columns - 1), 20);
  let cursorY = inner.y;
  const ratioSum = ratios.reduce((sum, value) => sum + value, 0) || entity.columns;
  const cells = ratios.map((ratio, index) => {
    const height = clearHeight * (ratio / ratioSum);
    const cell = { x: inner.x, y: cursorY, width: inner.width, height };
    cursorY += height + (index < ratios.length - 1 ? entity.mullionThickness : 0);
    return cell;
  });

  return (
    <g
      className={className}
      onMouseEnter={() => !preview && onHoverChange?.(true)}
      onMouseLeave={() => !preview && onHoverChange?.(false)}
    >
      <rect x={entity.x} y={entity.y} width={entity.width} height={entity.height} className="free-opening-plan-cut" />
      <rect x={inner.x} y={inner.y} width={inner.width} height={inner.height} className="free-opening-plan-frame" />
      {cells.map((cell, index) => (
        <g key={`${entity.id}-plan-v-${index}`}>
          {index < cells.length - 1 && (
            <line
              x1={inner.x}
              y1={cell.y + cell.height + entity.mullionThickness * 0.5}
              x2={inner.x + inner.width}
              y2={cell.y + cell.height + entity.mullionThickness * 0.5}
              className="free-opening-divider"
            />
          )}
          {entity.category === "door" && (leafTypes[index] === "left" || leafTypes[index] === "right") && (
            <g className="free-opening-plan-swing">
              <line
                x1={cell.x}
                y1={leafTypes[index] === "left" ? cell.y + cell.height : cell.y}
                x2={cell.x + cell.width}
                y2={leafTypes[index] === "left" ? cell.y : cell.y + cell.height}
              />
            </g>
          )}
          {entity.category !== "door" && (
            <rect x={cell.x + 8} y={cell.y + 10} width={Math.max(cell.width - 16, 10)} height={Math.max(cell.height - 20, 10)} className="free-opening-plan-glass" />
          )}
        </g>
      ))}
    </g>
  );
}

function renderOpeningEntity(
  entity: FreeDrawOpeningEntity,
  selected: boolean,
  preview = false,
  activeChain = false,
  onHoverChange?: (hovering: boolean) => void
) {
  if (entity.hostWallId) {
    return renderHostedOpeningEntity(entity, selected, preview, activeChain, onHoverChange);
  }

  const geometry = getOpeningGeometry(entity);
  const leafTypes = getOpeningLeafTypes(entity);
  const className = preview ? "free-draw-preview-opening" : `free-opening ${selected ? "selected" : ""} ${activeChain ? "active-chain" : ""}`;

  return (
    <g
      className={className}
      onMouseEnter={() => !preview && onHoverChange?.(true)}
      onMouseLeave={() => !preview && onHoverChange?.(false)}
    >
      <rect x={entity.x} y={entity.y} width={entity.width} height={entity.height} className="free-opening-frame outer" />
      <rect x={geometry.inner.x} y={geometry.inner.y} width={geometry.inner.width} height={geometry.inner.height} className="free-opening-frame inner" />
      {geometry.toplightRect && (
        <rect
          x={geometry.toplightRect.x}
          y={geometry.toplightRect.y}
          width={geometry.toplightRect.width}
          height={geometry.toplightRect.height}
          className="free-opening-glass toplight"
        />
      )}
      {entity.topLight && (
        <line
          x1={geometry.inner.x}
          y1={geometry.mainRect.y - entity.mullionThickness * 0.5}
          x2={geometry.inner.x + geometry.inner.width}
          y2={geometry.mainRect.y - entity.mullionThickness * 0.5}
          className="free-opening-divider"
        />
      )}
      {geometry.dividerXs.map((x) => (
        <line key={`${entity.id}-${x}`} x1={x} y1={geometry.mainRect.y} x2={x} y2={geometry.mainRect.y + geometry.mainRect.height} className="free-opening-divider" />
      ))}
      {geometry.glassCells.map((cell, index) => (
        <g key={`${entity.id}-glass-${index}`}>
          <rect x={cell.x} y={cell.y} width={cell.width} height={cell.height} className="free-opening-glass" />
          {geometry.cells[index] && renderSwingMarker(leafTypes[index] ?? "fixed", geometry.cells[index])}
        </g>
      ))}
      {entity.category === "door" && (
        <g className="free-opening-hardware">
          <rect
            x={(leafTypes[leafTypes.length - 1] ?? "right") === "left" ? entity.x + entity.frameThickness + 18 : entity.x + entity.width - entity.frameThickness - 24}
            y={entity.y + entity.height * 0.48}
            width="8"
            height="72"
            rx="4"
          />
        </g>
      )}
      {!preview &&
        geometry.cells.map((cell, index) => (
          <text key={`${entity.id}-cell-width-${index}`} x={cell.x + cell.width / 2} y={entity.y + entity.height + 46} className="free-opening-cell-label">
            {Math.round(cell.width)} mm
          </text>
        ))}
      <text x={entity.x + entity.width / 2} y={entity.y + entity.height + 26} className="free-opening-label">
        {entity.category === "window" ? "Pencere" : entity.category === "door" ? "Kapi" : "Surme"} {Math.round(entity.width)} x {Math.round(entity.height)}
      </text>
    </g>
  );
}

function renderWallDimensionOverlay(entity: FreeDrawWallEntity, openings: FreeDrawOpeningEntity[]) {
  const geometry = getWallGeometry(entity);
  const segments: Array<{ start: number; end: number; label: string }> = [];

  if (geometry.orientation === "horizontal") {
    let cursor = geometry.left;
    openings.forEach((opening, index) => {
      if (opening.x > cursor) {
        segments.push({ start: cursor, end: opening.x, label: `${Math.round(opening.x - cursor)}` });
      }
      segments.push({ start: opening.x, end: opening.x + opening.width, label: `${Math.round(opening.width)}` });
      cursor = opening.x + opening.width;
      if (index === openings.length - 1 && cursor < geometry.right) {
        segments.push({ start: cursor, end: geometry.right, label: `${Math.round(geometry.right - cursor)}` });
      }
    });
    if (!openings.length) {
      segments.push({ start: geometry.left, end: geometry.right, label: `${Math.round(geometry.length)}` });
    }

    const baseY = geometry.rect.y - 84;
    return (
      <g className="free-wall-dimensions">
        <line x1={geometry.left} y1={baseY} x2={geometry.right} y2={baseY} className="free-wall-dimension-line major" />
        <line x1={geometry.left} y1={baseY - 12} x2={geometry.left} y2={geometry.rect.y - 8} className="free-wall-dimension-line" />
        <line x1={geometry.right} y1={baseY - 12} x2={geometry.right} y2={geometry.rect.y - 8} className="free-wall-dimension-line" />
        <text x={(geometry.left + geometry.right) * 0.5} y={baseY - 16} className="free-wall-dimension-text major">
          {Math.round(geometry.length)} mm
        </text>
        {segments.map((segment, index) => {
          const y = geometry.rect.y - 44;
          return (
            <g key={`${entity.id}-dim-${index}`}>
              <line x1={segment.start} y1={y} x2={segment.end} y2={y} className="free-wall-dimension-line" />
              <line x1={segment.start} y1={y - 10} x2={segment.start} y2={geometry.rect.y - 4} className="free-wall-dimension-line" />
              <line x1={segment.end} y1={y - 10} x2={segment.end} y2={geometry.rect.y - 4} className="free-wall-dimension-line" />
              <text x={(segment.start + segment.end) * 0.5} y={y - 12} className="free-wall-dimension-text">
                {segment.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  let cursor = geometry.top;
  openings.forEach((opening, index) => {
    if (opening.y > cursor) {
      segments.push({ start: cursor, end: opening.y, label: `${Math.round(opening.y - cursor)}` });
    }
    segments.push({ start: opening.y, end: opening.y + opening.height, label: `${Math.round(opening.height)}` });
    cursor = opening.y + opening.height;
    if (index === openings.length - 1 && cursor < geometry.bottom) {
      segments.push({ start: cursor, end: geometry.bottom, label: `${Math.round(geometry.bottom - cursor)}` });
    }
  });
  if (!openings.length) {
    segments.push({ start: geometry.top, end: geometry.bottom, label: `${Math.round(geometry.length)}` });
  }

  const baseX = geometry.rect.x - 84;
  return (
    <g className="free-wall-dimensions">
      <line x1={baseX} y1={geometry.top} x2={baseX} y2={geometry.bottom} className="free-wall-dimension-line major" />
      <line x1={baseX - 12} y1={geometry.top} x2={geometry.rect.x - 8} y2={geometry.top} className="free-wall-dimension-line" />
      <line x1={baseX - 12} y1={geometry.bottom} x2={geometry.rect.x - 8} y2={geometry.bottom} className="free-wall-dimension-line" />
      <text x={baseX - 16} y={(geometry.top + geometry.bottom) * 0.5} className="free-wall-dimension-text major vertical">
        {Math.round(geometry.length)} mm
      </text>
      {segments.map((segment, index) => {
        const x = geometry.rect.x - 44;
        return (
          <g key={`${entity.id}-vdim-${index}`}>
            <line x1={x} y1={segment.start} x2={x} y2={segment.end} className="free-wall-dimension-line" />
            <line x1={x - 10} y1={segment.start} x2={geometry.rect.x - 4} y2={segment.start} className="free-wall-dimension-line" />
            <line x1={x - 10} y1={segment.end} x2={geometry.rect.x - 4} y2={segment.end} className="free-wall-dimension-line" />
            <text x={x - 12} y={(segment.start + segment.end) * 0.5} className="free-wall-dimension-text vertical">
              {segment.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderRoomDimensionOverlay(room: FreeDrawRoomRegion) {
  const width = room.bounds.right - room.bounds.left;
  const height = room.bounds.bottom - room.bounds.top;
  const topY = room.bounds.top - 132;
  const rightX = room.bounds.right + 132;

  return (
    <g className="free-room-dimensions">
      <line x1={room.bounds.left} y1={topY} x2={room.bounds.right} y2={topY} className="free-wall-dimension-line major" />
      <line x1={room.bounds.left} y1={topY - 12} x2={room.bounds.left} y2={room.bounds.top - 8} className="free-wall-dimension-line" />
      <line x1={room.bounds.right} y1={topY - 12} x2={room.bounds.right} y2={room.bounds.top - 8} className="free-wall-dimension-line" />
      <text x={(room.bounds.left + room.bounds.right) * 0.5} y={topY - 16} className="free-wall-dimension-text major">
        {Math.round(width)} mm
      </text>
      <line x1={rightX} y1={room.bounds.top} x2={rightX} y2={room.bounds.bottom} className="free-wall-dimension-line major" />
      <line x1={rightX - 12} y1={room.bounds.top} x2={room.bounds.right - 8} y2={room.bounds.top} className="free-wall-dimension-line" />
      <line x1={rightX - 12} y1={room.bounds.bottom} x2={room.bounds.right - 8} y2={room.bounds.bottom} className="free-wall-dimension-line" />
      <text x={rightX - 18} y={(room.bounds.top + room.bounds.bottom) * 0.5} className="free-wall-dimension-text major vertical">
        {Math.round(height)} mm
      </text>
      <text x={room.labelPoint.x} y={room.labelPoint.y + 40} className="free-room-area emphasis">
        {room.name} / Cevre {Math.round(room.perimeterMm)} mm
      </text>
    </g>
  );
}

function getRoomCeilingLabel(wallType: FreeDrawWallType) {
  if (wallType === "exterior") {
    return "+3.00";
  }
  if (wallType === "curtain") {
    return "+3.20";
  }
  return "+2.80";
}

function renderRoomLevelOverlay(room: FreeDrawRoomRegion) {
  const x = room.bounds.left - 96;
  const y = room.bounds.bottom + 42;

  return (
    <g className="free-room-level-overlay">
      <line x1={x} y1={y - 46} x2={x} y2={y + 16} className="free-room-level-line" />
      <line x1={x - 14} y1={y} x2={x + 28} y2={y} className="free-room-level-line strong" />
      <text x={x + 34} y={y + 4} className="free-room-level-text">
        +0.00
      </text>
      <text x={x + 34} y={y - 28} className="free-room-level-text subtle">
        {getRoomCeilingLabel(room.wallType)}
      </text>
    </g>
  );
}

function renderRoomChainSegmentOverlay(room: FreeDrawRoomRegion, walls: FreeDrawWallEntity[]) {
  if (!walls.length) {
    return null;
  }

  return (
    <g className="free-room-chain-overlay">
      {walls.map((wall, index) => {
        const geometry = getWallGeometry(wall);
        if (geometry.orientation === "horizontal") {
          const isTop = geometry.centerline.start.y <= room.labelPoint.y;
          const y = isTop ? geometry.rect.y - 104 : geometry.rect.y + geometry.rect.height + 72;
          return (
            <g key={`${wall.id}-chain-dim`}>
              <line x1={geometry.left} y1={y} x2={geometry.right} y2={y} className="free-chain-dim-line" />
              <line x1={geometry.left} y1={y - 10} x2={geometry.left} y2={isTop ? geometry.rect.y - 6 : geometry.rect.y + geometry.rect.height + 6} className="free-chain-dim-line" />
              <line x1={geometry.right} y1={y - 10} x2={geometry.right} y2={isTop ? geometry.rect.y - 6 : geometry.rect.y + geometry.rect.height + 6} className="free-chain-dim-line" />
              <text x={(geometry.left + geometry.right) * 0.5} y={y - 10} className="free-chain-dim-text">
                S{index + 1} / {Math.round(geometry.length)} mm
              </text>
            </g>
          );
        }

        const isLeft = geometry.centerline.start.x <= room.labelPoint.x;
        const x = isLeft ? geometry.rect.x - 104 : geometry.rect.x + geometry.rect.width + 72;
        return (
          <g key={`${wall.id}-chain-vdim`}>
            <line x1={x} y1={geometry.top} x2={x} y2={geometry.bottom} className="free-chain-dim-line" />
            <line x1={x - 10} y1={geometry.top} x2={isLeft ? geometry.rect.x - 6 : geometry.rect.x + geometry.rect.width + 6} y2={geometry.top} className="free-chain-dim-line" />
            <line x1={x - 10} y1={geometry.bottom} x2={isLeft ? geometry.rect.x - 6 : geometry.rect.x + geometry.rect.width + 6} y2={geometry.bottom} className="free-chain-dim-line" />
            <text x={x - 14} y={(geometry.top + geometry.bottom) * 0.5} className="free-chain-dim-text vertical">
              S{index + 1} / {Math.round(geometry.length)} mm
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default function FreeDrawCanvas({
  onImportOpening,
  onImportWallFacade,
  onImportFacadeBundle,
  focusChainId,
  linkedFacadeDesigns = [],
  onLoadLinkedFacade,
  designerGuides = []
}: FreeDrawCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [cursor, setCursor] = useState<FreeDrawPoint | null>(null);
  const [cursorWorld, setCursorWorld] = useState<FreeDrawPoint | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [pendingTextPoint, setPendingTextPoint] = useState<FreeDrawPoint | null>(null);
  const [pendingTextValue, setPendingTextValue] = useState("Not");
  const [hoveredChainId, setHoveredChainId] = useState<string | null>(null);
  const [hoveredSegmentKey, setHoveredSegmentKey] = useState<string | null>(null);
  const [draftRoomNameInput, setDraftRoomNameInput] = useState("");
  const [selectedChainRoomNameInput, setSelectedChainRoomNameInput] = useState("");
  const [roomScheduleDrafts, setRoomScheduleDrafts] = useState<Record<string, string>>({});
  const [wallManipulation, setWallManipulation] = useState<
    | {
        mode: "thickness";
        entity: FreeDrawWallEntity;
        startPoint: FreeDrawPoint;
      }
    | null
  >(null);
  const [openingManipulation, setOpeningManipulation] = useState<
    | {
        mode: "move" | "width" | "height" | "corner" | "divider";
        entity: FreeDrawOpeningEntity;
        startPoint: FreeDrawPoint;
        dividerIndex?: number;
      }
    | null
  >(null);
  const {
    entities,
    selectedId,
    activeTool,
    draft,
    zoom,
    pan,
    orthoEnabled,
    snapSettings,
    gridSize,
    history,
    future,
    setTool,
    handleToolPoint,
    finalizeDraft,
    closeWallDraft,
    cancelDraft,
    updateWallDraftMeta,
    addTextAtPoint,
    setSelectedId,
    deleteSelected,
    deleteEntity,
    updateWallEntity,
    updateWallChain,
    updateOpeningEntity,
    setZoom,
    setPan,
    resetView,
    toggleOrtho,
    toggleSnap,
    setGridSize,
    undo,
    redo
  } = useFreeDrawStore();

  const selectedOpening = useMemo(
    () => entities.find((entity) => entity.id === selectedId && entity.type === "opening") as FreeDrawOpeningEntity | undefined,
    [entities, selectedId]
  );
  const selectedWall = useMemo(
    () => entities.find((entity) => entity.id === selectedId && entity.type === "wall") as FreeDrawWallEntity | undefined,
    [entities, selectedId]
  );
  const selectedOpeningGeometry = useMemo(
    () => (selectedOpening ? getOpeningGeometry(selectedOpening) : null),
    [selectedOpening]
  );
  const roomRegions = useMemo(() => buildRoomRegions(entities), [entities]);
  const selectedWallHostedOpenings = useMemo(
    () => (selectedWall ? getHostedOpeningsForWallId(entities, selectedWall.id) : []),
    [entities, selectedWall]
  );
  const hostedOpeningsByWall = useMemo(() => {
    const map = new Map<string, FreeDrawOpeningEntity[]>();
    entities.forEach((entity) => {
      if (entity.type === "opening" && entity.hostWallId) {
        const bucket = map.get(entity.hostWallId) ?? [];
        bucket.push(entity);
        map.set(entity.hostWallId, bucket);
      }
    });
    map.forEach((bucket) => {
      bucket.sort((left, right) => ((left.hostOrientation ?? "horizontal") === "horizontal" ? left.x - right.x : left.y - right.y));
    });
    return map;
  }, [entities]);
  const selectedChainId = selectedWall?.chainId ?? (selectedOpening?.hostWallId
    ? (entities.find((entity) => entity.type === "wall" && entity.id === selectedOpening.hostWallId) as FreeDrawWallEntity | undefined)?.chainId
    : undefined);
  const selectedChainWalls = useMemo(
    () =>
      selectedChainId
        ? entities
            .filter((entity): entity is FreeDrawWallEntity => entity.type === "wall" && entity.chainId === selectedChainId)
            .sort((left, right) => (left.segmentIndex ?? 0) - (right.segmentIndex ?? 0))
        : [],
    [entities, selectedChainId]
  );
  const selectedChainMeta = useMemo(() => getWallChainMetadata(selectedChainWalls), [selectedChainWalls]);
  const selectedChainLength = useMemo(
    () => selectedChainWalls.reduce((sum, wall) => sum + distanceBetween(wall.start, wall.end), 0),
    [selectedChainWalls]
  );
  const selectedRoom = useMemo(
    () => roomRegions.find((room) => room.chainId === selectedChainId) ?? null,
    [roomRegions, selectedChainId]
  );
  const roomChainAnchors = useMemo(() => {
    const map = new Map<string, string>();
    entities.forEach((entity) => {
      if (entity.type === "wall" && entity.chainId && !map.has(entity.chainId)) {
        map.set(entity.chainId, entity.id);
      }
    });
    return map;
  }, [entities]);
  const sortedRooms = useMemo(
    () =>
      [...roomRegions].sort((left, right) => {
        if (left.bounds.top !== right.bounds.top) {
          return left.bounds.top - right.bounds.top;
        }
        return left.bounds.left - right.bounds.left;
      }),
    [roomRegions]
  );
  const facadeProgramItems = useMemo<FreeDrawFacadeProgramItem[]>(() => {
    const roomByChain = new Map(roomRegions.map((room) => [room.chainId, room]));
    const chainWalls = new Map<string, FreeDrawWallEntity[]>();

    entities.forEach((entity) => {
      if (entity.type === "wall" && entity.chainId) {
        const bucket = chainWalls.get(entity.chainId) ?? [];
        bucket.push(entity);
        chainWalls.set(entity.chainId, bucket);
      }
    });

    chainWalls.forEach((walls) => {
      walls.sort((left, right) => (left.segmentIndex ?? 0) - (right.segmentIndex ?? 0));
    });

    return entities
      .filter((entity): entity is FreeDrawWallEntity => entity.type === "wall")
      .sort((left, right) => {
        const leftGeom = getWallGeometry(left);
        const rightGeom = getWallGeometry(right);
        if (leftGeom.top !== rightGeom.top) {
          return leftGeom.top - rightGeom.top;
        }
        if (leftGeom.left !== rightGeom.left) {
          return leftGeom.left - rightGeom.left;
        }
        return (left.segmentIndex ?? 0) - (right.segmentIndex ?? 0);
      })
      .flatMap((wall, index) => {
        const openings = [...(hostedOpeningsByWall.get(wall.id) ?? [])];
        if (!openings.length) {
          return [];
        }

        const chainId = wall.chainId ?? wall.id;
        const walls = chainWalls.get(chainId) ?? [wall];
        const chainMeta = getWallChainMetadata(walls);
        const room = roomByChain.get(chainId);
        const wallLength = distanceBetween(wall.start, wall.end);
        const totalLength = walls.reduce((sum, item) => sum + distanceBetween(item.start, item.end), 0);
        const totalOpeningWidth = openings.reduce(
          (sum, opening) => sum + ((opening.hostOrientation ?? "horizontal") === "vertical" ? opening.height : opening.width),
          0
        );
        const titleBase = room?.name || chainMeta.roomName || `Cephe ${index + 1}`;
        const segmentLabel = walls.length > 1 ? `S${(wall.segmentIndex ?? index) + 1}` : "Ana";

        return [
          {
            title: `${titleBase} / ${segmentLabel}`,
            wall,
            openings,
            chainId,
            roomName: room?.name || chainMeta.roomName || "Adsiz Oda",
            wallType: chainMeta.wallType,
            totalLength,
            openingCount: openings.length,
            solidLength: Math.max(0, wallLength - totalOpeningWidth),
            wallLength,
            wallThickness: wall.thickness,
            segmentLabel
          }
        ];
      });
  }, [entities, hostedOpeningsByWall, roomRegions]);
  const selectedRoomName = selectedRoom?.name ?? selectedChainMeta.roomName;
  const selectedWallType = selectedChainMeta.wallType;
  const selectedWallThicknessPresets = useMemo(() => getWallThicknessPresets(selectedWallType), [selectedWallType]);
  const activeChainId = hoveredChainId ?? selectedChainId ?? null;
  const activeRoom = useMemo(() => roomRegions.find((room) => room.chainId === activeChainId) ?? null, [roomRegions, activeChainId]);
  const activeChainWalls = useMemo(
    () =>
      activeChainId
        ? entities
            .filter((entity): entity is FreeDrawWallEntity => entity.type === "wall" && entity.chainId === activeChainId)
            .sort((left, right) => (left.segmentIndex ?? 0) - (right.segmentIndex ?? 0))
        : [],
    [entities, activeChainId]
  );
  const selectedFacadeProgramItem = useMemo(
    () => (selectedWall ? facadeProgramItems.find((item) => item.wall.id === selectedWall.id) ?? null : null),
    [facadeProgramItems, selectedWall]
  );
  const linkedFacadeCountByChain = useMemo(() => {
    const map = new Map<string, number>();
    linkedFacadeDesigns.forEach((item) => {
      if (!item.chainId) {
        return;
      }
      map.set(item.chainId, (map.get(item.chainId) ?? 0) + 1);
    });
    return map;
  }, [linkedFacadeDesigns]);
  const linkedFacadeStatusByChain = useMemo(() => {
    const map = new Map<string, { stale: number; missing: number; diffCount: number }>();
    linkedFacadeDesigns.forEach((item) => {
      if (!item.chainId) {
        return;
      }
      const current = map.get(item.chainId) ?? { stale: 0, missing: 0, diffCount: 0 };
      if (item.syncStatus === "stale") {
        current.stale += 1;
      } else if (item.syncStatus === "missing") {
        current.missing += 1;
      }
      current.diffCount += item.syncDiffCount ?? 0;
      map.set(item.chainId, current);
    });
    return map;
  }, [linkedFacadeDesigns]);
  const linkedFacadeStatusBySegment = useMemo(() => {
    const map = new Map<string, FreeDrawLinkedSegmentState>();
    linkedFacadeDesigns.forEach((item) => {
      if (!item.chainId) {
        return;
      }
      const key = buildSegmentKey(item.chainId, item.segmentLabel);
      const current = map.get(key) ?? { linked: 0, stale: 0, missing: 0, diffCount: 0 };
      current.linked += 1;
      if (item.syncStatus === "stale") {
        current.stale += 1;
      } else if (item.syncStatus === "missing") {
        current.missing += 1;
      }
      current.diffCount += item.syncDiffCount ?? 0;
      map.set(key, current);
    });
    return map;
  }, [linkedFacadeDesigns]);
  const linkedFacadeBySegment = useMemo(() => {
    const map = new Map<string, typeof linkedFacadeDesigns>();
    linkedFacadeDesigns.forEach((item) => {
      if (!item.chainId) {
        return;
      }
      const key = buildSegmentKey(item.chainId, item.segmentLabel);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    });
    return map;
  }, [linkedFacadeDesigns]);
  const selectedChainLinkedFacades = useMemo(
    () =>
      selectedChainId ? linkedFacadeDesigns.filter((item) => item.chainId === selectedChainId) : [],
    [linkedFacadeDesigns, selectedChainId]
  );
  const selectedChainSyncSummary = useMemo(
    () =>
      selectedChainLinkedFacades.reduce(
        (summary, item) => {
          if (item.syncStatus === "stale") {
            summary.stale += 1;
          } else if (item.syncStatus === "missing") {
            summary.missing += 1;
          } else {
            summary.synced += 1;
          }
          summary.diffCount += item.syncDiffCount ?? 0;
          return summary;
        },
        { synced: 0, stale: 0, missing: 0, diffCount: 0 }
      ),
    [selectedChainLinkedFacades]
  );

  const draftBasePoint = useMemo(() => getDraftBasePoint(draft), [draft]);
  const designerGuideSnapLines = useMemo<FreeDrawExternalGuide[]>(
    () =>
      designerGuides
        .map((guide) => ({
          orientation: guide.orientation,
          position: guide.positionMm,
          label: guide.label
        }))
        .slice(0, 24),
    [designerGuides]
  );
  const constrainedCursorWorld = useMemo(() => {
    if (!cursorWorld) {
      return null;
    }
    if (orthoEnabled && draftBasePoint) {
      return applyOrthoConstraint(draftBasePoint, cursorWorld);
    }
    return cursorWorld;
  }, [cursorWorld, draftBasePoint, orthoEnabled]);

  const snapCandidate = useMemo(
    () =>
      resolveFreeDrawSnap(
        constrainedCursorWorld,
        entities,
        { ...snapSettings, gridSize },
        zoom,
        draftBasePoint,
        designerGuideSnapLines
      ),
    [constrainedCursorWorld, designerGuideSnapLines, draftBasePoint, entities, gridSize, snapSettings, zoom]
  );
  const activeWorldPoint = snapCandidate?.point ?? constrainedCursorWorld;
  const draftPreview = useMemo(() => buildDraftPreviewEntity(draft, activeWorldPoint, entities), [activeWorldPoint, draft, entities]);

  const liveMeasurement = useMemo(() => {
    if (!draftBasePoint || !activeWorldPoint) {
      return null;
    }
    const dx = activeWorldPoint.x - draftBasePoint.x;
    const dy = activeWorldPoint.y - draftBasePoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) {
      return null;
    }
    const angleDeg = Math.round(Math.atan2(-dy, dx) * (180 / Math.PI));
    const labelX = (draftBasePoint.x + activeWorldPoint.x) / 2;
    const labelY = (draftBasePoint.y + activeWorldPoint.y) / 2 - 18 / Math.max(zoom, 0.25);
    return { dist: Math.round(dist), angleDeg, labelX, labelY };
  }, [draftBasePoint, activeWorldPoint, zoom]);
  const wallPreview = useMemo(() => {
    if (!wallManipulation || !activeWorldPoint) {
      return null;
    }

    const geometry = getWallGeometry(wallManipulation.entity);
    const nextThickness =
      geometry.orientation === "horizontal"
        ? Math.max(100, Math.round(Math.abs(activeWorldPoint.y - geometry.centerline.start.y) * 2))
        : Math.max(100, Math.round(Math.abs(activeWorldPoint.x - geometry.centerline.start.x) * 2));

    return {
      ...wallManipulation.entity,
      thickness: nextThickness
    };
  }, [activeWorldPoint, wallManipulation]);
  const openingPreview = useMemo(() => {
    if (!openingManipulation || !activeWorldPoint) {
      return null;
    }

    const dx = Math.round((activeWorldPoint.x - openingManipulation.startPoint.x) / gridSize) * gridSize;
    const dy = Math.round((activeWorldPoint.y - openingManipulation.startPoint.y) / gridSize) * gridSize;
    const minHeight = openingManipulation.entity.category === "door" ? 900 : 600;
    const hostWall =
      openingManipulation.entity.hostWallId && openingManipulation.entity.hostOrientation
        ? (entities.find(
            (entity) => entity.id === openingManipulation.entity.hostWallId && entity.type === "wall"
          ) as FreeDrawWallEntity | undefined)
        : undefined;
    const hostGeometry = hostWall ? getWallGeometry(hostWall) : null;
    const minSpan = openingManipulation.entity.category === "door" ? 800 : openingManipulation.entity.category === "sliding" ? 1200 : 700;

    if (openingManipulation.mode === "move") {
      if (hostWall && hostGeometry && openingManipulation.entity.hostOrientation === "horizontal") {
        return fitHostedOpeningToWall({
          ...openingManipulation.entity,
          x: clamp(openingManipulation.entity.x + dx, hostGeometry.left + 40, hostGeometry.right - openingManipulation.entity.width - 40),
          y: hostGeometry.rect.y,
          height: hostGeometry.rect.height
        }, hostWall, entities, openingManipulation.entity.id);
      }
      if (hostWall && hostGeometry && openingManipulation.entity.hostOrientation === "vertical") {
        return fitHostedOpeningToWall({
          ...openingManipulation.entity,
          x: hostGeometry.rect.x,
          y: clamp(openingManipulation.entity.y + dy, hostGeometry.top + 40, hostGeometry.bottom - openingManipulation.entity.height - 40),
          width: hostGeometry.rect.width
        }, hostWall, entities, openingManipulation.entity.id);
      }

      return {
        ...openingManipulation.entity,
        x: openingManipulation.entity.x + dx,
        y: openingManipulation.entity.y + dy
      };
    }

    if (openingManipulation.mode === "width") {
      if (hostWall && hostGeometry && openingManipulation.entity.hostOrientation === "horizontal") {
        return fitHostedOpeningToWall({
          ...openingManipulation.entity,
          width: clamp(openingManipulation.entity.width + dx, minSpan, hostGeometry.length - 80),
          y: hostGeometry.rect.y,
          height: hostGeometry.rect.height
        }, hostWall, entities, openingManipulation.entity.id);
      }
      return {
        ...openingManipulation.entity,
        width: Math.max(400, openingManipulation.entity.width + dx)
      };
    }

    if (openingManipulation.mode === "height") {
      if (hostWall && hostGeometry && openingManipulation.entity.hostOrientation === "vertical") {
        return fitHostedOpeningToWall({
          ...openingManipulation.entity,
          height: clamp(openingManipulation.entity.height + dy, minSpan, hostGeometry.length - 80),
          x: hostGeometry.rect.x,
          width: hostGeometry.rect.width
        }, hostWall, entities, openingManipulation.entity.id);
      }
      return {
        ...openingManipulation.entity,
        height: Math.max(minHeight, openingManipulation.entity.height + dy)
      };
    }

    if (openingManipulation.mode === "divider" && typeof openingManipulation.dividerIndex === "number") {
      const geometry = getOpeningGeometry(openingManipulation.entity);
      const dividerIndex = openingManipulation.dividerIndex;
      const leftCell = geometry.cells[dividerIndex];
      const rightCell = geometry.cells[dividerIndex + 1];
      if (!leftCell || !rightCell) {
        return openingManipulation.entity;
      }

      const localX = activeWorldPoint.x;
      const leftEdge = leftCell.x;
      const rightEdge = rightCell.x + rightCell.width;
      const minCellWidth = 220;
      const nextLeftWidth = clamp(
        localX - leftEdge - openingManipulation.entity.mullionThickness * 0.5,
        minCellWidth,
        rightEdge - leftEdge - minCellWidth - openingManipulation.entity.mullionThickness
      );
      const adjacentTotal = leftCell.width + rightCell.width;
      const nextRightWidth = Math.max(minCellWidth, adjacentTotal - nextLeftWidth);
      const nextRatios = [...geometry.ratios];
      nextRatios[dividerIndex] = nextLeftWidth;
      nextRatios[dividerIndex + 1] = nextRightWidth;

      return {
        ...openingManipulation.entity,
        columnRatios: nextRatios
      };
    }

    return {
      ...openingManipulation.entity,
      width: Math.max(400, openingManipulation.entity.width + dx),
      height: Math.max(minHeight, openingManipulation.entity.height + dy)
    };
  }, [activeWorldPoint, entities, gridSize, openingManipulation]);
  const openingStatusTarget = openingPreview ?? selectedOpening ?? null;

  const visibleWorldBounds = useMemo(
    () => ({
      left: -pan.x / zoom,
      top: -pan.y / zoom,
      right: (VIEWBOX_WIDTH - pan.x) / zoom,
      bottom: (VIEWBOX_HEIGHT - pan.y) / zoom
    }),
    [pan.x, pan.y, zoom]
  );

  const minorGrid = Math.max(5, gridSize);
  const majorGrid = minorGrid * 5;
  const minorVerticalTicks = useMemo(
    () => buildGridTicks(visibleWorldBounds.left, visibleWorldBounds.right, minorGrid),
    [minorGrid, visibleWorldBounds.left, visibleWorldBounds.right]
  );
  const minorHorizontalTicks = useMemo(
    () => buildGridTicks(visibleWorldBounds.top, visibleWorldBounds.bottom, minorGrid),
    [minorGrid, visibleWorldBounds.bottom, visibleWorldBounds.top]
  );
  const majorVerticalTicks = useMemo(
    () => buildGridTicks(visibleWorldBounds.left, visibleWorldBounds.right, majorGrid),
    [majorGrid, visibleWorldBounds.left, visibleWorldBounds.right]
  );
  const majorHorizontalTicks = useMemo(
    () => buildGridTicks(visibleWorldBounds.top, visibleWorldBounds.bottom, majorGrid),
    [majorGrid, visibleWorldBounds.bottom, visibleWorldBounds.top]
  );

  useEffect(() => {
    setDraftRoomNameInput(draft?.tool === "wall" ? draft.roomName ?? "" : "");
  }, [draft?.roomName, draft?.tool]);

  useEffect(() => {
    setSelectedChainRoomNameInput(selectedRoomName ?? "");
  }, [selectedChainId, selectedRoomName]);

  useEffect(() => {
    setRoomScheduleDrafts((current) => {
      const next: Record<string, string> = {};
      sortedRooms.forEach((room) => {
        next[room.chainId] = current[room.chainId] ?? room.name;
      });
      return next;
    });
  }, [sortedRooms]);

  function commitDraftRoomName() {
    if (draft?.tool !== "wall") {
      return;
    }
    updateWallDraftMeta({ roomName: draftRoomNameInput.trim() });
  }

  function commitSelectedChainRoomName() {
    if (!selectedChainId) {
      return;
    }
    updateWallChain(selectedChainId, { roomName: selectedChainRoomNameInput.trim() });
  }

  function commitRoomScheduleName(chainId: string) {
    updateWallChain(chainId, { roomName: (roomScheduleDrafts[chainId] ?? "").trim() });
  }

  function selectRoomChain(chainId: string) {
    setSelectedId(roomChainAnchors.get(chainId) ?? null);
  }

  function openLinkedFacadeForSegment(chainId: string | undefined, segmentLabel: string) {
    if (!chainId) {
      return;
    }
    const items = linkedFacadeBySegment.get(buildSegmentKey(chainId, segmentLabel));
    if (!items?.length) {
      return;
    }
    const preferred =
      items.find((item) => item.syncStatus === "stale") ??
      items.find((item) => item.active) ??
      items.find((item) => item.syncStatus === "missing") ??
      items[0];
    onLoadLinkedFacade?.(preferred.designId);
  }

  useEffect(() => {
    if (!focusChainId) {
      return;
    }
    const anchorId = roomChainAnchors.get(focusChainId);
    if (anchorId) {
      setSelectedId(anchorId);
    }
  }, [focusChainId, roomChainAnchors, setSelectedId]);

  useEffect(() => {
    if (!hoveredSegmentKey) {
      return;
    }
    if (!linkedFacadeBySegment.has(hoveredSegmentKey)) {
      setHoveredSegmentKey(null);
    }
  }, [hoveredSegmentKey, linkedFacadeBySegment]);

  async function printHtmlDocument(html: string, size = "width=1480,height=960") {
    if (window.desktopApi?.printTechnical) {
      await window.desktopApi.printTechnical(html);
      return;
    }

    const printWindow = window.open("", "_blank", size);
    if (!printWindow) {
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function handlePrintPlanSheet() {
    await printHtmlDocument(buildFreeDrawPlanPrintHtml(entities, sortedRooms));
  }

  async function handlePrintFacadeSheet() {
    if (!selectedWall || !selectedWallHostedOpenings.length) {
      return;
    }

    await printHtmlDocument(
      buildFreeDrawFacadePrintHtml(selectedWall, selectedWallHostedOpenings, selectedRoomName || "Cephe")
    );
  }

  async function handlePrintFacadeProgramItem(item: FreeDrawFacadeProgramItem) {
    await printHtmlDocument(buildFreeDrawFacadePrintHtml(item.wall, item.openings, item.title));
  }

  async function handlePrintTechnicalPacket() {
    if (!facadeProgramItems.length) {
      return;
    }

    await printHtmlDocument(
      buildFreeDrawTechnicalPacketHtml(
        entities,
        sortedRooms,
        facadeProgramItems.map(({ title, wall, openings }) => ({ title, wall, openings }))
      ),
      "width=1520,height=980"
    );
  }

  function handleImportFacadeBundleAction() {
    if (!onImportFacadeBundle || !facadeProgramItems.length) {
      return;
    }
    onImportFacadeBundle(facadeProgramItems.map(({ title, wall, openings }) => ({ title, wall, openings })));
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingSurface =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.code === "Space" && !isTypingSurface) {
        event.preventDefault();
        setSpacePressed(true);
      }

      if (event.key === "F8" && !isTypingSurface) {
        event.preventDefault();
        toggleOrtho();
        return;
      }

      if (isTypingSurface) {
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (event.ctrlKey && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        redo();
        return;
      }

      if (event.ctrlKey && (event.key === "0" || event.code === "Digit0")) {
        event.preventDefault();
        resetView();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelDraft();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        finalizeDraft(activeTool === "polyline");
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        deleteSelected();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeTool, cancelDraft, deleteSelected, finalizeDraft, redo, resetView, toggleOrtho, undo]);

  function updateCursor(clientX: number, clientY: number, host: HTMLDivElement) {
    const screenPoint = getCanvasClientPoint(clientX, clientY, host, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
    const worldPoint = getCanvasWorldPoint(clientX, clientY, host, VIEWBOX_WIDTH, VIEWBOX_HEIGHT, pan, zoom);
    setCursor(screenPoint);
    setCursorWorld(worldPoint);
    return { screenPoint, worldPoint };
  }

  function resolveInteractionPoint(worldPoint: FreeDrawPoint) {
    const constrainedPoint =
      orthoEnabled && draftBasePoint ? applyOrthoConstraint(draftBasePoint, worldPoint) : worldPoint;
    const directSnap = resolveFreeDrawSnap(
      constrainedPoint,
      entities,
      { ...snapSettings, gridSize },
      zoom,
      draftBasePoint,
      designerGuideSnapLines
    );
    return directSnap?.point ?? constrainedPoint;
  }

  function handlePanStart(clientX: number, clientY: number) {
    panStateRef.current = {
      startX: clientX,
      startY: clientY,
      originX: pan.x,
      originY: pan.y
    };
  }

  function handlePanMove(clientX: number, clientY: number) {
    if (!panStateRef.current) {
      return;
    }

    setPan({
      x: panStateRef.current.originX + clientX - panStateRef.current.startX,
      y: panStateRef.current.originY + clientY - panStateRef.current.startY
    });
  }

  function startWallManipulation(entity: FreeDrawWallEntity, point: FreeDrawPoint) {
    setWallManipulation({
      mode: "thickness",
      entity,
      startPoint: point
    });
  }

  function startOpeningManipulation(
    mode: "move" | "width" | "height" | "corner" | "divider",
    entity: FreeDrawOpeningEntity,
    point: FreeDrawPoint,
    dividerIndex?: number
  ) {
    setOpeningManipulation({
      mode,
      entity,
      startPoint: point,
      dividerIndex
    });
  }

  function commitWallManipulation() {
    if (!wallManipulation || !wallPreview) {
      setWallManipulation(null);
      return;
    }

    updateWallEntity(wallManipulation.entity.id, {
      thickness: wallPreview.thickness
    });
    setWallManipulation(null);
  }

  function commitOpeningManipulation() {
    if (!openingManipulation || !openingPreview) {
      setOpeningManipulation(null);
      return;
    }

    updateOpeningEntity(openingManipulation.entity.id, {
      x: openingPreview.x,
      y: openingPreview.y,
      width: openingPreview.width,
      height: openingPreview.height,
      columnRatios: openingPreview.columnRatios
    });
    setOpeningManipulation(null);
  }

  function finishPointerAction(point: FreeDrawPoint | null) {
    if (!point) {
      return;
    }

    if (
      activeTool === "wall" &&
      draft?.tool === "wall" &&
      draft.chainStart &&
      distanceBetween(point, draft.chainStart) <= 18 / Math.max(zoom, 0.25) &&
      distanceBetween(draft.points[0] ?? draft.chainStart, draft.chainStart) > 0.5
    ) {
      closeWallDraft();
      return;
    }

    if (activeTool === "select") {
      const hitId = findEntityAtPoint(point, entities, 10 / Math.max(zoom, 0.25));
      if (hitId) {
        setSelectedId(hitId);
        return;
      }

      const clickedRoom = roomRegions.find((room) => isPointInsidePolygon(point, room.points));
      if (clickedRoom) {
        selectRoomChain(clickedRoom.chainId);
        return;
      }
      setSelectedId(hitId);
      return;
    }

    if (activeTool === "erase") {
      const hitId = findEntityAtPoint(point, entities, 10 / Math.max(zoom, 0.25));
      if (hitId) {
        deleteEntity(hitId);
      }
      return;
    }

    if (activeTool === "text") {
      setPendingTextPoint(point);
      setPendingTextValue("Not");
      return;
    }

    handleToolPoint(point);
  }

  async function handleExportSvg() {
    if (!svgRef.current) {
      return;
    }

    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.querySelectorAll(".free-draw-cursor-layer, .free-draw-preview-layer, .free-draw-snap-layer").forEach((node) => node.remove());
    const svgText = new XMLSerializer().serializeToString(clone);
    downloadBlob(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }), "free-draw.svg");
  }

  async function handleExportPng() {
    if (!svgRef.current) {
      return;
    }

    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.querySelectorAll(".free-draw-cursor-layer, .free-draw-preview-layer, .free-draw-snap-layer").forEach((node) => node.remove());
    const svgText = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("PNG export failed"));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = VIEWBOX_WIDTH * 2;
    canvas.height = VIEWBOX_HEIGHT * 2;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(svgUrl);
      return;
    }
    context.scale(2, 2);
    context.drawImage(image, 0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
    URL.revokeObjectURL(svgUrl);

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      downloadBlob(blob, "free-draw.png");
    }, "image/png");
  }

  return (
    <div className="free-draw-shell" ref={hostRef}>
      <div className="free-draw-toolbar">
        {/* ─── Araç Grupları ─── */}
        <div className="free-draw-toolbar-main">
          {/* Grup 1: Seç & Sil */}
          <div className="fd-tool-group">
            <span className="fd-group-label">Genel</span>
            <div className="fd-group-buttons">
              {(["select", "erase"] as const).map((t) => {
                const found = TOOLBAR_TOOLS.find((x) => x.value === t);
                return found ? (
                  <button key={t} title={found.label}
                    className={`free-draw-tool-button ${activeTool === t ? "active" : ""}`}
                    onClick={() => setTool(t)}>{found.label}</button>
                ) : null;
              })}
            </div>
          </div>
          {/* Grup 2: Çizim Araçları */}
          <div className="fd-tool-group">
            <span className="fd-group-label">Çizim</span>
            <div className="fd-group-buttons">
              {(["line", "rectangle", "circle", "arc", "polyline", "dimension", "text"] as const).map((t) => {
                const found = TOOLBAR_TOOLS.find((x) => x.value === t);
                return found ? (
                  <button key={t} title={found.label}
                    className={`free-draw-tool-button ${activeTool === t ? "active" : ""}`}
                    onClick={() => setTool(t)}>{found.label}</button>
                ) : null;
              })}
            </div>
          </div>
          {/* Grup 3: Duvar & Açıklık */}
          <div className="fd-tool-group">
            <span className="fd-group-label">Mimari</span>
            <div className="fd-group-buttons">
              {(["wall", "window", "door", "sliding"] as const).map((t) => {
                const found = TOOLBAR_TOOLS.find((x) => x.value === t);
                return found ? (
                  <button key={t} title={found.label}
                    className={`free-draw-tool-button ${activeTool === t ? "active" : ""}`}
                    onClick={() => setTool(t)}>{found.label}</button>
                ) : null;
              })}
            </div>
          </div>
          {/* Grup 4: OSNAP */}
          <div className="fd-tool-group">
            <span className="fd-group-label">Snap</span>
            <div className="fd-group-buttons">
              <button title="Endpoint Snap" className={`free-draw-tool-button ${snapSettings.endpoint ? "active" : ""}`} onClick={() => toggleSnap("endpoint")}>END</button>
              <button title="Midpoint Snap" className={`free-draw-tool-button ${snapSettings.midpoint ? "active" : ""}`} onClick={() => toggleSnap("midpoint")}>MID</button>
              <button title="Perpendicular Snap" className={`free-draw-tool-button ${snapSettings.perpendicular ? "active" : ""}`} onClick={() => toggleSnap("perpendicular")}>PERP</button>
              <button title="Grid Snap" className={`free-draw-tool-button ${snapSettings.grid ? "active" : ""}`} onClick={() => toggleSnap("grid")}>GRID</button>
              <button title="Ortho Modu (F8)" className={`free-draw-tool-button ${orthoEnabled ? "active" : ""}`} onClick={toggleOrtho}>ORTHO</button>
              <label className="free-draw-grid-input" title="Grid aralığı (mm)">
                <span>Grid</span>
                <input type="number" min={1} value={gridSize} onChange={(e) => setGridSize(Number(e.target.value) || 10)} />
              </label>
            </div>
          </div>
          {/* Grup 5: Eylemler */}
          <div className="fd-tool-group">
            <span className="fd-group-label">Eylem</span>
            <div className="fd-group-buttons">
              <button title="Geri Al (Ctrl+Z)" className="free-draw-tool-button" onClick={undo}>↩ Geri</button>
              <button title="İleri Al (Ctrl+Y)" className="free-draw-tool-button" onClick={redo}>↪ İleri</button>
              <button title="SVG olarak dışa aktar" className="free-draw-tool-button" onClick={handleExportSvg}>SVG</button>
              <button title="PNG olarak dışa aktar" className="free-draw-tool-button" onClick={handleExportPng}>PNG</button>
              <button title="Plan paftası yazdır" className="free-draw-tool-button accent" onClick={handlePrintPlanSheet}>Pafta</button>
            </div>
          </div>
        </div>
        {draft?.tool === "wall" && (
          <>
            <div className="free-draw-tool-row compact free-opening-controls">
              <span className="free-opening-controls-title">Zincir Duvar</span>
              {draft.chainId && (
                <span className="free-opening-controls-title">Segment {(draft.segmentIndex ?? 0) + 1}</span>
              )}
              <span className="free-opening-controls-title">{getWallTypeLabel(draft.wallType ?? "interior")}</span>
              <button className="free-draw-tool-button active" onClick={closeWallDraft}>
                Duvari Kapat
              </button>
              <button className="free-draw-tool-button" onClick={() => finalizeDraft(false)}>
                Zinciri Bitir
              </button>
            </div>
            <div className="free-draw-tool-row compact free-opening-controls">
              <span className="free-opening-controls-title">Yeni Zincir Tipi</span>
              {FREE_DRAW_WALL_TYPE_OPTIONS.map((option) => (
                <button
                  key={`draft-${option.value}`}
                  className={`free-draw-tool-button ${(draft.wallType ?? "interior") === option.value ? "active" : ""}`}
                  onClick={() => updateWallDraftMeta({ wallType: option.value })}
                >
                  {option.label}
                </button>
              ))}
              <label className="free-draw-meta-input">
                Oda Adi
                <input
                  type="text"
                  value={draftRoomNameInput}
                  placeholder="Salon / Mutfak"
                  onChange={(event) => setDraftRoomNameInput(event.target.value)}
                  onBlur={commitDraftRoomName}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitDraftRoomName();
                      (event.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                />
              </label>
              {ROOM_NAME_PRESETS.map((name) => (
                <button
                  key={`draft-room-${name}`}
                  className={`free-draw-tool-button ${draftRoomNameInput === name ? "active" : ""}`}
                  onClick={() => {
                    setDraftRoomNameInput(name);
                    updateWallDraftMeta({ roomName: name });
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
        {selectedWall && (
          <>
            <div className="free-draw-tool-row compact free-opening-controls">
              <span className="free-opening-controls-title">Duvar Ayarlari</span>
              <span className="free-opening-controls-title">
                {getWallTypeLabel(selectedWallType)} / {selectedChainWalls.length} segment / {Math.round(selectedChainLength)} mm
              </span>
              {selectedRoom && (
                <span className="free-opening-controls-title">
                  {selectedRoom.name} {selectedRoom.areaM2.toFixed(2)} m2 / Cevre {Math.round(selectedRoom.perimeterMm)} mm
                </span>
              )}
              {selectedWallHostedOpenings.length > 0 && (
                <button className="free-draw-tool-button" onClick={handlePrintFacadeSheet}>
                  Cephe Pafta
                </button>
              )}
              {facadeProgramItems.length > 0 && (
                <button className="free-draw-tool-button" onClick={handlePrintTechnicalPacket}>
                  Teknik Paket
                </button>
              )}
              {onImportWallFacade && selectedWallHostedOpenings.length > 0 && (
                <button className="free-draw-tool-button active" onClick={() => onImportWallFacade(selectedWall, selectedWallHostedOpenings)}>
                  Cepheyi PVC'ye Aktar
                </button>
              )}
              {onImportFacadeBundle && facadeProgramItems.length > 0 && (
                <button className="free-draw-tool-button active" onClick={handleImportFacadeBundleAction}>
                  PVC Paket
                </button>
              )}
            </div>
            <div className="free-draw-tool-row compact free-opening-controls">
              <span className="free-opening-controls-title">Duvar Tipi</span>
              {FREE_DRAW_WALL_TYPE_OPTIONS.map((option) => (
                <button
                  key={`selected-${option.value}`}
                  className={`free-draw-tool-button ${selectedWallType === option.value ? "active" : ""}`}
                  onClick={() => selectedChainId && updateWallChain(selectedChainId, { wallType: option.value })}
                >
                  {option.label}
                </button>
              ))}
              {selectedWallThicknessPresets.map((thickness) => (
                <button
                  key={thickness}
                  className={`free-draw-tool-button ${Math.round(selectedWall.thickness) === thickness ? "active" : ""}`}
                  onClick={() =>
                    selectedChainId
                      ? updateWallChain(selectedChainId, { thickness })
                      : updateWallEntity(selectedWall.id, { thickness })
                  }
                >
                  {thickness} mm
                </button>
              ))}
              <label className="free-draw-meta-input">
                Oda Adi
                <input
                  type="text"
                  value={selectedChainRoomNameInput}
                  placeholder="Salon / Oda / Ofis"
                  onChange={(event) => setSelectedChainRoomNameInput(event.target.value)}
                  onBlur={commitSelectedChainRoomName}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitSelectedChainRoomName();
                      (event.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                />
              </label>
              {ROOM_NAME_PRESETS.map((name) => (
                <button
                  key={`chain-room-${name}`}
                  className={`free-draw-tool-button ${selectedChainRoomNameInput === name ? "active" : ""}`}
                  onClick={() => {
                    setSelectedChainRoomNameInput(name);
                    if (selectedChainId) {
                      updateWallChain(selectedChainId, { roomName: name });
                    }
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
        {selectedOpening && (
          <>
            <div className="free-draw-tool-row compact free-opening-controls">
              <span className="free-opening-controls-title">
                {selectedOpening.category === "window" ? "Pencere" : selectedOpening.category === "door" ? "Kapi" : "Surme"} Ayarlari
              </span>
              {onImportOpening && (
                <button className="free-draw-tool-button active" onClick={() => onImportOpening(selectedOpening)}>
                  PVC'ye Aktar
                </button>
              )}
              <button className="free-draw-tool-button" onClick={() => updateOpeningEntity(selectedOpening.id, { preset: "double-window" })}>
                Pencere
              </button>
              <button className="free-draw-tool-button" onClick={() => updateOpeningEntity(selectedOpening.id, { preset: "single-door" })}>
                Kapi
              </button>
              <button className="free-draw-tool-button" onClick={() => updateOpeningEntity(selectedOpening.id, { preset: "slider-2" })}>
                Surme
              </button>
              <button className="free-draw-tool-button" onClick={() => updateOpeningEntity(selectedOpening.id, { leafTypes: Array.from({ length: selectedOpening.columns }, () => "fixed") })}>
                Sabit
              </button>
              <button className="free-draw-tool-button" onClick={() => updateOpeningEntity(selectedOpening.id, { leafTypes: getDefaultLeafTypes(selectedOpening.category, selectedOpening.columns, "left") })}>
                Sol
              </button>
              <button className="free-draw-tool-button" onClick={() => updateOpeningEntity(selectedOpening.id, { leafTypes: getDefaultLeafTypes(selectedOpening.category, selectedOpening.columns, "right") })}>
                Sag
              </button>
              <button className={`free-draw-tool-button ${selectedOpening.topLight ? "active" : ""}`} onClick={() => updateOpeningEntity(selectedOpening.id, { topLight: !selectedOpening.topLight })}>
                Vasistas Ust
              </button>
            </div>
            <div className="free-draw-tool-row compact free-opening-presets-row">
              {OPENING_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  className={`free-draw-tool-button ${selectedOpening.preset === preset.value ? "active" : ""}`}
                  onClick={() => updateOpeningEntity(selectedOpening.id, { preset: preset.value })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}
        {sortedRooms.length > 0 && (
          <div className="free-draw-room-editor">
            <div className="free-draw-room-editor-header">
              <div>
                <p className="eyebrow">Mekan Cizelgesi</p>
                <h3>Oda Programi</h3>
              </div>
              <div className="free-draw-room-editor-meta">{sortedRooms.length} oda / teknik plan hazir</div>
            </div>
            <div className="free-draw-room-editor-table">
              {sortedRooms.map((room) => (
                <div
                  key={`room-editor-${room.chainId}`}
                  className={`free-draw-room-editor-row ${room.chainId === selectedChainId ? "selected" : ""} ${room.chainId === hoveredChainId ? "hovered" : ""}`}
                  onMouseEnter={() => setHoveredChainId(room.chainId)}
                  onMouseLeave={() => setHoveredChainId((current) => (current === room.chainId ? null : current))}
                  onClick={() => selectRoomChain(room.chainId)}
                >
                  <button
                    className="free-draw-room-select"
                    onClick={(event) => {
                      event.stopPropagation();
                      selectRoomChain(room.chainId);
                    }}
                  >
                    Sec
                  </button>
                  <input
                    className="free-draw-room-name-input"
                    value={roomScheduleDrafts[room.chainId] ?? room.name}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      setRoomScheduleDrafts((current) => ({
                        ...current,
                        [room.chainId]: event.target.value
                      }))
                    }
                    onBlur={() => commitRoomScheduleName(room.chainId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRoomScheduleName(room.chainId);
                        (event.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                  />
                  <select
                    className="free-draw-room-type-select"
                    value={room.wallType}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      updateWallChain(room.chainId, { wallType: event.target.value as FreeDrawWallType })
                    }
                  >
                    {FREE_DRAW_WALL_TYPE_OPTIONS.map((option) => (
                      <option key={`room-type-${room.chainId}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="free-draw-room-metric">{room.areaM2.toFixed(2)} m2</div>
                  <div className="free-draw-room-metric">{Math.round(room.perimeterMm)} mm</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {facadeProgramItems.length > 0 && (
          <div className="free-facade-editor">
            <div className="free-facade-editor-header">
              <div>
                <p className="eyebrow">Cephe Programi</p>
                <h3>Aciklikli Duvarlar</h3>
              </div>
              <div className="free-draw-room-editor-meta">
                {facadeProgramItems.length} cephe /{" "}
                {facadeProgramItems.reduce((sum, item) => sum + item.openingCount, 0)} aciklik
              </div>
            </div>
            <div className="free-facade-editor-actions">
              <button className="free-draw-tool-button" onClick={handlePrintTechnicalPacket}>
                Teknik Paket
              </button>
              {onImportFacadeBundle && (
                <button className="free-draw-tool-button active" onClick={handleImportFacadeBundleAction}>
                  PVC Paket
                </button>
              )}
            </div>
            <div className="free-facade-editor-table">
              {facadeProgramItems.map((item) => (
                <div
                  key={`facade-program-${item.wall.id}`}
                  className={`free-facade-editor-row ${selectedFacadeProgramItem?.wall.id === item.wall.id ? "selected" : ""} ${
                    hoveredChainId === item.chainId ? "hovered" : ""
                  }`}
                  onMouseEnter={() => setHoveredChainId(item.chainId)}
                  onMouseLeave={() => setHoveredChainId((current) => (current === item.chainId ? null : current))}
                  onClick={() => setSelectedId(item.wall.id)}
                >
                  <button
                    className="free-draw-room-select"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(item.wall.id);
                    }}
                  >
                    Sec
                  </button>
                  <div className="free-facade-editor-title">
                    <strong>{item.title}</strong>
                    <span>
                      {getWallTypeLabel(item.wallType)} / {item.segmentLabel} / {Math.round(item.wallLength)} mm /{" "}
                      {Math.round(item.wallThickness)} mm
                    </span>
                  </div>
                  <div className="free-facade-metric">{item.openingCount} aciklik</div>
                  <div className="free-facade-metric">{Math.round(item.totalLength)} mm zincir</div>
                  <div className="free-facade-metric">{Math.round(item.solidLength)} mm sabit</div>
                  <div className="free-facade-editor-actions-inline">
                    <button
                      className="free-draw-tool-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handlePrintFacadeProgramItem(item);
                      }}
                    >
                      Pafta
                    </button>
                    {onImportWallFacade && (
                      <button
                        className="free-draw-tool-button active"
                        onClick={(event) => {
                          event.stopPropagation();
                          onImportWallFacade(item.wall, item.openings);
                        }}
                      >
                        PVC
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedChainLinkedFacades.length > 0 && (
          <div className="free-linked-pvc-editor">
            <div className="free-facade-editor-header">
              <div>
                <p className="eyebrow">PVC Baglantilari</p>
                <h3>Secili Zincirle Iliskili Cepheler</h3>
              </div>
              <div className="free-draw-room-editor-meta">
                {selectedChainLinkedFacades.length} bagli cephe / {selectedRoomName || "Adsiz Zincir"} /{" "}
                {selectedChainSyncSummary.synced} senkron / {selectedChainSyncSummary.stale} degisen /{" "}
                {selectedChainSyncSummary.missing} eksik / {selectedChainSyncSummary.diffCount} fark
              </div>
            </div>
            <div className="free-linked-pvc-table">
              {selectedChainLinkedFacades.map((item) => (
                <button
                  key={`linked-facade-${item.designId}`}
                  className={`free-linked-pvc-row ${item.active ? "active" : ""}`}
                  onClick={() => onLoadLinkedFacade?.(item.designId)}
                >
                  <span>{item.segmentLabel ?? "Cephe"}</span>
                  <strong>{item.name}</strong>
                  <em>
                    {item.openingCount ?? 0} aciklik / {item.bundleName ?? item.roomName ?? "Bagli set"}
                  </em>
                  <div className="free-linked-pvc-badges">
                    <i className={`free-linked-pvc-badge ${item.syncStatus ?? "synced"}`}>
                      {item.syncStatus === "stale" ? "Plan Degisti" : item.syncStatus === "missing" ? "Kaynak Eksik" : "Senkron"}
                    </i>
                    {(item.syncDiffCount ?? 0) > 0 && (
                      <i className="free-linked-pvc-badge diff">{item.syncDiffCount} fark</i>
                    )}
                    <i className="free-linked-pvc-badge neutral">{item.revisionCount ?? 0} revizyon</i>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="free-draw-canvas-wrap"
        onWheel={(event) => {
          event.preventDefault();
          const host = event.currentTarget;
          const anchor = getCanvasClientPoint(event.clientX, event.clientY, host, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
          const nextZoom = clamp(event.deltaY < 0 ? zoom + 0.1 : zoom - 0.1, 0.25, 4);
          const worldAtPointer = {
            x: (anchor.x - pan.x) / zoom,
            y: (anchor.y - pan.y) / zoom
          };
          setZoom(Number(nextZoom.toFixed(2)));
          setPan({
            x: anchor.x - worldAtPointer.x * nextZoom,
            y: anchor.y - worldAtPointer.y * nextZoom
          });
        }}
        onMouseDown={(event) => {
          const host = event.currentTarget;
          const { worldPoint } = updateCursor(event.clientX, event.clientY, host);
          const nextPoint = resolveInteractionPoint(worldPoint);

          if (event.button === 1 || spacePressed) {
            event.preventDefault();
            handlePanStart(event.clientX, event.clientY);
            return;
          }

          if (event.button !== 0) {
            return;
          }

          if (activeTool === "select" && selectedOpening) {
            const hitId = findEntityAtPoint(nextPoint, entities, 10 / Math.max(zoom, 0.25));
            if (hitId === selectedOpening.id) {
              startOpeningManipulation("move", selectedOpening, nextPoint);
              return;
            }
          }

          finishPointerAction(nextPoint);
        }}
        onMouseMove={(event) => {
          const host = event.currentTarget;
          updateCursor(event.clientX, event.clientY, host);
          if ((event.buttons & 4) || spacePressed) {
            handlePanMove(event.clientX, event.clientY);
          }
        }}
        onMouseUp={() => {
          panStateRef.current = null;
          commitWallManipulation();
          commitOpeningManipulation();
        }}
        onMouseLeave={() => {
          panStateRef.current = null;
          commitWallManipulation();
          commitOpeningManipulation();
          setCursor(null);
          setCursorWorld(null);
          setHoveredChainId(null);
        }}
      >
        <svg
          ref={svgRef}
          className="free-draw-surface"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} className="free-draw-background" />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <g className="free-draw-grid minor">
              {minorVerticalTicks.map((value) => (
                <line key={`minor-v-${value}`} x1={value} y1={visibleWorldBounds.top} x2={value} y2={visibleWorldBounds.bottom} />
              ))}
              {minorHorizontalTicks.map((value) => (
                <line key={`minor-h-${value}`} x1={visibleWorldBounds.left} y1={value} x2={visibleWorldBounds.right} y2={value} />
              ))}
            </g>
            <g className="free-draw-grid major">
              {majorVerticalTicks.map((value) => (
                <line key={`major-v-${value}`} x1={value} y1={visibleWorldBounds.top} x2={value} y2={visibleWorldBounds.bottom} />
              ))}
              {majorHorizontalTicks.map((value) => (
                <line key={`major-h-${value}`} x1={visibleWorldBounds.left} y1={value} x2={visibleWorldBounds.right} y2={value} />
              ))}
            </g>
            {designerGuides.length > 0 && (
              <g className="free-draw-designer-guides">
                {designerGuides.map((guide) =>
                  guide.orientation === "vertical" ? (
                    <g key={`designer-guide-${guide.orientation}-${guide.label}-${guide.positionMm}`}>
                      <line
                        x1={guide.positionMm}
                        y1={visibleWorldBounds.top}
                        x2={guide.positionMm}
                        y2={visibleWorldBounds.bottom}
                      />
                      <text x={guide.positionMm + 8} y={visibleWorldBounds.top + 24}>
                        {guide.label}
                      </text>
                    </g>
                  ) : (
                    <g key={`designer-guide-${guide.orientation}-${guide.label}-${guide.positionMm}`}>
                      <line
                        x1={visibleWorldBounds.left}
                        y1={guide.positionMm}
                        x2={visibleWorldBounds.right}
                        y2={guide.positionMm}
                      />
                      <text x={visibleWorldBounds.left + 10} y={guide.positionMm - 8}>
                        {guide.label}
                      </text>
                    </g>
                  )
                )}
              </g>
            )}

            {roomRegions.map((room) => (
              <g key={room.chainId}>
                {renderRoomRegion(
                  room,
                  room.chainId === selectedChainId,
                  room.chainId === activeChainId,
                  (hovering) => setHoveredChainId(hovering ? room.chainId : null),
                  {
                    linked: linkedFacadeCountByChain.get(room.chainId) ?? 0,
                    stale: linkedFacadeStatusByChain.get(room.chainId)?.stale ?? 0,
                    missing: linkedFacadeStatusByChain.get(room.chainId)?.missing ?? 0,
                    diffCount: linkedFacadeStatusByChain.get(room.chainId)?.diffCount ?? 0
                  }
                )}
              </g>
            ))}
            {activeRoom && renderRoomDimensionOverlay(activeRoom)}
            {activeRoom && renderRoomAxisOverlay(activeRoom)}
            {activeRoom && renderRoomLevelOverlay(activeRoom)}
            {activeRoom && renderRoomChainSegmentOverlay(activeRoom, activeChainWalls)}

            {entities.map((entity) => {
              if (wallManipulation && wallPreview && entity.id === wallManipulation.entity.id) {
                return null;
              }
              if (openingManipulation && openingPreview && entity.id === openingManipulation.entity.id) {
                return null;
              }
              const isSelected = entity.id === selectedId;
              const className = `free-draw-entity ${isSelected ? "selected" : ""}`;

              if (entity.type === "wall") {
                return (
                  <g key={entity.id}>
                    {renderWallEntity(
                      entity,
                      isSelected,
                      false,
                      hostedOpeningsByWall.get(entity.id) ?? [],
                      getWallJoinMarkers(entity, entities),
                      entity.chainId === activeChainId,
                      (hovering) => setHoveredChainId(hovering ? entity.chainId ?? null : null),
                      getWallEndpointMerges(entity, entities, activeChainId)
                    )}
                  </g>
                );
              }

              if (entity.type === "opening") {
                const hostWall =
                  entity.hostWallId && activeChainId
                    ? entities.find((candidate) => candidate.type === "wall" && candidate.id === entity.hostWallId) as FreeDrawWallEntity | undefined
                    : undefined;
                return (
                  <g key={entity.id}>
                    {renderOpeningEntity(
                      entity,
                      isSelected,
                      false,
                      hostWall?.chainId === activeChainId,
                      (hovering) => setHoveredChainId(hovering ? hostWall?.chainId ?? null : null)
                    )}
                  </g>
                );
              }

              if (entity.type === "line") {
                return <line key={entity.id} x1={entity.start.x} y1={entity.start.y} x2={entity.end.x} y2={entity.end.y} className={className} />;
              }

              if (entity.type === "rectangle") {
                return <rect key={entity.id} x={entity.x} y={entity.y} width={entity.width} height={entity.height} className={className} />;
              }

              if (entity.type === "circle") {
                return <circle key={entity.id} cx={entity.center.x} cy={entity.center.y} r={entity.radius} className={className} />;
              }

              if (entity.type === "arc") {
                return (
                  <polyline
                    key={entity.id}
                    points={buildArcSamplePoints(entity).map((point) => `${point.x},${point.y}`).join(" ")}
                    className={className}
                  />
                );
              }

              if (entity.type === "polyline") {
                const points = entity.closed ? [...entity.points, entity.points[0]] : entity.points;
                return (
                  <polyline
                    key={entity.id}
                    points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                    className={className}
                  />
                );
              }

              if (entity.type === "dimension") {
                const geometry = getDimensionGeometry(entity);
                return (
                  <g key={entity.id} className={`${className} dimension`}>
                    <line x1={entity.start.x} y1={entity.start.y} x2={geometry.startOffset.x} y2={geometry.startOffset.y} />
                    <line x1={entity.end.x} y1={entity.end.y} x2={geometry.endOffset.x} y2={geometry.endOffset.y} />
                    <line x1={geometry.startOffset.x} y1={geometry.startOffset.y} x2={geometry.endOffset.x} y2={geometry.endOffset.y} />
                    <text x={geometry.labelPoint.x} y={geometry.labelPoint.y}>
                      {formatMeasurement(geometry.length)}
                    </text>
                  </g>
                );
              }

              const bounds = getEntityBounds(entity);
              return (
                <g key={entity.id} className={`${className} text`}>
                  <text x={entity.position.x} y={entity.position.y}>{entity.text}</text>
                  {isSelected && (
                    <rect
                      x={bounds.x - 10}
                      y={bounds.y - 34}
                      width={Math.max(bounds.width + 20, 60)}
                      height={Math.max(bounds.height + 40, 40)}
                      className="free-draw-text-selection"
                    />
                  )}
                </g>
              );
            })}

            {entities.map((entity) => {
              if (entity.type !== "wall") {
                return null;
              }
              const segmentLabel = entity.segmentIndex !== undefined ? `S${entity.segmentIndex + 1}` : "Ana";
              const segmentKey = buildSegmentKey(entity.chainId ?? entity.id, segmentLabel);
              const segmentSyncState = linkedFacadeStatusBySegment.get(segmentKey);
              const segmentItems = linkedFacadeBySegment.get(segmentKey) ?? [];
              return (
                <g key={`${entity.id}-sync`}>
                  {renderWallSyncBadge(
                    entity,
                    segmentSyncState,
                    () => openLinkedFacadeForSegment(entity.chainId ?? entity.id, segmentLabel),
                    (hovering) => setHoveredSegmentKey(hovering ? segmentKey : null)
                  )}
                  {hoveredSegmentKey === segmentKey &&
                    renderWallSyncTooltip(
                      entity,
                      segmentItems,
                      segmentSyncState ?? {
                        linked: 0,
                        stale: 0,
                        missing: 0,
                        diffCount: 0
                      },
                      (hovering) => setHoveredSegmentKey(hovering ? segmentKey : null)
                    )}
                </g>
              );
            })}

            {wallPreview && <g className="free-draw-preview-layer">{renderWallEntity(wallPreview, true, true)}</g>}
            {openingPreview && <g className="free-draw-preview-layer">{renderOpeningEntity(openingPreview, true, true)}</g>}

            {selectedWall && activeTool === "select" && !wallManipulation && (() => {
              const geometry = getWallGeometry(selectedWall);
              const handleSize = 18;
              const handleX = geometry.orientation === "horizontal" ? geometry.rect.x + geometry.rect.width * 0.5 : geometry.rect.x + geometry.rect.width + 12;
              const handleY = geometry.orientation === "horizontal" ? geometry.rect.y - 12 : geometry.rect.y + geometry.rect.height * 0.5;
              return (
                <g className="free-wall-handles">
                  {renderWallDimensionOverlay(selectedWall, selectedWallHostedOpenings)}
                  <rect
                    x={handleX - handleSize * 0.5}
                    y={handleY - handleSize * 0.5}
                    width={handleSize}
                    height={handleSize}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startWallManipulation(selectedWall, activeWorldPoint ?? geometry.centerline.start);
                    }}
                  />
                  <text x={geometry.rect.x + geometry.rect.width / 2} y={geometry.rect.y - 30} className="free-wall-hud">
                    {selectedRoomName || getWallTypeLabel(selectedWallType)} / {Math.round(selectedWall.thickness)} mm
                  </text>
                </g>
              );
            })()}

            {selectedOpening && activeTool === "select" && !openingManipulation && (() => {
              const geometry = selectedOpeningGeometry ?? getOpeningGeometry(selectedOpening);
              const handleSize = 18;
              const hostedOrientation = selectedOpening.hostOrientation;
              return (
                <g className="free-opening-handles">
                  <line
                    x1={selectedOpening.x}
                    y1={selectedOpening.y - 34}
                    x2={selectedOpening.x + selectedOpening.width}
                    y2={selectedOpening.y - 34}
                    className="free-opening-dimension-line"
                  />
                  <line
                    x1={selectedOpening.x}
                    y1={selectedOpening.y - 44}
                    x2={selectedOpening.x}
                    y2={selectedOpening.y - 10}
                    className="free-opening-dimension-line"
                  />
                  <line
                    x1={selectedOpening.x + selectedOpening.width}
                    y1={selectedOpening.y - 44}
                    x2={selectedOpening.x + selectedOpening.width}
                    y2={selectedOpening.y - 10}
                    className="free-opening-dimension-line"
                  />
                  <text x={selectedOpening.x + selectedOpening.width / 2} y={selectedOpening.y - 42} className="free-opening-hud">
                    {Math.round(selectedOpening.width)} mm
                  </text>
                  <line
                    x1={selectedOpening.x + selectedOpening.width + 34}
                    y1={selectedOpening.y}
                    x2={selectedOpening.x + selectedOpening.width + 34}
                    y2={selectedOpening.y + selectedOpening.height}
                    className="free-opening-dimension-line"
                  />
                  <line
                    x1={selectedOpening.x + selectedOpening.width + 10}
                    y1={selectedOpening.y}
                    x2={selectedOpening.x + selectedOpening.width + 44}
                    y2={selectedOpening.y}
                    className="free-opening-dimension-line"
                  />
                  <line
                    x1={selectedOpening.x + selectedOpening.width + 10}
                    y1={selectedOpening.y + selectedOpening.height}
                    x2={selectedOpening.x + selectedOpening.width + 44}
                    y2={selectedOpening.y + selectedOpening.height}
                    className="free-opening-dimension-line"
                  />
                  <text x={selectedOpening.x + selectedOpening.width + 54} y={selectedOpening.y + selectedOpening.height / 2} className="free-opening-hud side">
                    {Math.round(selectedOpening.height)} mm
                  </text>
                  {hostedOrientation !== "vertical" && (
                    <rect
                      x={selectedOpening.x + selectedOpening.width - handleSize * 0.5}
                      y={selectedOpening.y + selectedOpening.height * 0.5 - handleSize * 0.5}
                      width={handleSize}
                      height={handleSize}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        startOpeningManipulation("width", selectedOpening, activeWorldPoint ?? { x: selectedOpening.x, y: selectedOpening.y });
                      }}
                    />
                  )}
                  {hostedOrientation !== "horizontal" && (
                    <rect
                      x={selectedOpening.x + selectedOpening.width * 0.5 - handleSize * 0.5}
                      y={selectedOpening.y + selectedOpening.height - handleSize * 0.5}
                      width={handleSize}
                      height={handleSize}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        startOpeningManipulation("height", selectedOpening, activeWorldPoint ?? { x: selectedOpening.x, y: selectedOpening.y });
                      }}
                    />
                  )}
                  {!hostedOrientation && (
                    <rect
                      x={selectedOpening.x + selectedOpening.width - handleSize * 0.5}
                      y={selectedOpening.y + selectedOpening.height - handleSize * 0.5}
                      width={handleSize}
                      height={handleSize}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        startOpeningManipulation("corner", selectedOpening, activeWorldPoint ?? { x: selectedOpening.x, y: selectedOpening.y });
                      }}
                    />
                  )}
                  {geometry.dividerXs.map((dividerX, index) => (
                    <g key={`${selectedOpening.id}-divider-handle-${dividerX}`}>
                      <line
                        x1={dividerX}
                        y1={geometry.mainRect.y + 12}
                        x2={dividerX}
                        y2={geometry.mainRect.y + geometry.mainRect.height - 12}
                        className="free-opening-divider-guide"
                      />
                      <rect
                        x={dividerX - handleSize * 0.5}
                        y={geometry.mainRect.y + geometry.mainRect.height * 0.5 - handleSize * 0.5}
                        width={handleSize}
                        height={handleSize}
                        className="divider-handle"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          startOpeningManipulation("divider", selectedOpening, activeWorldPoint ?? { x: dividerX, y: geometry.mainRect.y }, index);
                        }}
                      />
                    </g>
                  ))}
                  <text
                    x={geometry.outer.x + geometry.outer.width / 2}
                    y={geometry.outer.y - 18}
                    className="free-opening-hud"
                  >
                    Genislik / Yukseklik / Bolme tutamaclari aktif
                  </text>
                </g>
              );
            })()}

            {draftPreview && (
              <g className="free-draw-preview-layer">
                {draftPreview.type === "wall" && renderWallEntity(draftPreview, false, true)}
                {draftPreview.type === "opening" && renderOpeningEntity(draftPreview, false, true)}
                {draftPreview.type === "line" && (
                  <line x1={draftPreview.start.x} y1={draftPreview.start.y} x2={draftPreview.end.x} y2={draftPreview.end.y} className="free-draw-preview-entity" />
                )}
                {draftPreview.type === "rectangle" && (
                  <rect x={draftPreview.x} y={draftPreview.y} width={draftPreview.width} height={draftPreview.height} className="free-draw-preview-entity" />
                )}
                {draftPreview.type === "circle" && (
                  <circle cx={draftPreview.center.x} cy={draftPreview.center.y} r={draftPreview.radius} className="free-draw-preview-entity" />
                )}
                {draftPreview.type === "arc" && (
                  <polyline points={buildArcSamplePoints(draftPreview).map((point) => `${point.x},${point.y}`).join(" ")} className="free-draw-preview-entity" />
                )}
                {draftPreview.type === "polyline" && (
                  <polyline points={draftPreview.points.map((point) => `${point.x},${point.y}`).join(" ")} className="free-draw-preview-entity" />
                )}
                {draftPreview.type === "dimension" && (() => {
                  const geometry = getDimensionGeometry(draftPreview);
                  return (
                    <g className="free-draw-preview-entity dimension">
                      <line x1={draftPreview.start.x} y1={draftPreview.start.y} x2={geometry.startOffset.x} y2={geometry.startOffset.y} />
                      <line x1={draftPreview.end.x} y1={draftPreview.end.y} x2={geometry.endOffset.x} y2={geometry.endOffset.y} />
                      <line x1={geometry.startOffset.x} y1={geometry.startOffset.y} x2={geometry.endOffset.x} y2={geometry.endOffset.y} />
                      <text x={geometry.labelPoint.x} y={geometry.labelPoint.y}>{formatMeasurement(geometry.length)}</text>
                    </g>
                  );
                })()}
              </g>
            )}

            {snapCandidate && (
              <g className="free-draw-snap-layer">
                {snapCandidate.marker === "square" && (
                  <rect x={snapCandidate.point.x - 7} y={snapCandidate.point.y - 7} width="14" height="14" className="free-draw-snap-marker" />
                )}
                {snapCandidate.marker === "triangle" && (
                  <polygon
                    points={`${snapCandidate.point.x},${snapCandidate.point.y - 8} ${snapCandidate.point.x + 8},${snapCandidate.point.y + 8} ${snapCandidate.point.x - 8},${snapCandidate.point.y + 8}`}
                    className="free-draw-snap-marker"
                  />
                )}
                {snapCandidate.marker === "diamond" && (
                  <polygon
                    points={`${snapCandidate.point.x},${snapCandidate.point.y - 8} ${snapCandidate.point.x + 8},${snapCandidate.point.y} ${snapCandidate.point.x},${snapCandidate.point.y + 8} ${snapCandidate.point.x - 8},${snapCandidate.point.y}`}
                    className="free-draw-snap-marker"
                  />
                )}
                {snapCandidate.marker === "grid" && (
                  <rect x={snapCandidate.point.x - 5} y={snapCandidate.point.y - 5} width="10" height="10" className="free-draw-snap-marker subtle" />
                )}
                <text x={snapCandidate.point.x + 12} y={snapCandidate.point.y - 12} className="free-draw-snap-label">
                  {snapCandidate.label === "GUIDE" ? snapCandidate.guideLabel ?? "GUIDE" : snapCandidate.label}
                </text>
              </g>
            )}

            {liveMeasurement && (
              <g className="free-draw-live-measurement">
                <text
                  x={liveMeasurement.labelX}
                  y={liveMeasurement.labelY}
                  className="free-draw-live-dist"
                >
                  {liveMeasurement.dist} mm
                </text>
                <text
                  x={liveMeasurement.labelX}
                  y={liveMeasurement.labelY + 14 / Math.max(zoom, 0.25)}
                  className="free-draw-live-angle"
                >
                  {liveMeasurement.angleDeg}°
                </text>
              </g>
            )}
          </g>

          {renderPlanLegend(sortedRooms)}
          {renderRoomSchedule(
            sortedRooms,
            selectedChainId,
            selectRoomChain,
            hoveredChainId,
            setHoveredChainId,
            linkedFacadeCountByChain,
            linkedFacadeStatusByChain
          )}

          {cursor && (
            <g className="free-draw-cursor-layer">
              <line x1={cursor.x} y1="0" x2={cursor.x} y2={VIEWBOX_HEIGHT} className="free-draw-crosshair" />
              <line x1="0" y1={cursor.y} x2={VIEWBOX_WIDTH} y2={cursor.y} className="free-draw-crosshair" />
              <circle cx={cursor.x} cy={cursor.y} r="3" className="free-draw-crosshair-dot" />
            </g>
          )}
        </svg>
      </div>

      {pendingTextPoint && (
        <div className="free-draw-text-input-overlay">
          <span className="free-draw-text-input-label">Metin:</span>
          <input
            autoFocus
            className="free-draw-text-input-field"
            value={pendingTextValue}
            onChange={(e) => setPendingTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (pendingTextValue.trim()) {
                  addTextAtPoint(pendingTextPoint, pendingTextValue.trim());
                }
                setPendingTextPoint(null);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setPendingTextPoint(null);
              }
            }}
          />
          <button
            className="free-draw-tool-button"
            onClick={() => {
              if (pendingTextValue.trim()) {
                addTextAtPoint(pendingTextPoint, pendingTextValue.trim());
              }
              setPendingTextPoint(null);
            }}
          >
            Ekle
          </button>
          <button className="free-draw-tool-button" onClick={() => setPendingTextPoint(null)}>
            İptal
          </button>
        </div>
      )}

      <div className="free-draw-status-bar">
        <span>Tool: {activeTool.toUpperCase()}</span>
        {activeRoom && (
          <span>
            Aktif Oda: {activeRoom.name} / {getWallTypeLabel(activeRoom.wallType)} / {activeRoom.areaM2.toFixed(2)} m2 / {Math.round(activeRoom.perimeterMm)} mm
          </span>
        )}
        {selectedWall && (
          <span>
            {selectedRoomName || "Adsiz Zincir"} / {getWallTypeLabel(selectedWallType)} / {Math.round(getWallGeometry(selectedWall).length)} x {Math.round(selectedWall.thickness)} mm / {selectedWallHostedOpenings.length} hosted aciklik
          </span>
        )}
        {facadeProgramItems.length > 0 && (
          <span>
            Cepheler: {facadeProgramItems.length} / Teknik Paket hazir /{" "}
            {facadeProgramItems.reduce((sum, item) => sum + item.openingCount, 0)} toplam aciklik
          </span>
        )}
        {selectedChainLinkedFacades.length > 0 && (
          <span>
            Bagli PVC: {selectedChainLinkedFacades.length} cephe / {selectedChainSyncSummary.synced} senkron /{" "}
            {selectedChainSyncSummary.stale} degisen / {selectedChainSyncSummary.missing} eksik /{" "}
            {selectedChainSyncSummary.diffCount} fark
          </span>
        )}
        {openingStatusTarget && (
          <span>
            Secili: {openingStatusTarget.category === "window" ? "Pencere" : openingStatusTarget.category === "door" ? "Kapi" : "Surme"} / {openingStatusTarget.columns} bolme
            {openingStatusTarget.topLight ? " / vasistas ust" : ""} / {Math.round(openingStatusTarget.width)} x {Math.round(openingStatusTarget.height)} mm
            {openingStatusTarget.preset ? ` / ${openingStatusTarget.preset}` : ""}
          </span>
        )}
        <span>OSNAP: {snapCandidate?.label ?? "FREE"}</span>
        <span>ORTHO: {orthoEnabled ? "ON" : "OFF"}</span>
        <span>Grid: {gridSize} mm</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Undo: {history.length}</span>
        <span>Redo: {future.length}</span>
        <strong>
          X: {(activeWorldPoint ?? cursorWorld)?.x.toFixed(1) ?? "0.0"} Y: {(activeWorldPoint ?? cursorWorld)?.y.toFixed(1) ?? "0.0"}
        </strong>
      </div>
    </div>
  );
}
