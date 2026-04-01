import { create } from "zustand";
import { panelLibraryModules, rowLibraryModules } from "../data/moduleLibrary";
import { designTemplates, sampleDesign } from "../data/sampleDesign";
import type {
  FrameColor,
  GlassType,
  GuideOrientation,
  HardwareQuality,
  MaterialSystem,
  OpeningType,
  PanelDefinition,
  ProfileSeries,
  PvcDesign,
  ReferenceGuide,
  TransomDefinition
} from "../types/pvc";

interface SelectionState {
  transomId: string;
  panelId: string;
}

export interface PanelRef {
  transomId: string;
  panelId: string;
}

interface HistoryEntry {
  design: PvcDesign;
  selected: SelectionState | null;
  activeProjectPath?: string;
}

interface DesignerState {
  design: PvcDesign;
  selected: SelectionState | null;
  activeProjectPath?: string;
  history: HistoryEntry[];
  future: HistoryEntry[];
  setTotalWidth: (width: number) => void;
  setTotalHeight: (height: number) => void;
  setOuterFrameThickness: (value: number) => void;
  setMullionThickness: (value: number) => void;
  selectPanel: (transomId: string, panelId: string) => void;
  setDesignName: (name: string) => void;
  loadTemplate: (templateId: string) => void;
  replaceDesign: (design: PvcDesign, activeProjectPath?: string) => void;
  setFrameColor: (value: FrameColor) => void;
  setGlassType: (value: GlassType) => void;
  setProfileSeries: (value: ProfileSeries) => void;
  setMaterialSystem: (value: MaterialSystem) => void;
  setHardwareQuality: (value: HardwareQuality) => void;
  setCustomerField: (field: keyof PvcDesign["customer"], value: string) => void;
  setPanelWidthById: (transomId: string, panelId: string, width: number) => void;
  setTransomHeightById: (transomId: string, height: number) => void;
  setSelectedOpeningType: (openingType: OpeningType) => void;
  setSelectedPanelWidth: (width: number) => void;
  setSelectedTransomHeight: (height: number) => void;
  splitSelectedPanelVertical: () => void;
  splitSelectedTransomHorizontal: () => void;
  deleteSelectedPanel: () => void;
  deleteSelectedTransom: () => void;
  insertPanelAdjacent: (side: "left" | "right") => void;
  insertTransomAdjacent: (side: "top" | "bottom") => void;
  copySelectedPanelToTarget: (targetTransomId: string, targetPanelId: string, side: "left" | "right") => void;
  copySelectedTransomToTarget: (targetTransomId: string, side: "top" | "bottom") => void;
  copySelectedPanelRepeatedToTarget: (
    targetTransomId: string,
    targetPanelId: string,
    side: "left" | "right",
    count: number,
    stepMm?: number
  ) => void;
  copySelectedTransomRepeatedToTarget: (
    targetTransomId: string,
    side: "top" | "bottom",
    count: number,
    stepMm?: number
  ) => void;
  moveSelectedPanelToTarget: (targetTransomId: string, targetPanelId: string, side: "left" | "right") => void;
  moveSelectedTransomToTarget: (targetTransomId: string, side: "top" | "bottom") => void;
  copyPanelGroupToTarget: (panels: PanelRef[], targetTransomId: string, targetPanelId: string, side: "left" | "right") => void;
  copyPanelGroupRepeatedToTarget: (
    panels: PanelRef[],
    targetTransomId: string,
    targetPanelId: string,
    side: "left" | "right",
    count: number,
    stepMm?: number
  ) => void;
  movePanelGroupToTarget: (panels: PanelRef[], targetTransomId: string, targetPanelId: string, side: "left" | "right") => void;
  equalizeSelectedRowPanels: () => void;
  equalizeAllTransomHeights: () => void;
  applyOpeningTypeToPanels: (panels: PanelRef[], openingType: OpeningType) => void;
  equalizePanelsByRefs: (panels: PanelRef[]) => void;
  equalizeTransomsByRefs: (panels: PanelRef[]) => void;
  offsetPanelGroupPattern: (panels: PanelRef[], stepMm: number, count?: number) => void;
  offsetSelectedPanelPattern: (stepMm: number, count?: number) => void;
  offsetSelectedTransomPattern: (stepMm: number, count?: number) => void;
  shiftPanelBlockBy: (panels: PanelRef[], deltaMm: number) => void;
  shiftSelectedTransomBy: (deltaMm: number) => void;
  adjustPanelBlockEdge: (panels: PanelRef[], edge: "left" | "right", deltaMm: number) => void;
  adjustSelectedTransomEdge: (edge: "top" | "bottom", deltaMm: number) => void;
  centerPanelBlock: (panels: PanelRef[]) => void;
  centerSelectedTransom: () => void;
  mirrorSelectedRow: () => void;
  mirrorTransomStack: () => void;
  arraySelectedPanel: (count: number, stepMm?: number) => void;
  arraySelectedTransom: (count: number, stepMm?: number) => void;
  arraySelectedGrid: (columns: number, rows: number, columnStepMm?: number, rowStepMm?: number) => void;
  applyPanelLibraryModule: (moduleId: string) => void;
  applyRowLibraryModule: (moduleId: string) => void;
  addReferenceGuide: (orientation: GuideOrientation, positionMm: number, label?: string) => void;
  setGuidePosition: (guideId: string, positionMm: number) => void;
  toggleGuideLock: (guideId: string) => void;
  renameGuide: (guideId: string, label: string) => void;
  removeGuide: (guideId: string) => void;
  undo: () => void;
  redo: () => void;
}

function cloneDesign(design: PvcDesign): PvcDesign {
  const guidesSource = (design as PvcDesign & { guides?: ReferenceGuide[] }).guides ?? [];
  return {
    ...design,
    materials: { ...design.materials, materialSystem: design.materials.materialSystem ?? "c60" },
    customer: { ...design.customer },
    guides: guidesSource.map((guide) => ({ ...guide })),
    transoms: design.transoms.map((transom) => ({
      ...transom,
      panels: transom.panels.map((panel) => ({ ...panel }))
    }))
  };
}

function cloneSelection(selected: SelectionState | null) {
  return selected ? { ...selected } : null;
}

function snapshot(state: Pick<DesignerState, "design" | "selected" | "activeProjectPath">): HistoryEntry {
  return {
    design: cloneDesign(state.design),
    selected: cloneSelection(state.selected),
    activeProjectPath: state.activeProjectPath
  };
}

function withHistory(
  state: DesignerState,
  recipe: (draft: { design: PvcDesign; selected: SelectionState | null; activeProjectPath?: string }) => void
) {
  const draft = {
    design: cloneDesign(state.design),
    selected: cloneSelection(state.selected),
    activeProjectPath: state.activeProjectPath
  };
  recipe(draft);
  return {
    design: draft.design,
    selected: draft.selected,
    activeProjectPath: draft.activeProjectPath,
    history: [...state.history, snapshot(state)].slice(-50),
    future: []
  };
}

function normalizePanelWidths(panels: PanelDefinition[], totalWidth: number) {
  const panelCount = panels.length;
  const baseWidth = Math.floor(totalWidth / panelCount);
  let remaining = totalWidth;

  return panels.map((panel, index) => {
    const nextWidth = index === panelCount - 1 ? remaining : baseWidth;
    remaining -= nextWidth;
    return { ...panel, width: nextWidth };
  });
}

function normalizeTransomHeights(transoms: TransomDefinition[], totalHeight: number) {
  const rowCount = transoms.length;
  let remaining = totalHeight;

  return transoms.map((transom, index) => {
    const nextHeight = index === rowCount - 1 ? remaining : transom.height;
    remaining -= nextHeight;
    return { ...transom, height: nextHeight };
  });
}

function clampPositive(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.round(value);
}

function distributeArrayWidths(totalWidth: number, count: number, stepMm?: number) {
  const widths: number[] = [];
  let remaining = totalWidth;
  let remainingCount = count;
  const normalizedStep = stepMm && stepMm > 1 ? Math.round(stepMm) : null;

  for (let index = 0; index < count; index += 1) {
    if (index === count - 1) {
      widths.push(remaining);
      break;
    }

    const targetWidth = remaining / remainingCount;
    const snappedWidth = normalizedStep
      ? Math.round(targetWidth / normalizedStep) * normalizedStep
      : Math.round(targetWidth);
    const minRemaining = 100 * (remainingCount - 1);
    const nextWidth = Math.max(100, Math.min(remaining - minRemaining, snappedWidth));
    widths.push(nextWidth);
    remaining -= nextWidth;
    remainingCount -= 1;
  }

  if (widths[widths.length - 1] < 100) {
    return null;
  }

  return widths;
}

