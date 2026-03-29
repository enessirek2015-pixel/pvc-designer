import { create } from "zustand";
import { designTemplates, sampleDesign } from "../data/sampleDesign";
import type { OpeningType, PanelDefinition, PvcDesign, TransomDefinition } from "../types/pvc";

interface SelectionState {
  transomId: string;
  panelId: string;
}

interface DesignerState {
  design: PvcDesign;
  selected: SelectionState | null;
  activeProjectPath?: string;
  setTotalWidth: (width: number) => void;
  setTotalHeight: (height: number) => void;
  setOuterFrameThickness: (value: number) => void;
  setMullionThickness: (value: number) => void;
  selectPanel: (transomId: string, panelId: string) => void;
  setDesignName: (name: string) => void;
  loadTemplate: (templateId: string) => void;
  replaceDesign: (design: PvcDesign, activeProjectPath?: string) => void;
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
}

function cloneDesign(design: PvcDesign): PvcDesign {
  return {
    ...design,
    transoms: design.transoms.map((transom) => ({
      ...transom,
      panels: transom.panels.map((panel) => ({ ...panel }))
    }))
  };
}

function normalizePanelWidths(panels: PanelDefinition[], totalWidth: number) {
  const panelCount = panels.length;
  const baseWidth = Math.floor(totalWidth / panelCount);
  let remaining = totalWidth;

  return panels.map((panel, index) => {
    const nextWidth = index === panelCount - 1 ? remaining : baseWidth;
    remaining -= nextWidth;

    return {
      ...panel,
      width: nextWidth
    };
  });
}

function clampPositive(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.round(value);
}

