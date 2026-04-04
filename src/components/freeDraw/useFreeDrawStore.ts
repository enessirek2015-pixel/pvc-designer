import { create } from "zustand";
import {
  buildOpeningPresetPatch,
  cloneDraft,
  cloneEntity,
  createArcEntity,
  createCircleEntity,
  createDimensionEntity,
  createLineEntity,
  createPolylineEntity,
  createRectangleEntity,
  createTextEntity,
  createWallEntity,
  createSmartOpeningEntity,
  getDefaultLeafTypes,
  normalizeOpeningRatios,
  type FreeDrawOpeningCategory,
  type FreeDrawOpeningLeafKind,
  type FreeDrawOpeningPreset,
  type FreeDrawDraft,
  type FreeDrawEntity,
  type FreeDrawPoint,
  type FreeDrawTool,
  type FreeDrawWallType
} from "./freeDrawTools";

type FreeDrawSnapshot = {
  entities: FreeDrawEntity[];
  selectedId: string | null;
  draft: FreeDrawDraft | null;
};

type FreeDrawState = {
  entities: FreeDrawEntity[];
  selectedId: string | null;
  activeTool: FreeDrawTool;
  draft: FreeDrawDraft | null;
  zoom: number;
  pan: { x: number; y: number };
  orthoEnabled: boolean;
  snapSettings: {
    endpoint: boolean;
    midpoint: boolean;
    perpendicular: boolean;
    grid: boolean;
  };
  gridSize: number;
  history: FreeDrawSnapshot[];
  future: FreeDrawSnapshot[];
  setTool: (tool: FreeDrawTool) => void;
  handleToolPoint: (point: FreeDrawPoint) => void;
  finalizeDraft: (closePolyline?: boolean) => void;
  closeWallDraft: () => void;
  cancelDraft: () => void;
  updateWallDraftMeta: (
    patch: Partial<{
      wallType: FreeDrawWallType;
      roomName: string;
    }>
  ) => void;
  addTextAtPoint: (point: FreeDrawPoint, text: string) => void;
  setSelectedId: (id: string | null) => void;
  deleteSelected: () => void;
  deleteEntity: (id: string) => void;
  updateWallEntity: (
    id: string,
    patch: Partial<{
      start: FreeDrawPoint;
      end: FreeDrawPoint;
      thickness: number;
      wallType: FreeDrawWallType;
      roomName: string;
    }>
  ) => void;
  updateWallChain: (
    chainId: string,
    patch: Partial<{
      thickness: number;
      wallType: FreeDrawWallType;
      roomName: string;
    }>
  ) => void;
  updateOpeningEntity: (
    id: string,
    patch: Partial<{
      category: FreeDrawOpeningCategory;
      x: number;
      y: number;
      width: number;
      height: number;
      columns: number;
      topLight: boolean;
      swing: "fixed" | "left" | "right" | "double" | "sliding";
      frameThickness: number;
      mullionThickness: number;
      glassInset: number;
      leafTypes: FreeDrawOpeningLeafKind[];
      columnRatios: number[];
      preset: FreeDrawOpeningPreset;
      hostWallId: string | null;
      hostOrientation: "horizontal" | "vertical" | null;
    }>
  ) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  toggleOrtho: () => void;
  toggleSnap: (key: keyof FreeDrawState["snapSettings"]) => void;
  setGridSize: (value: number) => void;
  undo: () => void;
  redo: () => void;
};

function cloneSnapshot(state: Pick<FreeDrawState, "entities" | "selectedId" | "draft">): FreeDrawSnapshot {
  return {
    entities: state.entities.map(cloneEntity),
    selectedId: state.selectedId,
    draft: cloneDraft(state.draft)
  };
}

function withHistory(state: FreeDrawState, recipe: (draft: FreeDrawSnapshot) => void) {
  const draft = cloneSnapshot(state);
  recipe(draft);

  return {
    entities: draft.entities,
    selectedId: draft.selectedId,
    draft: draft.draft,
    history: [...state.history, cloneSnapshot(state)].slice(-50),
    future: []
  };
}