function distributeArrayHeights(totalHeight: number, count: number, stepMm?: number) {
  const heights: number[] = [];
  let remaining = totalHeight;
  let remainingCount = count;
  const normalizedStep = stepMm && stepMm > 1 ? Math.round(stepMm) : null;

  for (let index = 0; index < count; index += 1) {
    if (index === count - 1) {
      heights.push(remaining);
      break;
    }

    const targetHeight = remaining / remainingCount;
    const snappedHeight = normalizedStep
      ? Math.round(targetHeight / normalizedStep) * normalizedStep
      : Math.round(targetHeight);
    const minRemaining = 150 * (remainingCount - 1);
    const nextHeight = Math.max(150, Math.min(remaining - minRemaining, snappedHeight));
    heights.push(nextHeight);
    remaining -= nextHeight;
    remainingCount -= 1;
  }

  if (heights[heights.length - 1] < 150) {
    return null;
  }

  return heights;
}

function absorbRemovedPanelWidth(transom: TransomDefinition, removedIndex: number, removedWidth: number) {
  if (transom.panels.length === 0) {
    return;
  }

  const receiverIndex = Math.min(removedIndex, transom.panels.length - 1);
  transom.panels[receiverIndex] = {
    ...transom.panels[receiverIndex],
    width: transom.panels[receiverIndex].width + removedWidth
  };
}

function scalePanelWidthsToTarget(widths: number[], targetWidth: number) {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  if (totalWidth <= 0 || targetWidth < widths.length * 100) {
    return null;
  }

  let remaining = targetWidth;
  const nextWidths = widths.map((width, index) => {
    if (index === widths.length - 1) {
      return remaining;
    }
    const proportional = Math.round((width / totalWidth) * targetWidth);
    const minRemaining = 100 * (widths.length - index - 1);
    const nextWidth = Math.max(100, Math.min(remaining - minRemaining, proportional));
    remaining -= nextWidth;
    return nextWidth;
  });

  if (nextWidths.some((width) => width < 100)) {
    return null;
  }

  return nextWidths;
}

function resolveRepeatedSpan(sourceSpan: number, availableSpan: number, count: number, minSpan: number, stepMm?: number) {
  const nextCount = Math.max(1, Math.round(count));
  const limitPerCopy = Math.floor(availableSpan / nextCount);
  if (limitPerCopy < minSpan) {
    return null;
  }

  const normalizedStep = stepMm && stepMm > 1 ? Math.round(stepMm) : null;
  let perCopy = Math.min(sourceSpan, limitPerCopy);

  if (normalizedStep) {
    perCopy = Math.floor(perCopy / normalizedStep) * normalizedStep;
  }

  perCopy = Math.max(minSpan, perCopy);
  while (perCopy * nextCount > availableSpan && perCopy > minSpan) {
    perCopy -= normalizedStep ?? 1;
  }

  if (perCopy < minSpan || perCopy * nextCount > availableSpan) {
    return null;
  }

  return perCopy;
}

function resolveSinglePlacementSpan(sourceSpan: number, targetSpan: number, minSpan: number) {
  const availableSpan = targetSpan - minSpan;
  if (availableSpan < minSpan) {
    return null;
  }

  return Math.max(minSpan, Math.min(sourceSpan, availableSpan));
}

function getContiguousGroupInfo(transom: TransomDefinition, panels: PanelRef[]) {
  const refs = panels.filter((item) => item.transomId === transom.id);
  if (!refs.length) {
    return null;
  }

  const indexes = refs
    .map((item) => transom.panels.findIndex((panel) => panel.id === item.panelId))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  if (!indexes.length) {
    return null;
  }

  const minIndex = indexes[0];
  const maxIndex = indexes[indexes.length - 1];
  if (maxIndex - minIndex + 1 !== indexes.length) {
    return null;
  }

  return {
    startIndex: minIndex,
    endIndex: maxIndex,
    panels: transom.panels.slice(minIndex, maxIndex + 1)
  };
}

function buildOffsetPanelPattern(panel: PanelDefinition, stepMm: number, count?: number) {
  const magnitude = Math.abs(Math.round(stepMm));
  if (magnitude < 100) {
    return null;
  }

  const targetCuts = Math.max(1, Math.min(8, Math.round(count ?? 1)));
  const offsets: number[] = [];

  for (let index = 1; index <= targetCuts; index += 1) {
    const position = magnitude * index;
    if (panel.width - position < 100) {
      break;
    }
    offsets.push(position);
  }

  if (!offsets.length) {
    return null;
  }

  const anchorToStart = stepMm > 0;
  const widths = anchorToStart
    ? [...offsets.map((value, index) => value - (offsets[index - 1] ?? 0)), panel.width - offsets[offsets.length - 1]]
    : [panel.width - offsets[offsets.length - 1], ...offsets.map((value, index) => value - (offsets[index - 1] ?? 0)).reverse()];

  return widths.map((width, index) => {
    const keepOriginal = anchorToStart ? index === 0 : index === widths.length - 1;
    return {
      ...panel,
      id: keepOriginal ? `${panel.id}-base` : `${panel.id}-offset-${Date.now()}-${index + 1}`,
      width,
      label: keepOriginal ? panel.label : "Sabit",
      openingType: keepOriginal ? panel.openingType : "fixed"
    };
  });
}

function buildOffsetTransomPattern(transom: TransomDefinition, stepMm: number, count?: number) {
  const magnitude = Math.abs(Math.round(stepMm));
  if (magnitude < 150) {
    return null;
  }

  const targetCuts = Math.max(1, Math.min(6, Math.round(count ?? 1)));
  const offsets: number[] = [];

  for (let index = 1; index <= targetCuts; index += 1) {
    const position = magnitude * index;
    if (transom.height - position < 150) {
      break;
    }
    offsets.push(position);
  }

  if (!offsets.length) {
    return null;
  }

  const anchorToTop = stepMm > 0;
  const heights = anchorToTop
    ? [...offsets.map((value, index) => value - (offsets[index - 1] ?? 0)), transom.height - offsets[offsets.length - 1]]
    : [transom.height - offsets[offsets.length - 1], ...offsets.map((value, index) => value - (offsets[index - 1] ?? 0)).reverse()];

  return heights.map((height, index) => {
    const keepOriginal = anchorToTop ? index === 0 : index === heights.length - 1;
    return {
      ...transom,
      id: keepOriginal ? `${transom.id}-base` : `${transom.id}-offset-${Date.now()}-${index + 1}`,
      height,
      panels: transom.panels.map((panel, panelIndex) => ({
        ...panel,
        id: `${panel.id}-${keepOriginal ? "base" : `offset-${index + 1}`}-${panelIndex + 1}`,
        label: keepOriginal ? panel.label : "Sabit",
        openingType: keepOriginal ? panel.openingType : "fixed"
      }))
    };
  });
}

function buildOffsetPanelGroupPattern(group: { panels: PanelDefinition[] }, stepMm: number, count?: number) {
  const magnitude = Math.abs(Math.round(stepMm));
  const sourceWidth = group.panels.reduce((sum, panel) => sum + panel.width, 0);
  const minimumSegment = group.panels.length * 100;
  if (magnitude < minimumSegment) {
    return null;
  }

  const targetCuts = Math.max(1, Math.min(8, Math.round(count ?? 1)));
  const offsets: number[] = [];

  for (let index = 1; index <= targetCuts; index += 1) {
    const position = magnitude * index;
    if (sourceWidth - position < minimumSegment) {
      break;
    }
    offsets.push(position);
  }

  if (!offsets.length) {
    return null;
  }

  const anchorToStart = stepMm > 0;
  const segmentWidths = anchorToStart
    ? [...offsets.map((value, index) => value - (offsets[index - 1] ?? 0)), sourceWidth - offsets[offsets.length - 1]]
    : [sourceWidth - offsets[offsets.length - 1], ...offsets.map((value, index) => value - (offsets[index - 1] ?? 0)).reverse()];

  const scaledGroups = segmentWidths.map((segmentWidth) =>
    scalePanelWidthsToTarget(
      group.panels.map((panel) => panel.width),
      segmentWidth
    )
  );

  if (scaledGroups.some((item) => !item)) {
    return null;
  }

  return segmentWidths.map((_, segmentIndex) => {
    const scaledWidths = scaledGroups[segmentIndex]!;
    return group.panels.map((panel, panelIndex) => ({
      ...panel,
      id: `${panel.id}-group-offset-${Date.now()}-${segmentIndex + 1}-${panelIndex + 1}`,
      width: scaledWidths[panelIndex],
      label: segmentWidths.length > 1 ? `${panel.label} ${segmentIndex + 1}` : panel.label
    }));
  }).flat();
}