export const useDesignerStore = create<DesignerState>((set) => ({
  design: cloneDesign(sampleDesign),
  activeProjectPath: undefined,
  selected: {
    transomId: sampleDesign.transoms[1].id,
    panelId: sampleDesign.transoms[1].panels[1].id
  },

  setTotalWidth: (width) =>
    set((state) => {
      const nextWidth = clampPositive(width, state.design.totalWidth);
      const design = cloneDesign(state.design);
      design.totalWidth = nextWidth;
      design.transoms = design.transoms.map((transom) => ({
        ...transom,
        panels: normalizePanelWidths(transom.panels, nextWidth)
      }));
      return { design };
    }),

  setTotalHeight: (height) =>
    set((state) => ({
      design: {
        ...state.design,
        totalHeight: clampPositive(height, state.design.totalHeight)
      }
    })),

  setOuterFrameThickness: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        outerFrameThickness: clampPositive(value, state.design.outerFrameThickness)
      }
    })),

  setMullionThickness: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        mullionThickness: clampPositive(value, state.design.mullionThickness)
      }
    })),

  setDesignName: (name) =>
    set((state) => ({
      design: {
        ...state.design,
        name
      }
    })),

  selectPanel: (transomId, panelId) =>
    set({
      selected: {
        transomId,
        panelId
      }
    }),

  loadTemplate: (templateId) =>
    set(() => {
      const template = designTemplates.find((item) => item.id === templateId) ?? sampleDesign;
      const design = cloneDesign(template);
      return {
        design,
        activeProjectPath: undefined,
        selected: {
          transomId: design.transoms[0].id,
          panelId: design.transoms[0].panels[0].id
        }
      };
    }),

  replaceDesign: (designInput, activeProjectPath) =>
    set(() => {
      const design = cloneDesign(designInput);
      return {
        design,
        activeProjectPath,
        selected: {
          transomId: design.transoms[0]?.id ?? "",
          panelId: design.transoms[0]?.panels[0]?.id ?? ""
        }
      };
    }),

  setPanelWidthById: (transomId, panelId, width) =>
    set((state) => updatePanelWidth(state, transomId, panelId, width)),

  setTransomHeightById: (transomId, height) =>
    set((state) => updateTransomHeight(state, transomId, height)),

  setSelectedOpeningType: (openingType) =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      const design = cloneDesign(state.design);
      design.transoms = design.transoms.map((transom) => ({
        ...transom,
        panels: transom.panels.map((panel) =>
          transom.id === state.selected?.transomId && panel.id === state.selected.panelId
            ? { ...panel, openingType }
            : panel
        )
      }));

      return { design };
    }),

  setSelectedPanelWidth: (width) =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      return updatePanelWidth(state, state.selected.transomId, state.selected.panelId, width);
    }),

  setSelectedTransomHeight: (height) =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      return updateTransomHeight(state, state.selected.transomId, height);
    }),

  splitSelectedPanelVertical: () =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      const design = cloneDesign(state.design);
      design.transoms = design.transoms.map((transom) => {
        if (transom.id !== state.selected?.transomId) {
          return transom;
        }

        const panelIndex = transom.panels.findIndex((panel) => panel.id === state.selected?.panelId);
        if (panelIndex === -1) {
          return transom;
        }

        const panel = transom.panels[panelIndex];
        if (panel.width < 220) {
          return transom;
        }

        const leftWidth = Math.round(panel.width / 2);
        const rightWidth = panel.width - leftWidth;

        const leftPanel: PanelDefinition = {
          ...panel,
          id: `${panel.id}-a`,
          width: leftWidth,
          label: "Sabit"
        };

        const rightPanel: PanelDefinition = {
          ...panel,
          id: `${panel.id}-b`,
          width: rightWidth,
          label: "Sabit"
        };

        const panels = [...transom.panels];
        panels.splice(panelIndex, 1, leftPanel, rightPanel);

        return {
          ...transom,
          panels
        };
      });

      return {
        design,
        selected: {
          transomId: state.selected.transomId,
          panelId: `${state.selected.panelId}-a`
        }
      };
    }),

  splitSelectedTransomHorizontal: () =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      const design = cloneDesign(state.design);
      const transomIndex = design.transoms.findIndex((transom) => transom.id === state.selected?.transomId);
      if (transomIndex === -1) {
        return state;
      }

      const selectedTransom = design.transoms[transomIndex];
      if (selectedTransom.height < 320) {
        return state;
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
        panels: selectedTransom.panels.map((panel) => ({
          ...panel,
          id: `${panel.id}-b`
        }))
      };

      design.transoms.splice(transomIndex, 1, nextTop, nextBottom);

      return {
        design,
        selected: {
          transomId: nextBottom.id,
          panelId: nextBottom.panels[0]?.id ?? ""
        }
      };
    }),

  deleteSelectedPanel: () =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      const design = cloneDesign(state.design);
      const transom = design.transoms.find((item) => item.id === state.selected?.transomId);
      if (!transom || transom.panels.length <= 1) {
        return state;
      }

      const panelIndex = transom.panels.findIndex((item) => item.id === state.selected?.panelId);
      if (panelIndex === -1) {
        return state;
      }

      const removedWidth = transom.panels[panelIndex].width;
      const targetIndex = panelIndex > 0 ? panelIndex - 1 : 1;

      transom.panels = transom.panels.filter((item) => item.id !== state.selected?.panelId);
      transom.panels = transom.panels.map((panel, index) =>
        index === targetIndex
          ? {
              ...panel,
              width: panel.width + removedWidth
            }
          : panel
      );

      const nextSelection = transom.panels[Math.max(0, Math.min(targetIndex, transom.panels.length - 1))];

      return {
        design,
        selected: {
          transomId: transom.id,
          panelId: nextSelection.id
        }
      };
    }),

  deleteSelectedTransom: () =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      const design = cloneDesign(state.design);
      if (design.transoms.length <= 1) {
        return state;
      }

      const transomIndex = design.transoms.findIndex((item) => item.id === state.selected?.transomId);
      if (transomIndex === -1) {
        return state;
      }

      const removedHeight = design.transoms[transomIndex].height;
      const targetIndex = transomIndex > 0 ? transomIndex - 1 : 1;

      design.transoms.splice(transomIndex, 1);
      design.transoms[targetIndex].height += removedHeight;

      return {
        design,
        selected: {
          transomId: design.transoms[targetIndex].id,
          panelId: design.transoms[targetIndex].panels[0].id
        }
      };
    }),

  insertPanelAdjacent: (side) =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      const design = cloneDesign(state.design);
      const transom = design.transoms.find((item) => item.id === state.selected?.transomId);
      if (!transom) {
        return state;
      }

      const panelIndex = transom.panels.findIndex((item) => item.id === state.selected?.panelId);
      if (panelIndex === -1) {
        return state;
      }

      const sourcePanel = transom.panels[panelIndex];
      if (sourcePanel.width < 220) {
        return state;
      }

      const newWidth = Math.max(100, Math.round(sourcePanel.width / 2));
      const resizedWidth = sourcePanel.width - newWidth;
      const newPanel: PanelDefinition = {
        ...sourcePanel,
        id: `${sourcePanel.id}-${side}-${Date.now()}`,
        width: newWidth,
        label: "Sabit",
        openingType: "fixed"
      };

      transom.panels[panelIndex] = {
        ...sourcePanel,
        width: resizedWidth
      };

      const insertIndex = side === "left" ? panelIndex : panelIndex + 1;
      transom.panels.splice(insertIndex, 0, newPanel);

      return {
        design,
        selected: {
          transomId: transom.id,
          panelId: newPanel.id
        }
      };
    }),

  insertTransomAdjacent: (side) =>
    set((state) => {
      if (!state.selected) {
        return state;
      }

      const design = cloneDesign(state.design);
      const transomIndex = design.transoms.findIndex((item) => item.id === state.selected?.transomId);
      if (transomIndex === -1) {
        return state;
      }

      const sourceTransom = design.transoms[transomIndex];
      if (sourceTransom.height < 320) {
        return state;
      }

      const newHeight = Math.max(150, Math.round(sourceTransom.height / 2));
      const resizedHeight = sourceTransom.height - newHeight;
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

      design.transoms[transomIndex] = {
        ...sourceTransom,
        height: resizedHeight
      };

      const insertIndex = side === "top" ? transomIndex : transomIndex + 1;
      design.transoms.splice(insertIndex, 0, newTransom);

      return {
        design,
        selected: {
          transomId: newTransom.id,
          panelId: newTransom.panels[0].id
        }
      };
    })
}));

