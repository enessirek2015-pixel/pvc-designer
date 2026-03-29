import { create } from "zustand";
import { designTemplates, sampleDesign } from "../data/sampleDesign";
import type {
  FrameColor,
  GlassType,
  HardwareQuality,
  OpeningType,
  PanelDefinition,
  ProfileSeries,
  PvcDesign,
  TransomDefinition
} from "../types/pvc";

interface SelectionState {
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
  equalizeSelectedRowPanels: () => void;
  equalizeAllTransomHeights: () => void;
  undo: () => void;
  redo: () => void;
}

function cloneDesign(design: PvcDesign): PvcDesign {
  return {
    ...design,
    materials: { ...design.materials },
    customer: { ...design.customer },
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