function mirrorOpeningType(openingType: OpeningType): OpeningType {
  if (openingType === "turn-right") {
    return "turn-left";
  }
  if (openingType === "turn-left") {
    return "turn-right";
  }
  return openingType;
}

function initialSelected(design: PvcDesign): SelectionState | null {
  const transom = design.transoms[0];
  const panel = transom?.panels[0];
  return transom && panel ? { transomId: transom.id, panelId: panel.id } : null;
}

export const useDesignerStore = create<DesignerState>((set) => ({
  design: cloneDesign(sampleDesign),
  selected: {
    transomId: sampleDesign.transoms[1].id,
    panelId: sampleDesign.transoms[1].panels[1].id
  },
  activeProjectPath: undefined,
  history: [],
  future: [],

  setTotalWidth: (width) =>
    set((state) =>
      withHistory(state, (draft) => {
        const nextWidth = clampPositive(width, draft.design.totalWidth);
        draft.design.totalWidth = nextWidth;
        draft.design.transoms = draft.design.transoms.map((transom) => ({
          ...transom,
          panels: normalizePanelWidths(transom.panels, nextWidth)
        }));
      })
    ),

  setTotalHeight: (height) =>
    set((state) =>
      withHistory(state, (draft) => {
        const nextHeight = clampPositive(height, draft.design.totalHeight);
        const totalCurrent = draft.design.transoms.reduce((sum, item) => sum + item.height, 0);
        const ratio = nextHeight / totalCurrent;
        draft.design.totalHeight = nextHeight;
        draft.design.transoms = normalizeTransomHeights(
          draft.design.transoms.map((transom) => ({
            ...transom,
            height: Math.max(150, Math.round(transom.height * ratio))
          })),
          nextHeight
        );
      })
    ),

  setOuterFrameThickness: (value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.outerFrameThickness = clampPositive(value, draft.design.outerFrameThickness);
      })
    ),

  setMullionThickness: (value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.mullionThickness = clampPositive(value, draft.design.mullionThickness);
      })
    ),

  selectPanel: (transomId, panelId) => set({ selected: { transomId, panelId } }),

  setDesignName: (name) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.name = name;
      })
    ),

  loadTemplate: (templateId) =>
    set((state) => {
      const template = designTemplates.find((item) => item.id === templateId) ?? sampleDesign;
      const design = cloneDesign(template);
      return {
        design,
        selected: initialSelected(design),
        activeProjectPath: undefined,
        history: [...state.history, snapshot(state)].slice(-50),
        future: []
      };
    }),

  replaceDesign: (designInput, activeProjectPath) =>
    set((state) => {
      const design = cloneDesign(designInput);
      return {
        design,
        selected: initialSelected(design),
        activeProjectPath,
        history: [...state.history, snapshot(state)].slice(-50),
        future: []
      };
    }),

  setFrameColor: (value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.materials.frameColor = value;
      })
    ),

  setGlassType: (value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.materials.glassType = value;
      })
    ),

  setProfileSeries: (value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.materials.profileSeries = value;
      })
    ),

  setMaterialSystem: (value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.materials.materialSystem = value;
      })
    ),

  setHardwareQuality: (value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.materials.hardwareQuality = value;
      })
    ),

  setCustomerField: (field, value) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.customer[field] = value;
      })
    ),

  setPanelWidthById: (transomId, panelId, width) =>
    set((state) =>
      withHistory(state, (draft) => {
        updatePanelWidth(draft.design, transomId, panelId, width);
      })
    ),

  setTransomHeightById: (transomId, height) =>
    set((state) =>
      withHistory(state, (draft) => {
        updateTransomHeight(draft.design, transomId, height);
      })
    ),

  setSelectedOpeningType: (openingType) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        draft.design.transoms = draft.design.transoms.map((transom) => ({
          ...transom,
          panels: transom.panels.map((panel) =>
            transom.id === draft.selected?.transomId && panel.id === draft.selected.panelId
              ? { ...panel, openingType }
              : panel
          )
        }));
      })
    ),

  setSelectedPanelWidth: (width) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        updatePanelWidth(draft.design, draft.selected.transomId, draft.selected.panelId, width);
      })
    ),

  setSelectedTransomHeight: (height) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        updateTransomHeight(draft.design, draft.selected.transomId, height);
      })
    ),

  splitSelectedPanelVertical: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!transom) {
          return;
        }
        const panelIndex = transom.panels.findIndex((item) => item.id === draft.selected?.panelId);
        if (panelIndex === -1) {
          return;
        }
        const panel = transom.panels[panelIndex];
        if (panel.width < 220) {
          return;
        }
        const leftWidth = Math.round(panel.width / 2);
        const rightWidth = panel.width - leftWidth;
        const leftPanel: PanelDefinition = { ...panel, id: `${panel.id}-a`, width: leftWidth, label: "Sabit" };
        const rightPanel: PanelDefinition = { ...panel, id: `${panel.id}-b`, width: rightWidth, label: "Sabit" };
        transom.panels.splice(panelIndex, 1, leftPanel, rightPanel);
        draft.selected = { transomId: transom.id, panelId: leftPanel.id };
      })
    ),

  splitSelectedTransomHorizontal: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex === -1) {
          return;
        }
        const selectedTransom = draft.design.transoms[transomIndex];
        if (selectedTransom.height < 320) {
          return;
        }
        const topHeight = Math.round(selectedTransom.height / 2);
        const bottomHeight = selectedTransom.height - topHeight;
        const nextTop: TransomDefinition = {
          ...selectedTransom,
          id: `${selectedTransom.id}-top`,
          height: topHeight,
          panels: selectedTransom.panels.map((panel) => ({
            ...panel,
            id: `${panel.id}-t`,
            label: "Sabit",
            openingType: "fixed"
          }))
        };
        const nextBottom: TransomDefinition = {
          ...selectedTransom,
          id: `${selectedTransom.id}-bottom`,
          height: bottomHeight,
          panels: selectedTransom.panels.map((panel) => ({ ...panel, id: `${panel.id}-b` }))
        };
        draft.design.transoms.splice(transomIndex, 1, nextTop, nextBottom);
        draft.selected = { transomId: nextBottom.id, panelId: nextBottom.panels[0].id };
      })
    ),

  deleteSelectedPanel: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!transom || transom.panels.length <= 1) {
          return;
        }
        const panelIndex = transom.panels.findIndex((item) => item.id === draft.selected?.panelId);
        if (panelIndex === -1) {
          return;
        }
        const removedWidth = transom.panels[panelIndex].width;
        const targetIndex = panelIndex > 0 ? panelIndex - 1 : 1;
        transom.panels = transom.panels.filter((item) => item.id !== draft.selected?.panelId);
        transom.panels[targetIndex] = {
          ...transom.panels[targetIndex],
          width: transom.panels[targetIndex].width + removedWidth
        };
        draft.selected = { transomId: transom.id, panelId: transom.panels[Math.max(0, Math.min(targetIndex, transom.panels.length - 1))].id };
      })
    ),

  deleteSelectedTransom: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected || draft.design.transoms.length <= 1) {
          return;
        }
        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex === -1) {
          return;
        }
        const removedHeight = draft.design.transoms[transomIndex].height;
        const targetIndex = transomIndex > 0 ? transomIndex - 1 : 1;
        draft.design.transoms.splice(transomIndex, 1);
        draft.design.transoms[targetIndex].height += removedHeight;
        draft.selected = {
          transomId: draft.design.transoms[targetIndex].id,
          panelId: draft.design.transoms[targetIndex].panels[0].id
        };
      })
    ),

  insertPanelAdjacent: (side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!transom) {
          return;
        }
        const panelIndex = transom.panels.findIndex((item) => item.id === draft.selected?.panelId);
        if (panelIndex === -1) {
          return;
        }
        const sourcePanel = transom.panels[panelIndex];
        if (sourcePanel.width < 220) {
          return;
        }
        const newWidth = Math.max(100, Math.round(sourcePanel.width / 2));
        const newPanel: PanelDefinition = {
          ...sourcePanel,
          id: `${sourcePanel.id}-${side}-${Date.now()}`,
          width: newWidth,
          label: "Sabit",
          openingType: "fixed"
        };
        transom.panels[panelIndex] = { ...sourcePanel, width: sourcePanel.width - newWidth };
        const insertIndex = side === "left" ? panelIndex : panelIndex + 1;
        transom.panels.splice(insertIndex, 0, newPanel);
        draft.selected = { transomId: transom.id, panelId: newPanel.id };
      })
    ),

  insertTransomAdjacent: (side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex === -1) {
          return;
        }
        const sourceTransom = draft.design.transoms[transomIndex];
        if (sourceTransom.height < 320) {
          return;
        }
        const newHeight = Math.max(150, Math.round(sourceTransom.height / 2));
        const newTransom: TransomDefinition = {
          ...sourceTransom,
          id: `${sourceTransom.id}-${side}-${Date.now()}`,
          height: newHeight,
          panels: sourceTransom.panels.map((panel) => ({
            ...panel,
            id: `${panel.id}-${side}-${Date.now()}`,
            label: "Sabit",
            openingType: "fixed"
          }))
        };
        draft.design.transoms[transomIndex] = { ...sourceTransom, height: sourceTransom.height - newHeight };
        const insertIndex = side === "top" ? transomIndex : transomIndex + 1;
        draft.design.transoms.splice(insertIndex, 0, newTransom);
        draft.selected = { transomId: newTransom.id, panelId: newTransom.panels[0].id };
      })
    ),

  copySelectedPanelToTarget: (targetTransomId, targetPanelId, side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const sourceTransom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        const sourcePanel = sourceTransom?.panels.find((item) => item.id === draft.selected?.panelId);
        const targetTransom = draft.design.transoms.find((item) => item.id === targetTransomId);
        if (!sourcePanel || !targetTransom) {
          return;
        }

        const targetPanelIndex = targetTransom.panels.findIndex((item) => item.id === targetPanelId);
        if (targetPanelIndex === -1) {
          return;
        }

        const targetPanel = targetTransom.panels[targetPanelIndex];
        const newWidth = resolveSinglePlacementSpan(sourcePanel.width, targetPanel.width, 100);
        if (!newWidth) {
          return;
        }
        const nextTargetPanel = { ...targetPanel, width: targetPanel.width - newWidth };
        const newPanel: PanelDefinition = {
          ...sourcePanel,
          id: `${sourcePanel.id}-copy-${side}-${Date.now()}`,
          width: newWidth
        };

        targetTransom.panels[targetPanelIndex] = nextTargetPanel;
        const insertIndex = side === "left" ? targetPanelIndex : targetPanelIndex + 1;
        targetTransom.panels.splice(insertIndex, 0, newPanel);
        draft.selected = { transomId: targetTransom.id, panelId: newPanel.id };
      })
    ),

  copySelectedPanelRepeatedToTarget: (targetTransomId, targetPanelId, side, count, stepMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const nextCount = Math.max(2, Math.min(8, Math.round(count)));
        const sourceTransom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        const sourcePanel = sourceTransom?.panels.find((item) => item.id === draft.selected?.panelId);
        const targetTransom = draft.design.transoms.find((item) => item.id === targetTransomId);
        if (!sourcePanel || !targetTransom) {
          return;
        }

        const targetPanelIndex = targetTransom.panels.findIndex((item) => item.id === targetPanelId);
        if (targetPanelIndex === -1) {
          return;
        }

        const targetPanel = targetTransom.panels[targetPanelIndex];
        const availableWidth = targetPanel.width - 100;
        const perCopyWidth = resolveRepeatedSpan(sourcePanel.width, availableWidth, nextCount, 100, stepMm);
        if (!perCopyWidth) {
          return;
        }

        const clonedPanels = Array.from({ length: nextCount }, (_, index) => ({
          ...sourcePanel,
          id: `${sourcePanel.id}-copy-${side}-${Date.now()}-${index + 1}`,
          width: perCopyWidth,
          label: nextCount > 1 ? `${sourcePanel.label} ${index + 1}` : sourcePanel.label
        }));

        targetTransom.panels[targetPanelIndex] = {
          ...targetPanel,
          width: targetPanel.width - perCopyWidth * nextCount
        };
        const insertIndex = side === "left" ? targetPanelIndex : targetPanelIndex + 1;
        targetTransom.panels.splice(insertIndex, 0, ...clonedPanels);
        draft.selected = { transomId: targetTransom.id, panelId: clonedPanels[0].id };
      })
    ),

  copySelectedTransomToTarget: (targetTransomId, side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const sourceTransom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        const targetTransomIndex = draft.design.transoms.findIndex((item) => item.id === targetTransomId);
        if (!sourceTransom || targetTransomIndex === -1) {
          return;
        }

        const targetTransom = draft.design.transoms[targetTransomIndex];
        const newHeight = resolveSinglePlacementSpan(sourceTransom.height, targetTransom.height, 150);
        if (!newHeight) {
          return;
        }
        const newTransom: TransomDefinition = {
          ...sourceTransom,
          id: `${sourceTransom.id}-copy-${side}-${Date.now()}`,
          height: newHeight,
          panels: sourceTransom.panels.map((panel) => ({
            ...panel,
            id: `${panel.id}-copy-${side}-${Date.now()}`
          }))
        };

        draft.design.transoms[targetTransomIndex] = {
          ...targetTransom,
          height: targetTransom.height - newHeight
        };
        const insertIndex = side === "top" ? targetTransomIndex : targetTransomIndex + 1;
        draft.design.transoms.splice(insertIndex, 0, newTransom);
        draft.selected = { transomId: newTransom.id, panelId: newTransom.panels[0].id };
      })
    ),

  copySelectedTransomRepeatedToTarget: (targetTransomId, side, count, stepMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const nextCount = Math.max(2, Math.min(6, Math.round(count)));
        const sourceTransom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        const targetTransomIndex = draft.design.transoms.findIndex((item) => item.id === targetTransomId);
        if (!sourceTransom || targetTransomIndex === -1) {
          return;
        }

        const targetTransom = draft.design.transoms[targetTransomIndex];
        const availableHeight = targetTransom.height - 150;
        const perCopyHeight = resolveRepeatedSpan(sourceTransom.height, availableHeight, nextCount, 150, stepMm);
        if (!perCopyHeight) {
          return;
        }

        const clones = Array.from({ length: nextCount }, (_, index) => ({
          ...sourceTransom,
          id: `${sourceTransom.id}-copy-${side}-${Date.now()}-${index + 1}`,
          height: perCopyHeight,
          panels: sourceTransom.panels.map((panel) => ({
            ...panel,
            id: `${panel.id}-copy-${side}-${Date.now()}-${index + 1}`,
            label: nextCount > 1 ? `${panel.label} ${index + 1}` : panel.label
          }))
        }));

        draft.design.transoms[targetTransomIndex] = {
          ...targetTransom,
          height: targetTransom.height - perCopyHeight * nextCount
        };
        const insertIndex = side === "top" ? targetTransomIndex : targetTransomIndex + 1;
        draft.design.transoms.splice(insertIndex, 0, ...clones);
        draft.selected = { transomId: clones[0].id, panelId: clones[0].panels[0].id };
      })
    ),

  moveSelectedPanelToTarget: (targetTransomId, targetPanelId, side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const sourceTransom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        const sourceIndex = sourceTransom?.panels.findIndex((item) => item.id === draft.selected?.panelId) ?? -1;
        const targetTransom = draft.design.transoms.find((item) => item.id === targetTransomId);
        if (!sourceTransom || !targetTransom || sourceIndex === -1) {
          return;
        }

        if (sourceTransom.id === targetTransomId) {
          if (sourceTransom.panels.length < 2) {
            return;
          }

          const targetIndex = sourceTransom.panels.findIndex((item) => item.id === targetPanelId);
          if (targetIndex === -1 || sourceIndex === targetIndex) {
            return;
          }

          const [movedPanel] = sourceTransom.panels.splice(sourceIndex, 1);
          const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
          const insertIndex = side === "left" ? adjustedTargetIndex : adjustedTargetIndex + 1;
          sourceTransom.panels.splice(insertIndex, 0, movedPanel);
          draft.selected = { transomId: sourceTransom.id, panelId: movedPanel.id };
          return;
        }

        if (sourceTransom.panels.length <= 1) {
          return;
        }

        const targetIndex = targetTransom.panels.findIndex((item) => item.id === targetPanelId);
        if (targetIndex === -1) {
          return;
        }

        const targetPanel = targetTransom.panels[targetIndex];
        const sourcePanel = sourceTransom.panels[sourceIndex];
        if (!sourcePanel) {
          return;
        }
        const newWidth = resolveSinglePlacementSpan(sourcePanel.width, targetPanel.width, 100);
        if (!newWidth) {
          return;
        }

        const [movedPanel] = sourceTransom.panels.splice(sourceIndex, 1);
        absorbRemovedPanelWidth(sourceTransom, sourceIndex, movedPanel.width);
        targetTransom.panels[targetIndex] = {
          ...targetPanel,
          width: targetPanel.width - newWidth
        };
        const placedPanel: PanelDefinition = {
          ...movedPanel,
          width: newWidth
        };
        const insertIndex = side === "left" ? targetIndex : targetIndex + 1;
        targetTransom.panels.splice(insertIndex, 0, placedPanel);
        draft.selected = { transomId: targetTransom.id, panelId: placedPanel.id };
      })
    ),

  moveSelectedTransomToTarget: (targetTransomId, side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const sourceIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        const targetIndex = draft.design.transoms.findIndex((item) => item.id === targetTransomId);
        if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
          return;
        }

        const [movedTransom] = draft.design.transoms.splice(sourceIndex, 1);
        const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        const insertIndex = side === "top" ? adjustedTargetIndex : adjustedTargetIndex + 1;
        draft.design.transoms.splice(insertIndex, 0, movedTransom);
        draft.selected = { transomId: movedTransom.id, panelId: movedTransom.panels[0].id };
      })
    ),

  copyPanelGroupToTarget: (panels, targetTransomId, targetPanelId, side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!panels.length) {
          return;
        }

        const sourceTransomId = panels[0].transomId;
        if (!panels.every((item) => item.transomId === sourceTransomId)) {
          return;
        }

        const sourceTransom = draft.design.transoms.find((item) => item.id === sourceTransomId);
        const targetTransom = draft.design.transoms.find((item) => item.id === targetTransomId);
        if (!sourceTransom || !targetTransom) {
          return;
        }

        const group = getContiguousGroupInfo(sourceTransom, panels);
        const targetPanelIndex = targetTransom.panels.findIndex((item) => item.id === targetPanelId);
        if (!group || targetPanelIndex === -1) {
          return;
        }

        const targetPanel = targetTransom.panels[targetPanelIndex];
        const availableWidth = targetPanel.width - 100;
        const scaledWidths = scalePanelWidthsToTarget(
          group.panels.map((panel) => panel.width),
          Math.min(group.panels.reduce((sum, panel) => sum + panel.width, 0), availableWidth)
        );
        if (!scaledWidths) {
          return;
        }

        const clonedPanels = group.panels.map((panel, index) => ({
          ...panel,
          id: `${panel.id}-group-copy-${side}-${Date.now()}-${index}`,
          width: scaledWidths[index]
        }));

        targetTransom.panels[targetPanelIndex] = {
          ...targetPanel,
          width: targetPanel.width - scaledWidths.reduce((sum, width) => sum + width, 0)
        };
        const insertIndex = side === "left" ? targetPanelIndex : targetPanelIndex + 1;
        targetTransom.panels.splice(insertIndex, 0, ...clonedPanels);
        draft.selected = { transomId: targetTransom.id, panelId: clonedPanels[0].id };
      })
    ),

  copyPanelGroupRepeatedToTarget: (panels, targetTransomId, targetPanelId, side, count, stepMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!panels.length) {
          return;
        }

        const nextCount = Math.max(2, Math.min(8, Math.round(count)));
        const sourceTransomId = panels[0].transomId;
        if (!panels.every((item) => item.transomId === sourceTransomId)) {
          return;
        }

        const sourceTransom = draft.design.transoms.find((item) => item.id === sourceTransomId);
        const targetTransom = draft.design.transoms.find((item) => item.id === targetTransomId);
        if (!sourceTransom || !targetTransom) {
          return;
        }

        const group = getContiguousGroupInfo(sourceTransom, panels);
        const targetPanelIndex = targetTransom.panels.findIndex((item) => item.id === targetPanelId);
        if (!group || targetPanelIndex === -1) {
          return;
        }

        const sourceWidth = group.panels.reduce((sum, panel) => sum + panel.width, 0);
        const targetPanel = targetTransom.panels[targetPanelIndex];
        const availableWidth = targetPanel.width - 100;
        const perGroupWidth = resolveRepeatedSpan(sourceWidth, availableWidth, nextCount, group.panels.length * 100, stepMm);
        if (!perGroupWidth) {
          return;
        }

        const scaledWidths = scalePanelWidthsToTarget(
          group.panels.map((panel) => panel.width),
          perGroupWidth
        );
        if (!scaledWidths) {
          return;
        }

        const clonedPanels = Array.from({ length: nextCount }, (_, copyIndex) =>
          group.panels.map((panel, panelIndex) => ({
            ...panel,
            id: `${panel.id}-group-copy-${side}-${Date.now()}-${copyIndex + 1}-${panelIndex + 1}`,
            width: scaledWidths[panelIndex],
            label: nextCount > 1 ? `${panel.label} ${copyIndex + 1}` : panel.label
          }))
        ).flat();

        targetTransom.panels[targetPanelIndex] = {
          ...targetPanel,
          width: targetPanel.width - perGroupWidth * nextCount
        };
        const insertIndex = side === "left" ? targetPanelIndex : targetPanelIndex + 1;
        targetTransom.panels.splice(insertIndex, 0, ...clonedPanels);
        draft.selected = { transomId: targetTransom.id, panelId: clonedPanels[0].id };
      })
    ),

  movePanelGroupToTarget: (panels, targetTransomId, targetPanelId, side) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!panels.length) {
          return;
        }

        const sourceTransomId = panels[0].transomId;
        if (!panels.every((item) => item.transomId === sourceTransomId)) {
          return;
        }

        const sourceTransom = draft.design.transoms.find((item) => item.id === sourceTransomId);
        const targetTransom = draft.design.transoms.find((item) => item.id === targetTransomId);
        if (!sourceTransom || !targetTransom) {
          return;
        }

        const group = getContiguousGroupInfo(sourceTransom, panels);
        const targetPanelIndex = targetTransom.panels.findIndex((item) => item.id === targetPanelId);
        if (!group || targetPanelIndex === -1) {
          return;
        }

        if (sourceTransom.id === targetTransom.id) {
          const unaffectedTargetIndex =
            targetPanelIndex > group.endIndex ? targetPanelIndex - group.panels.length + 1 : targetPanelIndex;
          if (
            unaffectedTargetIndex >= group.startIndex &&
            unaffectedTargetIndex <= group.endIndex
          ) {
            return;
          }

          const movedPanels = sourceTransom.panels.splice(group.startIndex, group.panels.length);
          const insertIndex = side === "left" ? unaffectedTargetIndex : unaffectedTargetIndex + 1;
          sourceTransom.panels.splice(insertIndex, 0, ...movedPanels);
          draft.selected = { transomId: sourceTransom.id, panelId: movedPanels[0].id };
          return;
        }

        if (group.panels.length >= sourceTransom.panels.length) {
          return;
        }

        const targetPanel = targetTransom.panels[targetPanelIndex];
        const availableWidth = targetPanel.width - 100;
        const scaledWidths = scalePanelWidthsToTarget(
          group.panels.map((panel) => panel.width),
          Math.min(group.panels.reduce((sum, panel) => sum + panel.width, 0), availableWidth)
        );
        if (!scaledWidths) {
          return;
        }

        const movedPanels = sourceTransom.panels.splice(group.startIndex, group.panels.length);
        const removedWidth = movedPanels.reduce((sum, panel) => sum + panel.width, 0);
        absorbRemovedPanelWidth(sourceTransom, group.startIndex, removedWidth);

        const placedPanels = movedPanels.map((panel, index) => ({
          ...panel,
          width: scaledWidths[index]
        }));
        targetTransom.panels[targetPanelIndex] = {
          ...targetPanel,
          width: targetPanel.width - scaledWidths.reduce((sum, width) => sum + width, 0)
        };
        const insertIndex = side === "left" ? targetPanelIndex : targetPanelIndex + 1;
        targetTransom.panels.splice(insertIndex, 0, ...placedPanels);
        draft.selected = { transomId: targetTransom.id, panelId: placedPanels[0].id };
      })
    ),

  equalizeSelectedRowPanels: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }
        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!transom || transom.panels.length < 2) {
          return;
        }
        const totalWidth = transom.panels.reduce((sum, panel) => sum + panel.width, 0);
        transom.panels = normalizePanelWidths(transom.panels, totalWidth);
      })
    ),

  equalizeAllTransomHeights: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (draft.design.transoms.length < 2) {
          return;
        }
        draft.design.transoms = normalizeTransomHeights(draft.design.transoms, draft.design.totalHeight);
      })
    ),

  applyOpeningTypeToPanels: (panels, openingType) =>
    set((state) =>
      withHistory(state, (draft) => {
        const keySet = new Set(panels.map((item) => `${item.transomId}:${item.panelId}`));
        draft.design.transoms = draft.design.transoms.map((transom) => ({
          ...transom,
          panels: transom.panels.map((panel) =>
            keySet.has(`${transom.id}:${panel.id}`) ? { ...panel, openingType } : panel
          )
        }));
      })
    ),

  equalizePanelsByRefs: (panels) =>
    set((state) =>
      withHistory(state, (draft) => {
        const groups = new Map<string, Set<string>>();
        panels.forEach((item) => {
          if (!groups.has(item.transomId)) {
            groups.set(item.transomId, new Set());
          }
          groups.get(item.transomId)?.add(item.panelId);
        });

        draft.design.transoms = draft.design.transoms.map((transom) => {
          const selectedPanelIds = groups.get(transom.id);
          if (!selectedPanelIds || selectedPanelIds.size < 2) {
            return transom;
          }

          const selectedPanels = transom.panels.filter((panel) => selectedPanelIds.has(panel.id));
          const selectedTotal = selectedPanels.reduce((sum, panel) => sum + panel.width, 0);
          const nextSelectedPanels = normalizePanelWidths(selectedPanels, selectedTotal);
          const widthMap = new Map(nextSelectedPanels.map((panel) => [panel.id, panel.width]));

          return {
            ...transom,
            panels: transom.panels.map((panel) =>
              widthMap.has(panel.id) ? { ...panel, width: widthMap.get(panel.id) ?? panel.width } : panel
            )
          };
        });
      })
    ),

  equalizeTransomsByRefs: (panels) =>
    set((state) =>
      withHistory(state, (draft) => {
        const transomIds = [...new Set(panels.map((item) => item.transomId))];
        if (transomIds.length < 2) {
          return;
        }

        const selectedTransoms = draft.design.transoms.filter((transom) => transomIds.includes(transom.id));
        const selectedTotalHeight = selectedTransoms.reduce((sum, transom) => sum + transom.height, 0);
        const balancedHeights = normalizeTransomHeights(selectedTransoms, selectedTotalHeight);
        const heightMap = new Map(balancedHeights.map((transom) => [transom.id, transom.height]));

        draft.design.transoms = draft.design.transoms.map((transom) =>
          heightMap.has(transom.id) ? { ...transom, height: heightMap.get(transom.id) ?? transom.height } : transom
        );
      })
    ),

  offsetPanelGroupPattern: (panels, stepMm, count) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!panels.length || !Number.isFinite(stepMm) || stepMm === 0) {
          return;
        }

        const sourceTransomId = panels[0].transomId;
        if (!panels.every((item) => item.transomId === sourceTransomId)) {
          return;
        }

        const transom = draft.design.transoms.find((item) => item.id === sourceTransomId);
        if (!transom) {
          return;
        }

        const group = getContiguousGroupInfo(transom, panels);
        if (!group) {
          return;
        }

        const nextPanels = buildOffsetPanelGroupPattern(group, stepMm, count);
        if (!nextPanels) {
          return;
        }

        transom.panels.splice(group.startIndex, group.panels.length, ...nextPanels);
        const anchorPanel = stepMm > 0 ? nextPanels[0] : nextPanels[nextPanels.length - group.panels.length];
        draft.selected = { transomId: transom.id, panelId: anchorPanel.id };
      })
    ),

  offsetSelectedPanelPattern: (stepMm, count) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected || !Number.isFinite(stepMm) || stepMm === 0) {
          return;
        }

        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!transom) {
          return;
        }

        const panelIndex = transom.panels.findIndex((item) => item.id === draft.selected?.panelId);
        if (panelIndex === -1) {
          return;
        }

        const panel = transom.panels[panelIndex];
        const nextPanels = buildOffsetPanelPattern(panel, stepMm, count);
        if (!nextPanels) {
          return;
        }

        transom.panels.splice(panelIndex, 1, ...nextPanels);
        const anchorPanel = stepMm > 0 ? nextPanels[0] : nextPanels[nextPanels.length - 1];
        draft.selected = { transomId: transom.id, panelId: anchorPanel.id };
      })
    ),

  offsetSelectedTransomPattern: (stepMm, count) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected || !Number.isFinite(stepMm) || stepMm === 0) {
          return;
        }

        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex === -1) {
          return;
        }

        const transom = draft.design.transoms[transomIndex];
        const nextTransoms = buildOffsetTransomPattern(transom, stepMm, count);
        if (!nextTransoms) {
          return;
        }

        draft.design.transoms.splice(transomIndex, 1, ...nextTransoms);
        const anchorTransom = stepMm > 0 ? nextTransoms[0] : nextTransoms[nextTransoms.length - 1];
        draft.selected = { transomId: anchorTransom.id, panelId: anchorTransom.panels[0].id };
      })
    ),

  shiftPanelBlockBy: (panels, deltaMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!panels.length || !Number.isFinite(deltaMm) || deltaMm === 0) {
          return;
        }

        const sourceTransomId = panels[0].transomId;
        if (!panels.every((item) => item.transomId === sourceTransomId)) {
          return;
        }

        const transom = draft.design.transoms.find((item) => item.id === sourceTransomId);
        if (!transom) {
          return;
        }

        const group = getContiguousGroupInfo(transom, panels);
        if (!group || group.startIndex <= 0 || group.endIndex >= transom.panels.length - 1) {
          return;
        }

        const leftNeighbor = transom.panels[group.startIndex - 1];
        const rightNeighbor = transom.panels[group.endIndex + 1];
        if (!leftNeighbor || !rightNeighbor) {
          return;
        }

        const maxLeftShift = leftNeighbor.width - 100;
        const maxRightShift = rightNeighbor.width - 100;
        const nextDelta = Math.max(-maxLeftShift, Math.min(maxRightShift, Math.round(deltaMm)));
        if (nextDelta === 0) {
          return;
        }

        transom.panels[group.startIndex - 1] = {
          ...leftNeighbor,
          width: leftNeighbor.width + nextDelta
        };
        transom.panels[group.endIndex + 1] = {
          ...rightNeighbor,
          width: rightNeighbor.width - nextDelta
        };

        draft.selected = {
          transomId: transom.id,
          panelId: group.panels[0].id
        };
      })
    ),

  shiftSelectedTransomBy: (deltaMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected || !Number.isFinite(deltaMm) || deltaMm === 0) {
          return;
        }

        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex <= 0 || transomIndex >= draft.design.transoms.length - 1) {
          return;
        }

        const aboveTransom = draft.design.transoms[transomIndex - 1];
        const belowTransom = draft.design.transoms[transomIndex + 1];
        if (!aboveTransom || !belowTransom) {
          return;
        }

        const maxUpShift = aboveTransom.height - 150;
        const maxDownShift = belowTransom.height - 150;
        const nextDelta = Math.max(-maxUpShift, Math.min(maxDownShift, Math.round(deltaMm)));
        if (nextDelta === 0) {
          return;
        }

        draft.design.transoms[transomIndex - 1] = {
          ...aboveTransom,
          height: aboveTransom.height + nextDelta
        };
        draft.design.transoms[transomIndex + 1] = {
          ...belowTransom,
          height: belowTransom.height - nextDelta
        };
      })
    ),

  adjustPanelBlockEdge: (panels, edge, deltaMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!panels.length || !Number.isFinite(deltaMm) || deltaMm === 0) {
          return;
        }

        const sourceTransomId = panels[0].transomId;
        if (!panels.every((item) => item.transomId === sourceTransomId)) {
          return;
        }

        const transom = draft.design.transoms.find((item) => item.id === sourceTransomId);
        if (!transom) {
          return;
        }

        const group = getContiguousGroupInfo(transom, panels);
        if (!group) {
          return;
        }

        if (edge === "left") {
          if (group.startIndex <= 0) {
            return;
          }
          const leftNeighbor = transom.panels[group.startIndex - 1];
          const firstPanel = transom.panels[group.startIndex];
          if (!leftNeighbor || !firstPanel) {
            return;
          }

          const nextDelta = Math.round(deltaMm);
          if (nextDelta > 0) {
            const amount = Math.min(nextDelta, firstPanel.width - 100);
            if (amount <= 0) {
              return;
            }
            transom.panels[group.startIndex] = { ...firstPanel, width: firstPanel.width - amount };
            transom.panels[group.startIndex - 1] = { ...leftNeighbor, width: leftNeighbor.width + amount };
          } else {
            const amount = Math.min(Math.abs(nextDelta), leftNeighbor.width - 100);
            if (amount <= 0) {
              return;
            }
            transom.panels[group.startIndex] = { ...firstPanel, width: firstPanel.width + amount };
            transom.panels[group.startIndex - 1] = { ...leftNeighbor, width: leftNeighbor.width - amount };
          }
        } else {
          if (group.endIndex >= transom.panels.length - 1) {
            return;
          }
          const rightNeighbor = transom.panels[group.endIndex + 1];
          const lastPanel = transom.panels[group.endIndex];
          if (!rightNeighbor || !lastPanel) {
            return;
          }

          const nextDelta = Math.round(deltaMm);
          if (nextDelta > 0) {
            const amount = Math.min(nextDelta, lastPanel.width - 100);
            if (amount <= 0) {
              return;
            }
            transom.panels[group.endIndex] = { ...lastPanel, width: lastPanel.width - amount };
            transom.panels[group.endIndex + 1] = { ...rightNeighbor, width: rightNeighbor.width + amount };
          } else {
            const amount = Math.min(Math.abs(nextDelta), rightNeighbor.width - 100);
            if (amount <= 0) {
              return;
            }
            transom.panels[group.endIndex] = { ...lastPanel, width: lastPanel.width + amount };
            transom.panels[group.endIndex + 1] = { ...rightNeighbor, width: rightNeighbor.width - amount };
          }
        }

        draft.selected = {
          transomId: transom.id,
          panelId: group.panels[0].id
        };
      })
    ),

  adjustSelectedTransomEdge: (edge, deltaMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected || !Number.isFinite(deltaMm) || deltaMm === 0) {
          return;
        }

        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex === -1) {
          return;
        }

        const transom = draft.design.transoms[transomIndex];
        if (!transom) {
          return;
        }

        if (edge === "top") {
          if (transomIndex <= 0) {
            return;
          }
          const aboveTransom = draft.design.transoms[transomIndex - 1];
          const nextDelta = Math.round(deltaMm);
          if (nextDelta > 0) {
            const amount = Math.min(nextDelta, transom.height - 150);
            if (amount <= 0) {
              return;
            }
            draft.design.transoms[transomIndex] = { ...transom, height: transom.height - amount };
            draft.design.transoms[transomIndex - 1] = { ...aboveTransom, height: aboveTransom.height + amount };
          } else {
            const amount = Math.min(Math.abs(nextDelta), aboveTransom.height - 150);
            if (amount <= 0) {
              return;
            }
            draft.design.transoms[transomIndex] = { ...transom, height: transom.height + amount };
            draft.design.transoms[transomIndex - 1] = { ...aboveTransom, height: aboveTransom.height - amount };
          }
        } else {
          if (transomIndex >= draft.design.transoms.length - 1) {
            return;
          }
          const belowTransom = draft.design.transoms[transomIndex + 1];
          const nextDelta = Math.round(deltaMm);
          if (nextDelta > 0) {
            const amount = Math.min(nextDelta, transom.height - 150);
            if (amount <= 0) {
              return;
            }
            draft.design.transoms[transomIndex] = { ...transom, height: transom.height - amount };
            draft.design.transoms[transomIndex + 1] = { ...belowTransom, height: belowTransom.height + amount };
          } else {
            const amount = Math.min(Math.abs(nextDelta), belowTransom.height - 150);
            if (amount <= 0) {
              return;
            }
            draft.design.transoms[transomIndex] = { ...transom, height: transom.height + amount };
            draft.design.transoms[transomIndex + 1] = { ...belowTransom, height: belowTransom.height - amount };
          }
        }
      })
    ),

  centerPanelBlock: (panels) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!panels.length) {
          return;
        }

        const sourceTransomId = panels[0].transomId;
        if (!panels.every((item) => item.transomId === sourceTransomId)) {
          return;
        }

        const transom = draft.design.transoms.find((item) => item.id === sourceTransomId);
        if (!transom) {
          return;
        }

        const group = getContiguousGroupInfo(transom, panels);
        if (!group || group.startIndex <= 0 || group.endIndex >= transom.panels.length - 1) {
          return;
        }

        const leftNeighbor = transom.panels[group.startIndex - 1];
        const rightNeighbor = transom.panels[group.endIndex + 1];
        if (!leftNeighbor || !rightNeighbor) {
          return;
        }

        const combined = leftNeighbor.width + rightNeighbor.width;
        const nextLeft = Math.max(100, Math.round(combined / 2));
        const nextRight = combined - nextLeft;
        if (nextRight < 100) {
          return;
        }

        transom.panels[group.startIndex - 1] = { ...leftNeighbor, width: nextLeft };
        transom.panels[group.endIndex + 1] = { ...rightNeighbor, width: nextRight };
        draft.selected = {
          transomId: transom.id,
          panelId: group.panels[0].id
        };
      })
    ),

  centerSelectedTransom: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex <= 0 || transomIndex >= draft.design.transoms.length - 1) {
          return;
        }

        const aboveTransom = draft.design.transoms[transomIndex - 1];
        const belowTransom = draft.design.transoms[transomIndex + 1];
        if (!aboveTransom || !belowTransom) {
          return;
        }

        const combined = aboveTransom.height + belowTransom.height;
        const nextAbove = Math.max(150, Math.round(combined / 2));
        const nextBelow = combined - nextAbove;
        if (nextBelow < 150) {
          return;
        }

        draft.design.transoms[transomIndex - 1] = { ...aboveTransom, height: nextAbove };
        draft.design.transoms[transomIndex + 1] = { ...belowTransom, height: nextBelow };
      })
    ),

  mirrorSelectedRow: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!transom || transom.panels.length < 2) {
          return;
        }

        const selectedIndex = transom.panels.findIndex((item) => item.id === draft.selected?.panelId);
        if (selectedIndex === -1) {
          return;
        }

        const nextPanels = [...transom.panels]
          .reverse()
          .map((panel, index) => ({
            ...panel,
            id: `${panel.id}-mirror-${index}`,
            openingType: mirrorOpeningType(panel.openingType)
          }));

        transom.panels = nextPanels;
        draft.selected = {
          transomId: transom.id,
          panelId: nextPanels[Math.max(0, nextPanels.length - 1 - selectedIndex)].id
        };
      })
    ),

  mirrorTransomStack: () =>
    set((state) =>
      withHistory(state, (draft) => {
        if (draft.design.transoms.length < 2) {
          return;
        }

        draft.design.transoms = [...draft.design.transoms].reverse().map((transom, index) => ({
          ...transom,
          id: `${transom.id}-stack-mirror-${index}`,
          panels: transom.panels.map((panel) => ({ ...panel }))
        }));

        if (!draft.selected) {
          return;
        }

        const mirroredTransom =
          draft.design.transoms.find((item) =>
            item.panels.some((panel) => panel.id === draft.selected?.panelId)
          ) ?? draft.design.transoms[0];

        const fallbackPanel =
          mirroredTransom.panels.find((panel) => panel.id === draft.selected?.panelId) ??
          mirroredTransom.panels[0];

        draft.selected = {
          transomId: mirroredTransom.id,
          panelId: fallbackPanel.id
        };
      })
    ),

  arraySelectedPanel: (count, stepMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const nextCount = Math.max(2, Math.min(8, Math.round(count)));
        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!transom) {
          return;
        }

        const panelIndex = transom.panels.findIndex((item) => item.id === draft.selected?.panelId);
        if (panelIndex === -1) {
          return;
        }

        const panel = transom.panels[panelIndex];
        if (panel.width / nextCount < 100) {
          return;
        }

        const widths = distributeArrayWidths(panel.width, nextCount, stepMm);
        if (!widths) {
          return;
        }

        const newPanels = Array.from({ length: nextCount }, (_, index) => {
          const width = widths[index];
          return {
            ...panel,
            id: `${panel.id}-array-${index + 1}`,
            width,
            label: index === Math.floor(nextCount / 2) ? panel.label : "Sabit",
            openingType: index === Math.floor(nextCount / 2) ? panel.openingType : "fixed"
          };
        });

        transom.panels.splice(panelIndex, 1, ...newPanels);
        draft.selected = { transomId: transom.id, panelId: newPanels[0].id };
      })
    ),

  arraySelectedTransom: (count, stepMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const nextCount = Math.max(2, Math.min(6, Math.round(count)));
        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex === -1) {
          return;
        }

        const transom = draft.design.transoms[transomIndex];
        const heights = distributeArrayHeights(transom.height, nextCount, stepMm);
        if (!heights) {
          return;
        }

        const newTransoms = heights.map((height, index) => ({
          ...transom,
          id: `${transom.id}-array-row-${index + 1}`,
          height,
          panels: transom.panels.map((panel) => ({
            ...panel,
            id: `${panel.id}-array-row-${index + 1}`,
            label: index === Math.floor(nextCount / 2) ? panel.label : "Sabit",
            openingType: index === Math.floor(nextCount / 2) ? panel.openingType : "fixed"
          }))
        }));

        draft.design.transoms.splice(transomIndex, 1, ...newTransoms);
        draft.selected = { transomId: newTransoms[0].id, panelId: newTransoms[0].panels[0].id };
      })
    ),

  arraySelectedGrid: (columns, rows, columnStepMm, rowStepMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const nextColumns = Math.max(2, Math.min(8, Math.round(columns)));
        const nextRows = Math.max(2, Math.min(6, Math.round(rows)));
        const transomIndex = draft.design.transoms.findIndex((item) => item.id === draft.selected?.transomId);
        if (transomIndex === -1) {
          return;
        }

        const transom = draft.design.transoms[transomIndex];
        const panelIndex = transom.panels.findIndex((item) => item.id === draft.selected?.panelId);
        if (panelIndex === -1) {
          return;
        }

        const panel = transom.panels[panelIndex];
        const rowHeights = distributeArrayHeights(transom.height, nextRows, rowStepMm);
        const columnWidths = distributeArrayWidths(panel.width, nextColumns, columnStepMm);
        if (!rowHeights || !columnWidths) {
          return;
        }

        const centerRowIndex = Math.floor(nextRows / 2);
        const centerColumnIndex = Math.floor(nextColumns / 2);
        const newTransoms = rowHeights.map((height, rowIndex) => {
          const nextPanels = transom.panels.flatMap((currentPanel, currentIndex) => {
            if (currentIndex !== panelIndex) {
              return [
                {
                  ...currentPanel,
                  id: `${currentPanel.id}-grid-r${rowIndex + 1}`
                }
              ];
            }

            return columnWidths.map((width, columnIndex) => ({
              ...currentPanel,
              id: `${currentPanel.id}-grid-r${rowIndex + 1}-c${columnIndex + 1}`,
              width,
              label:
                rowIndex === centerRowIndex && columnIndex === centerColumnIndex
                  ? currentPanel.label
                  : `Grid ${rowIndex + 1}.${columnIndex + 1}`,
              openingType:
                rowIndex === centerRowIndex && columnIndex === centerColumnIndex
                  ? currentPanel.openingType
                  : "fixed"
            }));
          });

          return {
            ...transom,
            id: `${transom.id}-grid-r${rowIndex + 1}`,
            height,
            panels: nextPanels
          };
        });

        draft.design.transoms.splice(transomIndex, 1, ...newTransoms);
        const selectedRow = newTransoms[centerRowIndex] ?? newTransoms[0];
        const selectedPanel =
          selectedRow.panels[panelIndex + centerColumnIndex] ??
          selectedRow.panels[panelIndex] ??
          selectedRow.panels[0];

        if (!selectedPanel) {
          return;
        }

        draft.selected = {
          transomId: selectedRow.id,
          panelId: selectedPanel.id
        };
      })
    ),

  applyPanelLibraryModule: (moduleId) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const module = panelLibraryModules.find((item) => item.id === moduleId);
        if (!module) {
          return;
        }

        draft.design.transoms = draft.design.transoms.map((transom) => ({
          ...transom,
          panels: transom.panels.map((panel) =>
            transom.id === draft.selected?.transomId && panel.id === draft.selected.panelId
              ? { ...panel, openingType: module.openingType, label: module.label }
              : panel
          )
        }));
      })
    ),

  applyRowLibraryModule: (moduleId) =>
    set((state) =>
      withHistory(state, (draft) => {
        if (!draft.selected) {
          return;
        }

        const module = rowLibraryModules.find((item) => item.id === moduleId);
        const transom = draft.design.transoms.find((item) => item.id === draft.selected?.transomId);
        if (!module || !transom) {
          return;
        }

        const totalWidth = transom.panels.reduce((sum, panel) => sum + panel.width, 0);
        const totalRatio = module.panels.reduce((sum, panel) => sum + panel.ratio, 0);
        let remaining = totalWidth;
        const nextPanels = module.panels.map((panel, index) => {
          const width =
            index === module.panels.length - 1
              ? remaining
              : Math.max(100, Math.round((totalWidth * panel.ratio) / totalRatio));
          remaining -= width;
          return {
            id: `${transom.id}-${module.id}-${index + 1}`,
            width,
            label: panel.label,
            openingType: panel.openingType
          };
        });

        transom.panels = normalizePanelWidths(nextPanels, totalWidth);
        draft.selected = { transomId: transom.id, panelId: transom.panels[0].id };
      })
    ),

  addReferenceGuide: (orientation, positionMm, label) =>
    set((state) =>
      withHistory(state, (draft) => {
        const limit = orientation === "vertical" ? draft.design.totalWidth : draft.design.totalHeight;
        const nextPosition = Math.max(0, Math.min(limit, Math.round(positionMm)));
        draft.design.guides.push({
          id: `guide-${orientation}-${Date.now()}`,
          orientation,
          positionMm: nextPosition,
          locked: false,
          label: label?.trim() || `${orientation === "vertical" ? "V" : "H"} ${nextPosition}`
        });
      })
    ),

  setGuidePosition: (guideId, positionMm) =>
    set((state) =>
      withHistory(state, (draft) => {
        const guide = draft.design.guides.find((item) => item.id === guideId);
        if (!guide || guide.locked) {
          return;
        }
        const limit = guide.orientation === "vertical" ? draft.design.totalWidth : draft.design.totalHeight;
        guide.positionMm = Math.max(0, Math.min(limit, Math.round(positionMm)));
        guide.label = `${guide.orientation === "vertical" ? "V" : "H"} ${guide.positionMm}`;
      })
    ),

  toggleGuideLock: (guideId) =>
    set((state) =>
      withHistory(state, (draft) => {
        const guide = draft.design.guides.find((item) => item.id === guideId);
        if (!guide) {
          return;
        }
        guide.locked = !guide.locked;
      })
    ),

  renameGuide: (guideId, label) =>
    set((state) =>
      withHistory(state, (draft) => {
        const guide = draft.design.guides.find((item) => item.id === guideId);
        if (!guide) {
          return;
        }
        guide.label = label.trim() || `${guide.orientation === "vertical" ? "V" : "H"} ${guide.positionMm}`;
      })
    ),

  removeGuide: (guideId) =>
    set((state) =>
      withHistory(state, (draft) => {
        draft.design.guides = draft.design.guides.filter((item) => item.id !== guideId);
      })
    ),

  undo: () =>
    set((state) => {
      const previous = state.history[state.history.length - 1];
      if (!previous) {
        return state;
      }
      return {
        design: cloneDesign(previous.design),
        selected: cloneSelection(previous.selected),
        activeProjectPath: previous.activeProjectPath,
        history: state.history.slice(0, -1),
        future: [snapshot(state), ...state.future].slice(0, 50)
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) {
        return state;
      }
      return {
        design: cloneDesign(next.design),
        selected: cloneSelection(next.selected),
        activeProjectPath: next.activeProjectPath,
        history: [...state.history, snapshot(state)].slice(-50),
        future: state.future.slice(1)
      };
    })
}));