function normalizeTransomHeights(transoms: TransomDefinition[], totalHeight: number) {
  const rowCount = transoms.length;
  const normalized: TransomDefinition[] = [];
  let remaining = totalHeight;

  transoms.forEach((transom, index) => {
    const nextHeight = index === rowCount - 1 ? remaining : transom.height;
    remaining -= nextHeight;
    normalized.push({
      ...transom,
      height: nextHeight
    });
  });

  return normalized;
}

function updatePanelWidth(
  state: Pick<DesignerState, "design" | "selected">,
  transomId: string,
  panelId: string,
  width: number
) {
  const nextWidth = clampPositive(width, 100);
  const design = cloneDesign(state.design);
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
      return {
        ...panel,
        width: Math.max(100, Math.round(remaining * ratio))
      };
    });

    return {
      ...transom,
      panels: normalizePanelWidths(nextPanels, currentTotal)
    };
  });

  return { design };
}

function updateTransomHeight(
  state: Pick<DesignerState, "design" | "selected">,
  transomId: string,
  height: number
) {
  const design = cloneDesign(state.design);
  const selectedIndex = design.transoms.findIndex((transom) => transom.id === transomId);
  if (selectedIndex === -1) {
    return state;
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
    return {
      ...transom,
      height: Math.max(150, Math.round(remaining * ratio))
    };
  });

  design.transoms = normalizeTransomHeights(design.transoms, totalHeight);
  design.totalHeight = totalHeight;

  return { design };
}