export const useFreeDrawStore = create<FreeDrawState>((set) => ({
  entities: [],
  selectedId: null,
  activeTool: "line",
  draft: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  orthoEnabled: false,
  snapSettings: {
    endpoint: true,
    midpoint: true,
    perpendicular: true,
    grid: true
  },
  gridSize: 10,
  history: [],
  future: [],
  setTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      draft:
        tool === "select" || tool === "erase" || tool === "text"
          ? null
          : state.draft && state.draft.tool === tool
            ? state.draft
            : null
    })),
  handleToolPoint: (point) =>
    set((state) => {
      switch (state.activeTool) {
        case "wall":
          if (!state.draft || state.draft.tool !== "wall") {
            const chainId = `wall-chain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            return {
              draft: {
                tool: "wall",
                points: [point],
                chainStart: point,
                chainId,
                segmentIndex: 0,
                wallType: "interior",
                roomName: ""
              }
            };
          }
          return withHistory(state, (draft) => {
            const first = draft.draft?.points[0];
            if (!first) {
              return;
            }
            const wall = createWallEntity(
              first,
              point,
              240,
              draft.draft?.chainId,
              draft.draft?.segmentIndex ?? 0,
              draft.draft?.wallType ?? "interior",
              draft.draft?.roomName
            );
            draft.entities.push(wall);
            draft.selectedId = wall.id;
            draft.draft = {
              tool: "wall",
              points: [wall.end],
              chainStart: draft.draft?.chainStart ?? first,
              chainId: draft.draft?.chainId,
              segmentIndex: (draft.draft?.segmentIndex ?? 0) + 1,
              wallType: draft.draft?.wallType ?? "interior",
              roomName: draft.draft?.roomName ?? ""
            };
          });
        case "line":
          if (!state.draft || state.draft.tool !== "line") {
            return { draft: { tool: "line", points: [point] } };
          }
          return withHistory(state, (draft) => {
            const start = draft.draft?.points[draft.draft.points.length - 1];
            if (!start) {
              return;
            }
            draft.entities.push(createLineEntity(start, point));
            draft.draft = { tool: "line", points: [point] };
          });
        case "rectangle":
          if (!state.draft || state.draft.tool !== "rectangle") {
            return { draft: { tool: "rectangle", points: [point] } };
          }
          return withHistory(state, (draft) => {
            const first = draft.draft?.points[0];
            if (!first) {
              return;
            }
            draft.entities.push(createRectangleEntity(first, point));
            draft.draft = null;
          });
        case "circle":
          if (!state.draft || state.draft.tool !== "circle") {
            return { draft: { tool: "circle", points: [point] } };
          }
          return withHistory(state, (draft) => {
            const center = draft.draft?.points[0];
            if (!center) {
              return;
            }
            draft.entities.push(createCircleEntity(center, point));
            draft.draft = null;
          });
        case "arc":
          if (!state.draft || state.draft.tool !== "arc") {
            return { draft: { tool: "arc", points: [point] } };
          }
          if (state.draft.points.length < 2) {
            return {
              draft: {
                tool: "arc",
                points: [...state.draft.points, point]
              }
            };
          }
          return withHistory(state, (draft) => {
            if (!draft.draft || draft.draft.points.length < 2) {
              return;
            }
            draft.entities.push(createArcEntity(draft.draft.points[0], draft.draft.points[1], point));
            draft.draft = null;
          });
        case "polyline":
          if (!state.draft || state.draft.tool !== "polyline") {
            return { draft: { tool: "polyline", points: [point] } };
          }
          return {
            draft: {
              tool: "polyline",
              points: [...state.draft.points, point]
            }
          };
        case "dimension":
          if (!state.draft || state.draft.tool !== "dimension") {
            return { draft: { tool: "dimension", points: [point] } };
          }
          return withHistory(state, (draft) => {
            const first = draft.draft?.points[0];
            if (!first) {
              return;
            }
            draft.entities.push(createDimensionEntity(first, point));
            draft.draft = null;
          });
        case "window":
        case "door":
        case "sliding":
          const openingTool = state.activeTool;
          if (!state.draft || state.draft.tool !== state.activeTool) {
            return { draft: { tool: state.activeTool, points: [point] } };
          }
          return withHistory(state, (draft) => {
            const first = draft.draft?.points[0];
            if (!first) {
              return;
            }
            draft.entities.push(createSmartOpeningEntity(openingTool, first, point, draft.entities));
            draft.selectedId = draft.entities[draft.entities.length - 1]?.id ?? null;
            draft.draft = null;
          });
        default:
          return {};
      }
    }),
  finalizeDraft: (closePolyline = false) =>
    set((state) => {
      if (!state.draft) {
        return {};
      }

      if (state.draft.tool === "polyline" && state.draft.points.length >= 2) {
        return withHistory(state, (draft) => {
          if (!draft.draft) {
            return;
          }
          draft.entities.push(createPolylineEntity(draft.draft.points, closePolyline && draft.draft.points.length > 2));
          draft.draft = null;
        });
      }

      return { draft: null };
    }),
  closeWallDraft: () =>
    set((state) => {
      if (!state.draft || state.draft.tool !== "wall" || !state.draft.chainStart || !state.draft.points[0]) {
        return {};
      }

      const start = state.draft.points[0];
      const end = state.draft.chainStart;
      if (start.x === end.x && start.y === end.y) {
        return { draft: null };
      }

      return withHistory(state, (draft) => {
        if (!draft.draft?.chainStart || !draft.draft.points[0]) {
          return;
        }
        const wall = createWallEntity(
          draft.draft.points[0],
          draft.draft.chainStart,
          240,
          draft.draft.chainId,
          draft.draft.segmentIndex ?? 0,
          draft.draft.wallType ?? "interior",
          draft.draft.roomName
        );
        draft.entities.push(wall);
        draft.selectedId = wall.id;
        draft.draft = null;
      });
    }),
  cancelDraft: () => set(() => ({ draft: null })),
  updateWallDraftMeta: (patch) =>
    set((state) => {
      if (!state.draft || state.draft.tool !== "wall") {
        return {};
      }

      return {
        draft: {
          ...state.draft,
          wallType: patch.wallType ?? state.draft.wallType ?? "interior",
          roomName: patch.roomName ?? state.draft.roomName ?? ""
        }
      };
    }),
  addTextAtPoint: (point, text) =>
    set((state) => {
      if (!text.trim()) {
        return {};
      }

      return withHistory(state, (draft) => {
        draft.entities.push(createTextEntity(point, text.trim()));
        draft.selectedId = draft.entities[draft.entities.length - 1]?.id ?? null;
      });
    }),
  setSelectedId: (id) => set(() => ({ selectedId: id })),
  deleteSelected: () =>
    set((state) => {
      if (!state.selectedId) {
        return {};
      }

      return withHistory(state, (draft) => {
        draft.entities = draft.entities.filter((entity) => entity.id !== state.selectedId);
        draft.selectedId = null;
      });
    }),
  deleteEntity: (id) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.entities = draft.entities.filter((entity) => entity.id !== id);
        if (draft.selectedId === id) {
          draft.selectedId = null;
        }
      })
    ),
  updateWallEntity: (id, patch) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.entities = draft.entities.map((entity) => {
          if (entity.id !== id || entity.type !== "wall") {
            return entity;
          }

          return {
            ...entity,
            start: patch.start ?? entity.start,
            end: patch.end ?? entity.end,
            thickness: patch.thickness ? Math.max(100, Math.round(patch.thickness)) : entity.thickness,
            wallType: patch.wallType ?? entity.wallType ?? "interior",
            roomName:
              patch.roomName !== undefined
                ? patch.roomName.trim() || undefined
                : entity.roomName
          };
        });
      })
    ),
  updateWallChain: (chainId, patch) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.entities = draft.entities.map((entity) => {
          if (entity.type !== "wall" || entity.chainId !== chainId) {
            return entity;
          }

          return {
            ...entity,
            thickness: patch.thickness ? Math.max(100, Math.round(patch.thickness)) : entity.thickness,
            wallType: patch.wallType ?? entity.wallType ?? "interior",
            roomName:
              patch.roomName !== undefined
                ? patch.roomName.trim() || undefined
                : entity.roomName
          };
        });
      })
    ),
  updateOpeningEntity: (id, patch) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.entities = draft.entities.map((entity) => {
          if (entity.id !== id || entity.type !== "opening") {
            return entity;
          }

          const presetPatch = patch.preset ? buildOpeningPresetPatch(patch.preset, entity) : {};
          const nextPatch = {
            ...presetPatch,
            ...patch
          };
          const nextCategory = nextPatch.category ?? entity.category;
          const nextColumns = nextPatch.columns ? Math.max(1, Math.min(4, Math.round(nextPatch.columns))) : entity.columns;
          const hosted = (nextPatch.hostWallId ?? entity.hostWallId) != null;
          const hostOrientation = nextPatch.hostOrientation ?? entity.hostOrientation;
          const minSpan = nextCategory === "door" ? 800 : nextCategory === "sliding" ? 1200 : 700;
          const nextLeafTypes =
            nextPatch.leafTypes ??
            (nextColumns !== entity.columns || nextCategory !== entity.category
              ? getDefaultLeafTypes(nextCategory, nextColumns, nextPatch.swing ?? entity.swing)
              : entity.leafTypes);
          const nextRatios =
            nextPatch.columnRatios ??
            (nextColumns !== entity.columns ? normalizeOpeningRatios(nextColumns, entity.columnRatios) : entity.columnRatios);
          const nextHeight = nextPatch.height
            ? Math.round(nextPatch.height)
            : Math.max(entity.height, nextCategory === "door" ? 900 : 600);
          const nextWidth = nextPatch.width ? Math.round(nextPatch.width) : entity.width;

          return {
            ...entity,
            ...nextPatch,
            x: nextPatch.x ?? entity.x,
            y: nextPatch.y ?? entity.y,
            preset: nextPatch.preset ?? entity.preset,
            width: hosted && hostOrientation === "vertical" ? entity.width : Math.max(hosted ? minSpan : 400, nextWidth),
            height:
              hosted && hostOrientation === "horizontal"
                ? entity.height
                : Math.max(hosted ? minSpan : nextCategory === "door" ? 900 : 600, nextHeight),
            columns: nextColumns,
            glassInset: nextPatch.glassInset ? Math.max(12, Math.round(nextPatch.glassInset)) : entity.glassInset,
            leafTypes: nextLeafTypes,
            columnRatios: nextRatios
          };
        });
      })
    ),
  setZoom: (zoom) => set(() => ({ zoom })),
  setPan: (pan) => set(() => ({ pan })),
  resetView: () => set(() => ({ zoom: 1, pan: { x: 0, y: 0 } })),
  toggleOrtho: () => set((state) => ({ orthoEnabled: !state.orthoEnabled })),
  toggleSnap: (key) =>
    set((state) => ({
      snapSettings: {
        ...state.snapSettings,
        [key]: !state.snapSettings[key]
      }
    })),
  setGridSize: (value) => set(() => ({ gridSize: Math.max(1, Math.round(value)) })),
  undo: () =>
    set((state) => {
      const previous = state.history[state.history.length - 1];
      if (!previous) {
        return {};
      }

      return {
        entities: previous.entities.map(cloneEntity),
        selectedId: previous.selectedId,
        draft: cloneDraft(previous.draft),
        history: state.history.slice(0, -1),
        future: [cloneSnapshot(state), ...state.future].slice(0, 50)
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) {
        return {};
      }

      return {
        entities: next.entities.map(cloneEntity),
        selectedId: next.selectedId,
        draft: cloneDraft(next.draft),
        history: [...state.history, cloneSnapshot(state)].slice(-50),
        future: state.future.slice(1)
      };
    })
}));