function updatePanelWidth(design: PvcDesign, transomId: string, panelId: string, width: number) {
  const nextWidth = clampPositive(width, 100);
  design.transoms = design.transoms.map((transom) => {
    if (transom.id !== transomId) {
      return transom;
    }
    const selectedIndex = transom.panels.findIndex((panel) => panel.id === panelId);
    if (selectedIndex === -1) {
      return transom;
    }
    const currentTotal = transom.panels.reduce((sum, panel) => sum + panel.width, 0);
    const otherTotal = currentTotal - transom.panels[selectedIndex].width;
    const boundedWidth = Math.min(nextWidth, Math.max(100, currentTotal - 100 * (transom.panels.length - 1)));
    const remaining = currentTotal - boundedWidth;
    const nextPanels = transom.panels.map((panel, index) => {
      if (index === selectedIndex) {
        return { ...panel, width: boundedWidth };
      }
      if (otherTotal <= 0) {
        return panel;
      }
      const ratio = panel.width / otherTotal;
      return { ...panel, width: Math.max(100, Math.round(remaining * ratio)) };
    });
    return { ...transom, panels: normalizePanelWidths(nextPanels, currentTotal) };
  });
}

function updateTransomHeight(design: PvcDesign, transomId: string, height: number) {
  const selectedIndex = design.transoms.findIndex((transom) => transom.id === transomId);
  if (selectedIndex === -1) {
    return;
  }
  const totalHeight = design.transoms.reduce((sum, transom) => sum + transom.height, 0);
  const nextHeight = clampPositive(height, design.transoms[selectedIndex].height);
  const otherHeight = totalHeight - design.transoms[selectedIndex].height;
  const boundedHeight = Math.min(nextHeight, Math.max(150, totalHeight - 150 * (design.transoms.length - 1)));
  const remaining = totalHeight - boundedHeight;
  design.transoms = design.transoms.map((transom, index) => {
    if (index === selectedIndex) {
      return { ...transom, height: boundedHeight };
    }
    if (otherHeight <= 0) {
      return transom;
    }
    const ratio = transom.height / otherHeight;
    return { ...transom, height: Math.max(150, Math.round(remaining * ratio)) };
  });
  design.transoms = normalizeTransomHeights(design.transoms, totalHeight);
  design.totalHeight = totalHeight;
}
