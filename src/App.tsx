import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { panelLibraryModules, rowLibraryModules } from "./data/moduleLibrary";
import { createBlankDesign, designTemplates } from "./data/sampleDesign";
import {
  buildCanvasLayout,
  getCanvasHorizontalBarLayout,
  getCanvasMullionLayout,
  getCanvasPanelLayout,
  getCanvasRowLayout,
  type CanvasLayout
} from "./lib/canvasLayout";
import { buildDesignHealth, buildDesignSnapshot, buildPanelEngineering } from "./lib/designEngine";
import { buildManufacturingHtml, buildManufacturingReport } from "./lib/manufacturingEngine";
import { profileGeometryCatalog } from "./lib/profileGeometryCatalog";
import { buildTechnicalPrintHtml } from "./lib/technicalPrint";
import type { DesignDiagnostic } from "./lib/designEngine";
import { buildProfileLayout } from "./lib/profileLayout";
import { glassCatalog, hardwareCatalog, materialSystemCatalog, profileSeriesCatalog } from "./lib/systemCatalog";
import { useDesignerStore } from "./store/useDesignerStore";
import type { PanelRef } from "./store/useDesignerStore";
import type {
  FrameColor,
  GlassType,
  GuideOrientation,
  HardwareQuality,
  MaterialSystem,
  OpeningType,
  PanelDefinition,
  ProfileSeries,
  PvcDesign
} from "./types/pvc";

const openingTypeOptions: Array<{ value: OpeningType; label: string; hint: string }> = [
  { value: "fixed", label: "Sabit", hint: "Acilmayan cam panel" },
  { value: "turn-right", label: "Sag Acilim", hint: "Sagdan menteeseli kanat" },
  { value: "turn-left", label: "Sol Acilim", hint: "Soldan menteeseli kanat" },
  { value: "tilt-turn-right", label: "Vasistas + Sag", hint: "Ustten vasistas, saga acilim" },
  { value: "sliding", label: "Surme", hint: "Yatay kayar kanat" }
];

const frameColorOptions: Array<{ value: FrameColor; label: string; color: string }> = [
  { value: "white", label: "Beyaz", color: "#f4f5f6" },
  { value: "cream", label: "Krem", color: "#f2e2ba" },
  { value: "anthracite", label: "Antrasit", color: "#5a616a" },
  { value: "black", label: "Siyah", color: "#23262b" },
  { value: "golden-oak", label: "Golden Oak", color: "#b97a42" },
  { value: "walnut", label: "Ceviz", color: "#80563c" },
  { value: "mahogany", label: "Maun", color: "#844131" },
  { value: "silver", label: "Gumus", color: "#b6bcc5" }
];

const glassTypeOptions: Array<{ value: GlassType; label: string }> = [
  { value: "single-clear", label: "Tek Cam Clear" },
  { value: "double-clear", label: "Cift Cam Clear" },
  { value: "triple-clear", label: "Uc Cam Clear" },
  { value: "double-low-e", label: "Cift Cam Low-E" },
  { value: "triple-low-e", label: "Uc Cam Low-E" },
  { value: "tempered-clear", label: "Temperli" },
  { value: "laminated-clear", label: "Lamine" },
  { value: "reflective-blue", label: "Reflekte Mavi" },
  { value: "reflective-smoke", label: "Reflekte Fume" },
  { value: "frosted", label: "Buzlu" }
];

const profileSeriesOptions: Array<{ value: ProfileSeries; label: string }> = [
  { value: "standard-58", label: "Standard 58" },
  { value: "comfort-70", label: "Comfort 70" },
  { value: "premium-76", label: "Premium 76" },
  { value: "elite-82", label: "Elite 82" },
  { value: "veka-softline", label: "VEKA Softline" },
  { value: "rehau-synego", label: "REHAU Synego" }
];

const materialSystemOptions: Array<{ value: MaterialSystem; label: string }> = [
  { value: "aldoks", label: "Aldoks" },
  { value: "c60", label: "C60" },
  { value: "thermal-insulation", label: "Isi Yalitimi" },
  { value: "sliding-system", label: "Surme Sistem" },
  { value: "system-series", label: "Sistem Serisi" }
];

const hardwareOptions: Array<{ value: HardwareQuality; label: string }> = [
  { value: "economy", label: "Ekonomi" },
  { value: "standard", label: "Standart" },
  { value: "premium", label: "Premium" }
];

const sashOverlayActions: Array<{ value: OpeningType; label: string }> = [
  { value: "fixed", label: "Sabit" },
  { value: "turn-right", label: "Sag" },
  { value: "turn-left", label: "Sol" },
  { value: "tilt-turn-right", label: "Vasistas" },
  { value: "sliding", label: "Surme" }
];

const glassOverlayActions: Array<{ value: GlassType; label: string }> = [
  { value: "double-clear", label: "Cift" },
  { value: "double-low-e", label: "Low-E" },
  { value: "tempered-clear", label: "Temper" },
  { value: "frosted", label: "Buzlu" }
];

const CUSTOM_TEMPLATE_STORAGE_KEY = "pvc-designer.custom-templates.v2";
type ToolMode =
  | "select"
  | "split-vertical"
  | "split-horizontal"
  | "add-left"
  | "add-right"
  | "add-top"
  | "add-bottom"
  | "guide-vertical"
  | "guide-horizontal"
  | "delete-panel";

type VisibleLayers = {
  rulers: boolean;
  dimensions: boolean;
  guides: boolean;
  hud: boolean;
  profiles: boolean;
  glass: boolean;
  hardware: boolean;
  notes: boolean;
};

type OsnapModes = {
  endpoint: boolean;
  midpoint: boolean;
  center: boolean;
  intersection: boolean;
};

type OsnapCandidate = {
  point: { x: number; y: number };
  label: "END" | "MID" | "CEN" | "INT";
  detail: string;
  priority: number;
};

type CommandPreview =
  | { type: "mirror"; axis: "vertical" | "horizontal" | "pick" }
  | { type: "guide-align"; mode: "panel" | "row"; position: "start" | "end" | "center" }
  | { type: "align"; mode: "panel" | "row"; position: "start" | "end" | "center" }
  | { type: "distribute"; mode: "panel" | "row"; label: "Distribute" | "Match" }
  | { type: "array"; count: number; stepMm?: number; mode: "panel" | "row" }
  | { type: "grid-array"; columns: number; rows: number; columnStepMm?: number; rowStepMm?: number }
  | { type: "offset-pattern"; delta: number; count: number; mode: "panel" | "row" }
  | { type: "edge-adjust"; operation: "trim" | "extend"; edge: "left" | "right" | "top" | "bottom"; delta: number; mode: "panel" | "row" }
  | { type: "center"; mode: "panel" | "row" }
  | { type: "copy-series"; count: number; stepMm?: number; mode: "panel" | "row" }
  | { type: "move-displace"; delta: number; mode: "panel" | "row" }
  | { type: "offset-chain"; delta: number; count: number }
  | { type: "offset"; delta: number }
  | { type: "copy-panel"; side: "left" | "right" }
  | { type: "copy-row"; side: "top" | "bottom" }
  | { type: "move"; mode: "panel" | "row" };

type InteractivePlacement =
  | {
      type: "copy" | "move";
      mode: "panel" | "row";
      phase: "base" | "target";
      basePoint?: { x: number; y: number };
      repeatCount?: number;
      stepMm?: number;
      axisLock?: "x" | "y" | null;
      lockedDistanceMm?: number | null;
      lockedVectorMm?: { dxMm: number; dyMm: number } | null;
    }
  | {
      type: "mirror";
      phase: "axis";
      basePoint?: { x: number; y: number };
    }
  | {
      type: "offset";
      delta: number;
      count?: number;
    }
  | null;

type InteractiveCanvasTarget =
  | {
      kind: "base-point";
      point: { x: number; y: number };
    }
  | {
      kind: "panel";
      transomId: string;
      panelId: string;
      side: "left" | "right";
      bounds: { x: number; y: number; width: number; height: number };
    }
  | {
      kind: "row";
      transomId: string;
      side: "top" | "bottom";
      bounds: { x: number; y: number; width: number; height: number };
    }
  | {
      kind: "mirror-axis";
      axis: "vertical" | "horizontal";
      line: { x1: number; y1: number; x2: number; y2: number };
    }
  | {
      kind: "offset-target";
      target: CommandTarget;
      line: { x1: number; y1: number; x2: number; y2: number };
      guideMeta?: { orientation: GuideOrientation; positionMm: number };
    };

type CommandTarget =
  | { type: "panel-width"; transomId: string; panelId: string; label: string }
  | { type: "transom-height"; transomId: string; label: string }
  | { type: "frame-thickness"; label: string }
  | { type: "mullion-thickness"; label: string }
  | { type: "guide-position"; guideId: string; orientation: GuideOrientation; label: string };

type CanvasObjectSelection =
  | { type: "outer-frame" }
  | { type: "panel"; transomId: string; panelId: string }
  | { type: "sash"; transomId: string; panelId: string }
  | { type: "glass"; transomId: string; panelId: string }
  | { type: "mullion"; transomId: string; panelId: string }
  | { type: "transom-bar"; transomId: string }
  | { type: "guide"; guideId: string };

interface ObjectSelectOptions {
  preserveMultiSelection?: boolean;
}

type BlockSelectionPreview = {
  bounds: { x: number; y: number; width: number; height: number };
  rowBounds: { x: number; y: number; width: number; height: number };
  transomId: string;
  totalWidthMm: number;
  panels: Array<{
    panelId: string;
    label: string;
    widthMm: number;
    openingType: OpeningType;
  }>;
};

type PlacementTelemetry = {
  point: { x: number; y: number };
  dxMm: number;
  dyMm: number;
  distanceMm: number;
  angleDeg: number;
  axisLock: "x" | "y" | null;
  lockedDistanceMm: number | null;
  lockedVectorMm: { dxMm: number; dyMm: number } | null;
  trackingMode: "free" | "ortho" | "polar" | "vector";
  osnapLabel: string | null;
};

function cloneDesignPayload(design: PvcDesign): PvcDesign {
  const guides = (design as PvcDesign & { guides?: PvcDesign["guides"] }).guides ?? [];
  return {
    ...design,
    materials: { ...design.materials },
    customer: { ...design.customer },
    guides: guides.map((guide) => ({ ...guide })),
    transoms: design.transoms.map((transom) => ({
      ...transom,
      panels: transom.panels.map((panel) => ({ ...panel }))
    }))
  };
}

function App() {
  const [viewMode, setViewMode] = useState<"studio" | "technical" | "presentation">("studio");
  const [railTab, setRailTab] = useState<"inspector" | "materials" | "library" | "bom">("inspector");
  const [customTemplates, setCustomTemplates] = useState<PvcDesign[]>([]);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectDraft, setNewProjectDraft] = useState({
    name: "Yeni Proje",
    width: "1500",
    height: "1500"
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [snapMm, setSnapMm] = useState(10);
  const [osnapEnabled, setOsnapEnabled] = useState(true);
  const [osnapModes, setOsnapModes] = useState<OsnapModes>({
    endpoint: true,
    midpoint: true,
    center: true,
    intersection: true
  });
  const [orthoMode, setOrthoMode] = useState(false);
  const [polarMode, setPolarMode] = useState(true);
  const [polarAngle, setPolarAngle] = useState(45);
  const [multiSelection, setMultiSelection] = useState<PanelRef[]>([]);
  const [commandTarget, setCommandTarget] = useState<CommandTarget | null>(null);
  const [selectedObject, setSelectedObject] = useState<CanvasObjectSelection | null>(null);
  const [commandValue, setCommandValue] = useState("");
  const [commandQuery, setCommandQuery] = useState("");
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1);
  const [guideLabelDraft, setGuideLabelDraft] = useState("");
  const [interactivePlacement, setInteractivePlacement] = useState<InteractivePlacement>(null);
  const [visibleLayers, setVisibleLayers] = useState<VisibleLayers>({
    rulers: true,
    dimensions: true,
    guides: true,
    hud: true,
    profiles: true,
    glass: true,
    hardware: true,
    notes: true
  });
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const {
    design,
    selected,
    activeProjectPath,
    history,
    future,
    setTotalWidth,
    setTotalHeight,
    setOuterFrameThickness,
    setMullionThickness,
    selectPanel,
    setDesignName,
    replaceDesign,
    setFrameColor,
    setGlassType,
    setProfileSeries,
    setMaterialSystem,
    setHardwareQuality,
    setCustomerField,
    setPanelWidthById,
    setTransomHeightById,
    setSelectedOpeningType,
    setSelectedPanelWidth,
    setSelectedTransomHeight,
    splitSelectedPanelVertical,
    splitSelectedTransomHorizontal,
    deleteSelectedPanel,
    deleteSelectedTransom,
    insertPanelAdjacent,
    insertTransomAdjacent,
    copySelectedPanelToTarget,
    copySelectedTransomToTarget,
    copySelectedPanelRepeatedToTarget,
    copySelectedTransomRepeatedToTarget,
    moveSelectedPanelToTarget,
    moveSelectedTransomToTarget,
    copyPanelGroupToTarget,
    copyPanelGroupRepeatedToTarget,
    movePanelGroupToTarget,
    equalizeSelectedRowPanels,
    equalizeAllTransomHeights,
    applyOpeningTypeToPanels,
    equalizePanelsByRefs,
    equalizeTransomsByRefs,
    offsetPanelGroupPattern,
    offsetSelectedPanelPattern,
    offsetSelectedTransomPattern,
    shiftPanelBlockBy,
    shiftSelectedTransomBy,
    adjustPanelBlockEdge,
    adjustSelectedTransomEdge,
    centerPanelBlock,
    centerSelectedTransom,
    mirrorSelectedRow,
    mirrorTransomStack,
    arraySelectedPanel,
    arraySelectedTransom,
    arraySelectedGrid,
    applyPanelLibraryModule,
    applyRowLibraryModule,
    addReferenceGuide,
    setGuidePosition,
    toggleGuideLock,
    renameGuide,
    removeGuide,
    undo,
    redo
  } = useDesignerStore();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as PvcDesign[];
      if (Array.isArray(parsed)) {
        setCustomTemplates(
          parsed.map((template) => ({
            ...cloneDesignPayload(template),
            guides: template.guides ?? [],
            materials: {
              ...template.materials,
              materialSystem: template.materials.materialSystem ?? "c60"
            }
          }))
        );
      }
    } catch {
      setCustomTemplates([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  const galleryTemplates = useMemo(
    () => [
      ...designTemplates.map((template) => ({
        id: template.id,
        source: "builtin" as const,
        design: template
      })),
      ...customTemplates.map((template) => ({
        id: template.id,
        source: "custom" as const,
        design: template
      }))
    ],
    [customTemplates]
  );

  const selectedPanel = useMemo(() => {
    if (!selected) {
      return null;
    }

    const transom = design.transoms.find((item) => item.id === selected.transomId);
    const panel = transom?.panels.find((item) => item.id === selected.panelId);

    if (!transom || !panel) {
      return null;
    }

    return { transom, panel };
  }, [design, selected]);
  const selectedTransom = useMemo(
    () => (selected ? design.transoms.find((item) => item.id === selected.transomId) ?? null : null),
    [design, selected]
  );
  const selectedGuide = useMemo(
    () => (selectedObject?.type === "guide" ? design.guides.find((item) => item.id === selectedObject.guideId) ?? null : null),
    [design.guides, selectedObject]
  );

  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const glassSpec = glassCatalog[design.materials.glassType];
  const materialSystemSpec = materialSystemCatalog[design.materials.materialSystem];
  const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];
  const nextProfileSeries = getNextProfileSeries(design.materials.profileSeries);
  const nextHardwareQuality = getNextHardwareQuality(design.materials.hardwareQuality);
  const designSnapshot = useMemo(() => buildDesignSnapshot(design), [design]);
  const designHealth = useMemo(() => buildDesignHealth(design), [design]);
  const selectedPanelEngineering = useMemo(() => {
    if (!selectedPanel) {
      return null;
    }

    return buildPanelEngineering(
      design,
      selectedPanel.panel.width,
      selectedPanel.transom.height,
      selectedPanel.panel.openingType
    );
  }, [design, selectedPanel]);
  const commandPreview = useMemo(() => buildCommandPreview(commandQuery), [commandQuery]);
  const selectedObjectInfo = useMemo(() => {
    if (!selectedObject) {
      return null;
    }

    if (selectedObject.type === "outer-frame") {
      return {
        title: "Dis Kasa",
        subtitle: `${design.totalWidth} x ${design.totalHeight} mm`,
        detail: `Kalinlik ${design.outerFrameThickness} mm`,
        quickActions: ["set 76", "offset 5"]
      };
    }

    if (selectedObject.type === "guide") {
      const guide = design.guides.find((item) => item.id === selectedObject.guideId);
      return guide
        ? {
            title: `${guide.orientation === "vertical" ? "Dikey" : "Yatay"} Guide`,
            subtitle: `${guide.positionMm} mm`,
            detail: `${guide.locked ? "Kilitli" : "Serbest"} / ${guide.label}`,
            quickActions: [guide.locked ? "guide unlock" : "guide lock", "guide del"]
          }
        : null;
    }

    if (selectedObject.type === "transom-bar") {
      const transom = design.transoms.find((item) => item.id === selectedObject.transomId);
      return transom
        ? {
            title: "Yatay Kayit",
            subtitle: `Satir ${design.transoms.findIndex((item) => item.id === transom.id) + 1}`,
            detail: `Kayit ${design.mullionThickness} mm`,
            quickActions: ["align top", "align bottom", "match height", "distribute rows"]
          }
        : null;
    }

    const transom = design.transoms.find((item) => item.id === selectedObject.transomId);
    const panel = transom?.panels.find((item) => item.id === selectedObject.panelId);
    if (!transom || !panel) {
      return null;
    }

    const engineering = buildPanelEngineering(design, panel.width, transom.height, panel.openingType);

    if (selectedObject.type === "mullion") {
      return {
        title: "Dikey Kayit",
        subtitle: `${panel.width} / ${transom.panels[transom.panels.findIndex((item) => item.id === panel.id) + 1]?.width ?? 0} mm`,
        detail: `Kayit ${design.mullionThickness} mm`,
        quickActions: ["align left", "align right", "match width", "distribute"]
      };
    }

    if (selectedObject.type === "sash") {
      return {
        title: "Kanat",
        subtitle: `${Math.round(engineering.approxSashWidthMm)} x ${Math.round(engineering.approxSashHeightMm)} mm`,
        detail: `${formatOpeningLabel(panel.openingType)} / ${engineering.approxSashWeightKg.toFixed(1)} kg`,
        quickActions: ["right", "left", "tilt", "slide"]
      };
    }

    if (selectedObject.type === "glass") {
      return {
        title: "Cam",
        subtitle: `${Math.round(engineering.approxGlassWidthMm)} x ${Math.round(engineering.approxGlassHeightMm)} mm`,
        detail: `${glassCatalog[design.materials.glassType].label} / ${engineering.approxGlassAreaM2.toFixed(2)} m²`,
        quickActions: ["glass frosted", "glass double-low-e"]
      };
    }

    return {
      title: "Panel",
      subtitle: `${panel.width} x ${transom.height} mm`,
      detail: `${formatOpeningLabel(panel.openingType)} / ${calculatePanelArea(panel.width, transom.height).toFixed(2)} m²`,
      quickActions: ["sv", "array 3", "align center", "match width", "lib triple"]
    };
  }, [design, selectedObject]);
  const multiSelectionInfo = useMemo(() => {
    if (multiSelection.length < 2) {
      return null;
    }

    const transomIds = [...new Set(multiSelection.map((item) => item.transomId))];
    const sameTransom = transomIds.length === 1;
    if (!sameTransom) {
      return {
        sameTransom: false,
        transomId: null,
        panels: []
      };
    }

    const transom = design.transoms.find((item) => item.id === transomIds[0]);
    if (!transom) {
      return null;
    }

    const panels = multiSelection
      .map((ref) => ({
        ref,
        panel: transom.panels.find((panel) => panel.id === ref.panelId) ?? null,
        index: transom.panels.findIndex((panel) => panel.id === ref.panelId)
      }))
      .filter((item) => item.panel && item.index >= 0)
      .sort((a, b) => a.index - b.index) as Array<{
      ref: PanelRef;
      panel: PanelDefinition;
      index: number;
    }>;

    const contiguous = panels.length > 0 && panels[panels.length - 1].index - panels[0].index + 1 === panels.length;

    return {
      sameTransom: true,
      contiguous,
      transomId: transom.id,
      panels
    };
  }, [design.transoms, multiSelection]);
  const activePanelBlockRefs = useMemo(() => {
    if (multiSelection.length > 1 && multiSelectionInfo?.sameTransom && multiSelectionInfo.contiguous) {
      return multiSelectionInfo.panels.map((item) => item.ref);
    }
    return selected ? [selected] : [];
  }, [multiSelection.length, multiSelectionInfo, selected]);
  const selectedTransomRefs = useMemo(() => {
    const nextIds = new Set<string>();
    multiSelection.forEach((item) => nextIds.add(item.transomId));
    if (selected?.transomId) {
      nextIds.add(selected.transomId);
    }
    if (selectedObject?.type === "transom-bar") {
      nextIds.add(selectedObject.transomId);
    }
    return [...nextIds];
  }, [multiSelection, selected, selectedObject]);
  const activePanelDistributionRefs = useMemo(() => {
    if (multiSelection.length > 1) {
      return multiSelection;
    }
    return activePanelBlockRefs;
  }, [activePanelBlockRefs, multiSelection]);
  const panelShiftRange = useMemo(() => {
    if (!activePanelBlockRefs.length) {
      return null;
    }

    const transom = design.transoms.find((item) => item.id === activePanelBlockRefs[0].transomId);
    if (!transom) {
      return null;
    }

    const indexes = activePanelBlockRefs
      .map((item) => transom.panels.findIndex((panel) => panel.id === item.panelId))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);

    if (!indexes.length) {
      return null;
    }

    const startIndex = indexes[0];
    const endIndex = indexes[indexes.length - 1];
    if (startIndex <= 0 || endIndex >= transom.panels.length - 1) {
      return null;
    }

    const leftNeighbor = transom.panels[startIndex - 1];
    const rightNeighbor = transom.panels[endIndex + 1];
    if (!leftNeighbor || !rightNeighbor) {
      return null;
    }

    return {
      min: -(leftNeighbor.width - 100),
      max: rightNeighbor.width - 100
    };
  }, [activePanelBlockRefs, design.transoms]);
  const transomShiftRange = useMemo(() => {
    if (!selectedTransom) {
      return null;
    }

    const transomIndex = design.transoms.findIndex((item) => item.id === selectedTransom.id);
    if (transomIndex <= 0 || transomIndex >= design.transoms.length - 1) {
      return null;
    }

    const aboveTransom = design.transoms[transomIndex - 1];
    const belowTransom = design.transoms[transomIndex + 1];
    if (!aboveTransom || !belowTransom) {
      return null;
    }

    return {
      min: -(aboveTransom.height - 150),
      max: belowTransom.height - 150
    };
  }, [design.transoms, selectedTransom]);
  const panelCenterDelta = useMemo(() => {
    if (!activePanelBlockRefs.length) {
      return null;
    }
    const transom = design.transoms.find((item) => item.id === activePanelBlockRefs[0].transomId);
    if (!transom) {
      return null;
    }
    const indexes = activePanelBlockRefs
      .map((item) => transom.panels.findIndex((panel) => panel.id === item.panelId))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);
    if (!indexes.length || indexes[0] <= 0 || indexes[indexes.length - 1] >= transom.panels.length - 1) {
      return null;
    }
    const leftNeighbor = transom.panels[indexes[0] - 1];
    const rightNeighbor = transom.panels[indexes[indexes.length - 1] + 1];
    if (!leftNeighbor || !rightNeighbor) {
      return null;
    }
    return Math.round((rightNeighbor.width - leftNeighbor.width) / 2);
  }, [activePanelBlockRefs, design.transoms]);
  const transomCenterDelta = useMemo(() => {
    if (!selectedTransom) {
      return null;
    }
    const transomIndex = design.transoms.findIndex((item) => item.id === selectedTransom.id);
    if (transomIndex <= 0 || transomIndex >= design.transoms.length - 1) {
      return null;
    }
    const aboveTransom = design.transoms[transomIndex - 1];
    const belowTransom = design.transoms[transomIndex + 1];
    if (!aboveTransom || !belowTransom) {
      return null;
    }
    return Math.round((belowTransom.height - aboveTransom.height) / 2);
  }, [design.transoms, selectedTransom]);
  const totalPanelCount = designSnapshot.panelCount;
  const openingCount = designSnapshot.openingCount;
  const fixedCount = designSnapshot.fixedCount;
  const bom = useMemo(() => buildManufacturingReport(design), [design]);

  useEffect(() => {
    if (!selectedPanel || commandTarget) {
      return;
    }

    setCommandTarget({
      type: "panel-width",
      transomId: selectedPanel.transom.id,
      panelId: selectedPanel.panel.id,
      label: `Panel Genisligi - ${selectedPanel.panel.width} mm`
    });
  }, [commandTarget, selectedPanel]);

  useEffect(() => {
    if (!commandTarget) {
      return;
    }

    if (commandTarget.type === "panel-width") {
      const transom = design.transoms.find((item) => item.id === commandTarget.transomId);
      const panel = transom?.panels.find((item) => item.id === commandTarget.panelId);
      if (!panel) {
        return;
      }

      const nextLabel = `${commandTarget.label.startsWith("Dikey Kayit") ? "Dikey Kayit" : "Panel Genisligi"} - ${panel.width} mm`;
      if (commandTarget.label !== nextLabel) {
        setCommandTarget({ ...commandTarget, label: nextLabel });
      }
      return;
    }

    if (commandTarget.type === "transom-height") {
      const transom = design.transoms.find((item) => item.id === commandTarget.transomId);
      if (!transom) {
        return;
      }

      const nextLabel = `${commandTarget.label.startsWith("Yatay Kayit") ? "Yatay Kayit" : "Satir Yuksekligi"} - ${transom.height} mm`;
      if (commandTarget.label !== nextLabel) {
        setCommandTarget({ ...commandTarget, label: nextLabel });
      }
      return;
    }

    const nextLabel =
      commandTarget.type === "frame-thickness"
        ? `Kasa Kalinligi - ${design.outerFrameThickness} mm`
        : commandTarget.type === "mullion-thickness"
          ? `Kayit Kalinligi - ${design.mullionThickness} mm`
          : `${commandTarget.orientation === "vertical" ? "Dikey" : "Yatay"} Guide - ${
              design.guides.find((item) => item.id === commandTarget.guideId)?.positionMm ?? 0
            } mm`;
    if (commandTarget.label !== nextLabel) {
      setCommandTarget({ ...commandTarget, label: nextLabel });
    }
  }, [commandTarget, design]);

  useEffect(() => {
    if (!selectedPanel || selectedObject) {
      return;
    }

    setSelectedObject({
      type: "panel",
      transomId: selectedPanel.transom.id,
      panelId: selectedPanel.panel.id
    });
  }, [selectedObject, selectedPanel]);

  useEffect(() => {
    setGuideLabelDraft(selectedGuide?.label ?? "");
  }, [selectedGuide]);

  useEffect(() => {
    if (!commandStatus) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCommandStatus(null), 3600);
    return () => window.clearTimeout(timer);
  }, [commandStatus]);

  function rememberCommand(source: string) {
    const normalized = source.trim();
    if (!normalized) {
      return;
    }

    setCommandHistory((current) => {
      const next = current[current.length - 1] === normalized ? current : [...current, normalized];
      return next.slice(-24);
    });
    setCommandHistoryIndex(-1);
  }

  function browseCommandHistory(direction: "older" | "newer") {
    if (!commandHistory.length) {
      return;
    }

    if (direction === "older") {
      const nextIndex = commandHistoryIndex === -1 ? commandHistory.length - 1 : Math.max(0, commandHistoryIndex - 1);
      setCommandHistoryIndex(nextIndex);
      setCommandQuery(commandHistory[nextIndex] ?? "");
      return;
    }

    if (commandHistoryIndex === -1) {
      return;
    }

    if (commandHistoryIndex >= commandHistory.length - 1) {
      setCommandHistoryIndex(-1);
      setCommandQuery("");
      return;
    }

    const nextIndex = commandHistoryIndex + 1;
    setCommandHistoryIndex(nextIndex);
    setCommandQuery(commandHistory[nextIndex] ?? "");
  }

  function updatePlacementLock(
    updater: (
      placement: Extract<Exclude<InteractivePlacement, null>, { type: "copy" | "move" }>
    ) => Extract<Exclude<InteractivePlacement, null>, { type: "copy" | "move" }>
  ) {
    setInteractivePlacement((current) => {
      if (!current || (current.type !== "copy" && current.type !== "move") || current.phase !== "target") {
        return current;
      }
      return updater(current as Extract<Exclude<InteractivePlacement, null>, { type: "copy" | "move" }>);
    });
  }

  function applyCommandValue() {
    if (interactivePlacement && (interactivePlacement.type === "copy" || interactivePlacement.type === "move") && interactivePlacement.phase === "target") {
      const vectorLock = parsePlacementVectorValue(commandValue);
      if (vectorLock) {
        updatePlacementLock((current) => ({
          ...current,
          axisLock: null,
          lockedDistanceMm: null,
          lockedVectorMm: vectorLock
        }));
        setCommandStatus(`Placement vektoru DX ${vectorLock.dxMm} / DY ${vectorLock.dyMm} mm olarak kilitlendi`);
        setCommandValue("");
        return;
      }

      const parsedValue = Number(commandValue.replace(",", "."));
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return;
      }
      updatePlacementLock((current) => ({
        ...current,
        lockedDistanceMm: Math.round(parsedValue),
        lockedVectorMm: null
      }));
      setCommandStatus(`Mesafe kilidi ${Math.round(parsedValue)} mm olarak ayarlandi`);
      setCommandValue("");
      return;
    }

    const parsedValue = Number(commandValue.replace(",", "."));
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    if (!commandTarget) {
      return;
    }

    applyCommandDimension(Math.round(parsedValue));
    setCommandValue("");
  }

  function getCommandTargetCurrentValue(target: CommandTarget | null) {
    if (!target) {
      return null;
    }

    if (target.type === "panel-width") {
      const transom = design.transoms.find((item) => item.id === target.transomId);
      const panel = transom?.panels.find((item) => item.id === target.panelId);
      return panel?.width ?? null;
    }

    if (target.type === "transom-height") {
      const transom = design.transoms.find((item) => item.id === target.transomId);
      return transom?.height ?? null;
    }

    if (target.type === "frame-thickness") {
      return design.outerFrameThickness;
    }

    if (target.type === "mullion-thickness") {
      return design.mullionThickness;
    }

    return design.guides.find((item) => item.id === target.guideId)?.positionMm ?? null;
  }

  function applyCommandDimension(nextValue: number, targetOverride?: CommandTarget | null) {
    const target = targetOverride ?? commandTarget;
    if (!target || !Number.isFinite(nextValue) || nextValue <= 0) {
      return;
    }

    if (target.type === "panel-width") {
      setPanelWidthById(target.transomId, target.panelId, nextValue);
      setCommandTarget({
        ...target,
        label: `Panel Genisligi - ${nextValue} mm`
      });
      setCommandStatus(`Panel genisligi ${nextValue} mm yapildi`);
      return;
    }

    if (target.type === "transom-height") {
      setTransomHeightById(target.transomId, nextValue);
      setCommandTarget({
        ...target,
        label: `Satir Yuksekligi - ${nextValue} mm`
      });
      setCommandStatus(`Satir yuksekligi ${nextValue} mm yapildi`);
      return;
    }

    if (target.type === "frame-thickness") {
      setOuterFrameThickness(nextValue);
      setCommandTarget({
        ...target,
        label: `Kasa Kalinligi - ${nextValue} mm`
      });
      setCommandStatus(`Kasa kalinligi ${nextValue} mm yapildi`);
      return;
    }

    if (target.type === "mullion-thickness") {
      setMullionThickness(nextValue);
      setCommandTarget({
        ...target,
        label: `Kayit Kalinligi - ${nextValue} mm`
      });
      setCommandStatus(`Kayit kalinligi ${nextValue} mm yapildi`);
      return;
    }

    setGuidePosition(target.guideId, nextValue);
    setCommandTarget({
      ...target,
      label: `${target.orientation === "vertical" ? "Dikey" : "Yatay"} Guide - ${nextValue} mm`
    });
    setCommandStatus(`Guide konumu ${nextValue} mm yapildi`);
  }

  function applyLibraryShortcut(moduleKey: string) {
    const normalized = moduleKey.toLowerCase();
    const panelModule =
      panelLibraryModules.find((item) => item.id === normalized || item.commandAlias === normalized) ?? null;
    if (panelModule) {
      applyPanelLibraryModule(panelModule.id);
      setRailTab("library");
      setCommandStatus(`${panelModule.title} modulu uygulandi`);
      return true;
    }

    const rowModule =
      rowLibraryModules.find((item) => item.id === normalized || item.commandAlias === normalized) ?? null;
    if (rowModule) {
      applyRowLibraryModule(rowModule.id);
      setRailTab("library");
      setCommandStatus(`${rowModule.title} satir modulu uygulandi`);
      return true;
    }

    return false;
  }

  function applyMoveDisplacement(deltaMm: number, mode: "panel" | "row") {
    if (!Number.isFinite(deltaMm) || deltaMm === 0) {
      return false;
    }

    if (mode === "row") {
      if (!transomShiftRange) {
        setCommandStatus("Secili satir sadece orta satirlarda kaydirilabilir");
        return false;
      }
      const nextDelta = Math.max(transomShiftRange.min, Math.min(transomShiftRange.max, Math.round(deltaMm)));
      if (nextDelta === 0) {
        setCommandStatus("Satir kaydirma sinirina ulasildi");
        return false;
      }
      shiftSelectedTransomBy(nextDelta);
      setCommandStatus(`Secili satir ${nextDelta > 0 ? "+" : ""}${nextDelta} mm kaydirildi`);
      return true;
    }

    if (!activePanelBlockRefs.length || !panelShiftRange) {
      setCommandStatus("Secili panel blogu sadece iki komsu panel arasinda kaydirilabilir");
      return false;
    }

    const nextDelta = Math.max(panelShiftRange.min, Math.min(panelShiftRange.max, Math.round(deltaMm)));
    if (nextDelta === 0) {
      setCommandStatus("Panel kaydirma sinirina ulasildi");
      return false;
    }
    shiftPanelBlockBy(activePanelBlockRefs, nextDelta);
    setCommandStatus(
      `${activePanelBlockRefs.length > 1 ? "Secili blok" : "Secili panel"} ${nextDelta > 0 ? "+" : ""}${nextDelta} mm kaydirildi`
    );
    return true;
  }

  function applyPanelEdgeAdjust(edge: "left" | "right", deltaMm: number, operation: "trim" | "extend") {
    if (!activePanelBlockRefs.length) {
      setCommandStatus("Secili panel veya blok bulunamadi");
      return false;
    }

    const capacity = getPanelBlockEdgeCapacity(design, activePanelBlockRefs, edge);
    if (!capacity) {
      setCommandStatus("Secili blok kenar duzenlemeye uygun degil");
      return false;
    }
    const requested = Math.abs(Math.round(deltaMm));
    const maxAmount = operation === "trim" ? capacity.trimMaxMm : capacity.extendMaxMm;
    if (maxAmount <= 0) {
      setCommandStatus(
        capacity.blockedBy === "border"
          ? `Secili blok ${edge} dis sinira dayaniyor`
          : `Secili blok ${edge} tarafinda duzenleme payi yok`
      );
      return false;
    }
    const blockMetrics = getPanelBlockMetrics(design, activePanelBlockRefs);
    const currentEdgeMm =
      blockMetrics && edge === "left"
        ? blockMetrics.startMm
        : blockMetrics && edge === "right"
          ? blockMetrics.endMm
          : null;
    const guideLock =
      currentEdgeMm === null
        ? null
        : getGuideLockedEdgeAdjustment(
            design.guides,
            "vertical",
            currentEdgeMm,
            requested,
            maxAmount,
            edge === "left"
              ? operation === "trim"
                ? 1
                : -1
              : operation === "trim"
                ? -1
                : 1
          );
    const applied = guideLock?.appliedMm ?? Math.min(requested, maxAmount);
    const signedDelta = operation === "trim" ? applied : -applied;
    adjustPanelBlockEdge(activePanelBlockRefs, edge, signedDelta);
    setCommandStatus(
      `${activePanelBlockRefs.length > 1 ? "Blok" : "Panel"} ${operation === "trim" ? "trim" : "extend"} ${edge} ${applied} mm uygulandi${
        guideLock ? ` / Guide ${guideLock.guide.label} kilidi` : applied < requested ? ` / max ${maxAmount}` : ""
      }`
    );
    return true;
  }

  function applyTransomEdgeAdjust(edge: "top" | "bottom", deltaMm: number, operation: "trim" | "extend") {
    const capacity = getTransomEdgeCapacity(design, selected?.transomId, edge);
    if (!capacity) {
      setCommandStatus("Secili satir kenar duzenlemeye uygun degil");
      return false;
    }
    const requested = Math.abs(Math.round(deltaMm));
    const maxAmount = operation === "trim" ? capacity.trimMaxMm : capacity.extendMaxMm;
    if (maxAmount <= 0) {
      setCommandStatus(
        capacity.blockedBy === "border"
          ? `Secili satir ${edge === "top" ? "ust" : "alt"} sinira dayaniyor`
          : `Secili satir ${edge === "top" ? "ust" : "alt"} tarafinda duzenleme payi yok`
      );
      return false;
    }
    const rowMetrics = getSelectedTransomMetrics(design, selected?.transomId);
    const currentEdgeMm =
      rowMetrics && edge === "top"
        ? rowMetrics.startMm
        : rowMetrics && edge === "bottom"
          ? rowMetrics.endMm
          : null;
    const guideLock =
      currentEdgeMm === null
        ? null
        : getGuideLockedEdgeAdjustment(
            design.guides,
            "horizontal",
            currentEdgeMm,
            requested,
            maxAmount,
            edge === "top"
              ? operation === "trim"
                ? 1
                : -1
              : operation === "trim"
                ? -1
                : 1
          );
    const applied = guideLock?.appliedMm ?? Math.min(requested, maxAmount);
    const signedDelta = operation === "trim" ? applied : -applied;
    adjustSelectedTransomEdge(edge, signedDelta);
    setCommandStatus(
      `Secili satir ${operation === "trim" ? "trim" : "extend"} ${edge} ${applied} mm uygulandi${
        guideLock ? ` / Guide ${guideLock.guide.label} kilidi` : applied < requested ? ` / max ${maxAmount}` : ""
      }`
    );
    return true;
  }

  function applyCenterCommand(mode: "panel" | "row") {
    if (mode === "row") {
      if (transomCenterDelta === null) {
        setCommandStatus("Secili satir ortalanamiyor");
        return false;
      }
      centerSelectedTransom();
      setCommandStatus("Secili satir komsu satirlar arasinda ortalandi");
      return true;
    }

    if (!activePanelBlockRefs.length || panelCenterDelta === null) {
      setCommandStatus("Secili panel blogu ortalanamiyor");
      return false;
    }

    centerPanelBlock(activePanelBlockRefs);
    setCommandStatus(`${activePanelBlockRefs.length > 1 ? "Secili blok" : "Secili panel"} satir icinde ortalandi`);
    return true;
  }

  function applyAlignCommand(position: "left" | "right" | "center" | "top" | "bottom" | "middle") {
    if (position === "center") {
      return applyCenterCommand("panel");
    }

    if (position === "middle") {
      return applyCenterCommand("row");
    }

    if (position === "left" || position === "right") {
      if (!panelShiftRange || !activePanelBlockRefs.length) {
        setCommandStatus("Secili panel blogu yatay hizalamaya uygun degil");
        return false;
      }
      const delta = position === "left" ? panelShiftRange.min : panelShiftRange.max;
      if (!delta) {
        setCommandStatus(`Secili blok zaten ${position === "left" ? "sol" : "sag"} sinira yakin`);
        return false;
      }
      shiftPanelBlockBy(activePanelBlockRefs, delta);
      setCommandStatus(`${activePanelBlockRefs.length > 1 ? "Secili blok" : "Secili panel"} ${position === "left" ? "sola" : "saga"} hizalandi`);
      return true;
    }

    if (!transomShiftRange) {
      setCommandStatus("Secili satir dikey hizalamaya uygun degil");
      return false;
    }
    const delta = position === "top" ? transomShiftRange.min : transomShiftRange.max;
    if (!delta) {
      setCommandStatus(`Secili satir zaten ${position === "top" ? "ust" : "alt"} sinira yakin`);
      return false;
    }
    shiftSelectedTransomBy(delta);
    setCommandStatus(`Secili satir ${position === "top" ? "uste" : "alta"} hizalandi`);
    return true;
  }

  function applyGuideAlignCommand(position: "left" | "right" | "center" | "top" | "bottom" | "middle") {
    if (position === "left" || position === "right" || position === "center") {
      if (!panelShiftRange || !activePanelBlockRefs.length) {
        setCommandStatus("Secili panel blogu guide hizalamaya uygun degil");
        return false;
      }

      const metrics = getPanelBlockMetrics(design, activePanelBlockRefs);
      if (!metrics) {
        setCommandStatus("Panel blogu olcusu okunamadi");
        return false;
      }

      const targetMm =
        position === "left"
          ? metrics.startMm
          : position === "right"
            ? metrics.endMm
            : metrics.centerMm;
      const guide = getNearestGuide(design.guides, "vertical", targetMm);
      if (!guide) {
        setCommandStatus("Dikey guide bulunamadi");
        return false;
      }

      const delta = Math.round(guide.positionMm - targetMm);
      const nextDelta = Math.max(panelShiftRange.min, Math.min(panelShiftRange.max, delta));
      if (nextDelta === 0) {
        setCommandStatus(delta === 0 ? `Secili blok zaten guide ${guide.label} hizasinda` : `Guide ${guide.label} ulasilamiyor`);
        return false;
      }
      if (Math.abs(nextDelta) < Math.abs(delta)) {
        setCommandStatus(`Guide ${guide.label} tam ulasilamiyor / max ${Math.abs(nextDelta)} mm`);
        return false;
      }
      shiftPanelBlockBy(activePanelBlockRefs, nextDelta);
      setCommandStatus(`${activePanelBlockRefs.length > 1 ? "Blok" : "Panel"} dikey guide ${guide.label} ile hizalandi`);
      return true;
    }

    if (!transomShiftRange || !selectedTransom) {
      setCommandStatus("Secili satir guide hizalamaya uygun degil");
      return false;
    }

    const metrics = getSelectedTransomMetrics(design, selectedTransom.id);
    if (!metrics) {
      setCommandStatus("Satir olcusu okunamadi");
      return false;
    }

    const targetMm =
      position === "top"
        ? metrics.startMm
        : position === "bottom"
          ? metrics.endMm
          : metrics.centerMm;
    const guide = getNearestGuide(design.guides, "horizontal", targetMm);
    if (!guide) {
      setCommandStatus("Yatay guide bulunamadi");
      return false;
    }

    const delta = Math.round(guide.positionMm - targetMm);
    const nextDelta = Math.max(transomShiftRange.min, Math.min(transomShiftRange.max, delta));
    if (nextDelta === 0) {
      setCommandStatus(delta === 0 ? `Secili satir zaten guide ${guide.label} hizasinda` : `Guide ${guide.label} ulasilamiyor`);
      return false;
    }
    if (Math.abs(nextDelta) < Math.abs(delta)) {
      setCommandStatus(`Guide ${guide.label} tam ulasilamiyor / max ${Math.abs(nextDelta)} mm`);
      return false;
    }
    shiftSelectedTransomBy(nextDelta);
    setCommandStatus(`Secili satir yatay guide ${guide.label} ile hizalandi`);
    return true;
  }

  function buildSelectedTransomPanelRefs() {
    const refs: PanelRef[] = [];
    selectedTransomRefs.forEach((transomId) => {
      const transom = design.transoms.find((item) => item.id === transomId);
      const anchorPanel = transom?.panels[0];
      if (anchorPanel) {
        refs.push({ transomId, panelId: anchorPanel.id });
      }
    });
    return refs;
  }

  function applyDistributeCommand(mode: "panel" | "row") {
    if (mode === "row") {
      const refs = buildSelectedTransomPanelRefs();
      if (refs.length >= 2) {
        equalizeTransomsByRefs(refs);
        setCommandStatus("Secili satirlar esit dagitildi");
        return true;
      }
      if (design.transoms.length >= 2) {
        equalizeAllTransomHeights();
        setCommandStatus("Tum satirlar esit dagitildi");
        return true;
      }
      setCommandStatus("Dagitilacak yeterli satir yok");
      return false;
    }

    if (activePanelDistributionRefs.length >= 2) {
      equalizePanelsByRefs(activePanelDistributionRefs);
      setCommandStatus("Secili paneller esit dagitildi");
      return true;
    }

    if (selectedTransom?.panels.length && selectedTransom.panels.length >= 2) {
      equalizeSelectedRowPanels();
      setCommandStatus("Aktif satirdaki paneller esit dagitildi");
      return true;
    }

    setCommandStatus("Dagitilacak yeterli panel yok");
    return false;
  }

  function applyMatchCommand(mode: "panel" | "row") {
    if (mode === "row") {
      const applied = applyDistributeCommand("row");
      if (applied) {
        setCommandStatus("Satir yukseklikleri match edildi");
      }
      return applied;
    }

    const applied = applyDistributeCommand("panel");
    if (applied) {
      setCommandStatus("Panel genislikleri match edildi");
    }
    return applied;
  }

  function applySelectedMullionPreset(action: string) {
    if (selectedObject?.type !== "mullion") {
      setCommandStatus("Secili dikey kayit bulunamadi");
      return false;
    }

    const transom = design.transoms.find((item) => item.id === selectedObject.transomId);
    if (!transom) {
      setCommandStatus("Kayit satiri bulunamadi");
      return false;
    }

    const panelIndex = transom.panels.findIndex((item) => item.id === selectedObject.panelId);
    if (panelIndex === -1 || panelIndex >= transom.panels.length - 1) {
      setCommandStatus("Kayit komsusu bulunamadi");
      return false;
    }

    const leftPanel = transom.panels[panelIndex];
    const rightPanel = transom.panels[panelIndex + 1];
    if (!leftPanel || !rightPanel) {
      setCommandStatus("Kayit komsusu bulunamadi");
      return false;
    }

    const totalWidth = leftPanel.width + rightPanel.width;
    if (action === "nudge-left") {
      setPanelWidthById(transom.id, leftPanel.id, leftPanel.width - 50);
      setCommandStatus("Dikey kayit 50 mm sola kaydirildi");
      return true;
    }
    if (action === "nudge-right") {
      setPanelWidthById(transom.id, leftPanel.id, leftPanel.width + 50);
      setCommandStatus("Dikey kayit 50 mm saga kaydirildi");
      return true;
    }

    const ratioMap: Record<string, number> = {
      "ratio-50": 0.5,
      "ratio-33": 1 / 3,
      "ratio-67": 2 / 3
    };
    if (action in ratioMap) {
      const nextWidth = clamp(Math.round(totalWidth * ratioMap[action]), 100, totalWidth - 100);
      setPanelWidthById(transom.id, leftPanel.id, nextWidth);
      setCommandStatus(`Dikey kayit ${Math.round((nextWidth / totalWidth) * 100)}/${Math.round(((totalWidth - nextWidth) / totalWidth) * 100)} oranina ayarlandi`);
      return true;
    }

    if (action === "equalize") {
      const nextWidth = Math.round(totalWidth / 2);
      setPanelWidthById(transom.id, leftPanel.id, nextWidth);
      setCommandStatus("Dikey kayit 50/50 olarak dengelendi");
      return true;
    }

    return false;
  }

  function applySelectedTransomPreset(action: string) {
    if (selectedObject?.type !== "transom-bar") {
      setCommandStatus("Secili yatay kayit bulunamadi");
      return false;
    }

    const transomIndex = design.transoms.findIndex((item) => item.id === selectedObject.transomId);
    if (transomIndex === -1 || transomIndex >= design.transoms.length - 1) {
      setCommandStatus("Yatay kayit komsusu bulunamadi");
      return false;
    }

    const topTransom = design.transoms[transomIndex];
    const bottomTransom = design.transoms[transomIndex + 1];
    const totalHeight = topTransom.height + bottomTransom.height;

    if (action === "nudge-up") {
      setTransomHeightById(topTransom.id, topTransom.height - 50);
      setCommandStatus("Yatay kayit 50 mm yukari alindi");
      return true;
    }
    if (action === "nudge-down") {
      setTransomHeightById(topTransom.id, topTransom.height + 50);
      setCommandStatus("Yatay kayit 50 mm asagi alindi");
      return true;
    }

    const ratioMap: Record<string, number> = {
      "ratio-50": 0.5,
      "ratio-33": 1 / 3,
      "ratio-67": 2 / 3
    };
    if (action in ratioMap) {
      const nextHeight = clamp(Math.round(totalHeight * ratioMap[action]), 150, totalHeight - 150);
      setTransomHeightById(topTransom.id, nextHeight);
      setCommandStatus(`Yatay kayit ${Math.round((nextHeight / totalHeight) * 100)}/${Math.round(((totalHeight - nextHeight) / totalHeight) * 100)} oranina ayarlandi`);
      return true;
    }

    if (action === "equalize") {
      const nextHeight = Math.round(totalHeight / 2);
      setTransomHeightById(topTransom.id, nextHeight);
      setCommandStatus("Yatay kayit 50/50 olarak dengelendi");
      return true;
    }

    return false;
  }

  function runCadCommand(rawValue: string) {
    const source = rawValue.trim();
    if (!source) {
      return;
    }

    rememberCommand(source);

    const [commandRaw, ...rest] = source.split(/\s+/);
    const command = commandRaw.toLowerCase();
    const args = rest.map((item) => item.toLowerCase());
    const numericValue = Number(args.join(" ").replace(",", "."));
    const firstNumeric = Number((args[0] ?? "").replace(",", "."));
    const secondNumeric = Number((args[1] ?? "").replace(",", "."));
    const thirdNumeric = Number((args[2] ?? "").replace(",", "."));
    const currentValue = getCommandTargetCurrentValue(commandTarget);

    if (applyLibraryShortcut(command)) {
      setCommandQuery("");
      return;
    }

    if ((command === "set" || command === "dim") && Number.isFinite(numericValue) && numericValue > 0) {
      applyCommandDimension(Math.round(numericValue));
      setCommandQuery("");
      return;
    }

    if (command === "frame" && Number.isFinite(numericValue) && numericValue > 0) {
      const nextValue = Math.round(numericValue);
      setOuterFrameThickness(nextValue);
      setCommandTarget({ type: "frame-thickness", label: `Kasa Kalinligi - ${nextValue} mm` });
      setCommandStatus(`Kasa kalinligi ${nextValue} mm yapildi`);
      setCommandQuery("");
      return;
    }

    if ((command === "mullion" || command === "bar") && Number.isFinite(numericValue) && numericValue > 0) {
      const nextValue = Math.round(numericValue);
      setMullionThickness(nextValue);
      setCommandTarget({ type: "mullion-thickness", label: `Kayit Kalinligi - ${nextValue} mm` });
      setCommandStatus(`Kayit kalinligi ${nextValue} mm yapildi`);
      setCommandQuery("");
      return;
    }

    if ((command === "guide" || command === "gv" || command === "gh") && args[0]) {
      if ((command === "guide" && (args[0] === "v" || args[0] === "vertical")) || command === "gv") {
        const position = Number((command === "gv" ? args[0] : args[1] ?? "").replace(",", "."));
        if (Number.isFinite(position)) {
          addReferenceGuide("vertical", position);
          setToolMode("select");
          setCommandStatus(`Dikey guide ${Math.round(position)} mm eklendi`);
          setCommandQuery("");
          return;
        }
      }

      if ((command === "guide" && (args[0] === "h" || args[0] === "horizontal")) || command === "gh") {
        const position = Number((command === "gh" ? args[0] : args[1] ?? "").replace(",", "."));
        if (Number.isFinite(position)) {
          addReferenceGuide("horizontal", position);
          setToolMode("select");
          setCommandStatus(`Yatay guide ${Math.round(position)} mm eklendi`);
          setCommandQuery("");
          return;
        }
      }
    }

    if (command === "osnap") {
      if (!args[0] || args[0] === "on" || args[0] === "off") {
        const nextValue = !args[0] ? !osnapEnabled : args[0] === "on";
        setOsnapEnabled(nextValue);
        setCommandStatus(`OSNAP ${nextValue ? "acildi" : "kapandi"}`);
        setCommandQuery("");
        return;
      }

      const modeMap: Record<string, keyof OsnapModes> = {
        end: "endpoint",
        endpoint: "endpoint",
        mid: "midpoint",
        midpoint: "midpoint",
        cen: "center",
        center: "center",
        int: "intersection",
        intersection: "intersection"
      };
      const nextMode = modeMap[args[0]];
      if (nextMode) {
        setOsnapModes((current) => ({
          ...current,
          [nextMode]: !current[nextMode]
        }));
        setCommandStatus(`OSNAP ${args[0].toUpperCase()} degisti`);
        setCommandQuery("");
        return;
      }
    }

    if (command === "ortho") {
      const nextValue = !args[0] ? !orthoMode : args[0] === "on" || args[0] === "1";
      setOrthoMode(nextValue);
      setCommandStatus(`ORTHO ${nextValue ? "acik" : "kapali"}`);
      setCommandQuery("");
      return;
    }

    if (command === "polar") {
      if (!args[0] || args[0] === "on" || args[0] === "off") {
        const nextValue = !args[0] ? !polarMode : args[0] === "on";
        setPolarMode(nextValue);
        setCommandStatus(`POLAR ${nextValue ? `${polarAngle}° acik` : "kapali"}`);
        setCommandQuery("");
        return;
      }

      if (Number.isFinite(firstNumeric) && firstNumeric > 0) {
        const nextAngle = clamp(Math.round(firstNumeric), 5, 90);
        setPolarAngle(nextAngle);
        setPolarMode(true);
        setCommandStatus(`POLAR aci ${nextAngle}° yapildi`);
        setCommandQuery("");
        return;
      }
    }

    if ((command === "offset" || command === "off") && (args[0] === "panel" || args[0] === "row" || args[0] === "block") && Number.isFinite(secondNumeric) && secondNumeric !== 0) {
      const count = Number.isFinite(thirdNumeric) && thirdNumeric >= 1 ? Math.round(thirdNumeric) : 1;
      if (args[0] === "row") {
        offsetSelectedTransomPattern(secondNumeric, count);
        setCommandStatus(`Secili satir ${Math.abs(Math.round(secondNumeric))} mm offset ritmiyle bolundu`);
      } else {
        const useBlockOffset =
          args[0] === "block" || (multiSelection.length > 1 && multiSelectionInfo?.sameTransom && multiSelectionInfo.contiguous);
        if (useBlockOffset) {
          offsetPanelGroupPattern(useBlockOffset && multiSelection.length > 1 ? multiSelection : activePanelBlockRefs, secondNumeric, count);
          setCommandStatus(`Secili blok ${Math.abs(Math.round(secondNumeric))} mm offset ritmiyle bolundu`);
        } else {
          offsetSelectedPanelPattern(secondNumeric, count);
          setCommandStatus(`Secili panel ${Math.abs(Math.round(secondNumeric))} mm offset ritmiyle bolundu`);
        }
      }
      setCommandQuery("");
      return;
    }

    if ((command === "offset" || command === "off") && Number.isFinite(firstNumeric) && firstNumeric !== 0) {
      setInteractivePlacement({
        type: "offset",
        delta: Math.round(firstNumeric),
        count: Number.isFinite(secondNumeric) && secondNumeric >= 2 ? Math.round(secondNumeric) : undefined
      });
      setCommandStatus(
        Number.isFinite(secondNumeric) && secondNumeric >= 2
          ? "Referans cizgiyi sec: paralel guide zinciri olusturulacak"
          : "Referans cizgiyi sec: kayit, satir ayirici, kasa veya guide"
      );
      setCommandQuery("");
      return;
    }

    if ((command === "trim" || command === "extend") && args[0]) {
      const operation = command as "trim" | "extend";
      const edge = args[0];
      const amount = Number((args[1] ?? "").replace(",", "."));
      if (["left", "right"].includes(edge) && Number.isFinite(amount) && amount > 0) {
        if (applyPanelEdgeAdjust(edge as "left" | "right", amount, operation)) {
          setCommandQuery("");
          return;
        }
      }
      if (["top", "bottom"].includes(edge) && Number.isFinite(amount) && amount > 0) {
        if (applyTransomEdgeAdjust(edge as "top" | "bottom", amount, operation)) {
          setCommandQuery("");
          return;
        }
      }
    }

    if (command === "center" || command === "centre") {
      const mode = args[0] === "row" || args[0] === "rows" ? "row" : "panel";
      if (applyCenterCommand(mode)) {
        setCommandQuery("");
        return;
      }
    }

    if (command === "align" && args[0] === "guide") {
      const axis = args[1] ?? "center";
      const normalized =
        axis === "left" || axis === "start"
          ? "left"
          : axis === "right" || axis === "end"
            ? "right"
            : axis === "center" || axis === "centre"
              ? "center"
              : axis === "top"
                ? "top"
                : axis === "bottom"
                  ? "bottom"
                  : axis === "middle" || axis === "mid"
                    ? "middle"
                    : null;
      if (normalized && applyGuideAlignCommand(normalized)) {
        setCommandQuery("");
        return;
      }
    }

    if (command === "align" && args[0]) {
      const axis = args[0];
      const normalized =
        axis === "left" || axis === "start"
          ? "left"
          : axis === "right" || axis === "end"
            ? "right"
            : axis === "center" || axis === "centre"
              ? "center"
              : axis === "top"
                ? "top"
                : axis === "bottom"
                  ? "bottom"
                  : axis === "middle" || axis === "mid"
                    ? "middle"
                    : null;
      if (normalized && applyAlignCommand(normalized)) {
        setCommandQuery("");
        return;
      }
    }

    if (command === "distribute" || command === "dist") {
      const mode =
        args[0] === "row" || args[0] === "rows" || args[0] === "height"
          ? "row"
          : "panel";
      if (applyDistributeCommand(mode)) {
        setCommandQuery("");
        return;
      }
    }

    if (command === "match" && args[0]) {
      const mode =
        args[0] === "height" || args[0] === "row" || args[0] === "rows"
          ? "row"
          : "panel";
      if (applyMatchCommand(mode)) {
        setCommandQuery("");
        return;
      }
    }

    if (command === "splitv" || command === "sv") {
      splitSelectedPanelVertical();
      setCommandStatus("Dikey bolme uygulandi");
      setCommandQuery("");
      return;
    }

    if (command === "splith" || command === "sh") {
      splitSelectedTransomHorizontal();
      setCommandStatus("Yatay bolme uygulandi");
      setCommandQuery("");
      return;
    }

    if (command === "mirror") {
      const axis = args[0];
      if (axis === "h" || axis === "horizontal") {
        mirrorTransomStack();
        setCommandStatus("Satir istifi yatay eksende aynalandi");
      } else if (axis === "v" || axis === "vertical") {
        mirrorSelectedRow();
        setCommandStatus("Secili satir dikey eksende aynalandi");
      } else {
        setInteractivePlacement({ type: "mirror", phase: "axis" });
        setCommandStatus("Ayna eksenini sec: dikey veya yatay eksen cizgisine tikla");
      }
      setCommandQuery("");
      return;
    }

    if (["fixed", "right", "left", "tilt", "slide"].includes(command)) {
      const map: Record<string, OpeningType> = {
        fixed: "fixed",
        right: "turn-right",
        left: "turn-left",
        tilt: "tilt-turn-right",
        slide: "sliding"
      };
      setSelectedOpeningType(map[command]);
      setCommandStatus(`Acilim tipi ${formatOpeningLabel(map[command])} olarak guncellendi`);
      setCommandQuery("");
      return;
    }

    if ((command === "glass" || command === "cam") && args[0]) {
      const nextGlass = glassTypeOptions.find((item) => item.value === args[0] || item.label.toLowerCase().includes(args.join(" ")));
      if (nextGlass) {
        setGlassType(nextGlass.value);
        setCommandStatus(`Cam tipi ${nextGlass.label} yapildi`);
        setCommandQuery("");
        return;
      }
    }

    if (command === "layer" && args[0] && args[1]) {
      const layer = args[0] as keyof typeof visibleLayers;
      const value = args[1];
      if (layer in visibleLayers) {
        setVisibleLayers((current) => ({
          ...current,
          [layer]: value === "on" || value === "acik" || value === "1"
        }));
        setCommandStatus(`Katman ${layer} ${value}`);
        setCommandQuery("");
        return;
      }
    }

    if (command === "guide" && args[0] === "lock" && selectedObject?.type === "guide") {
      toggleGuideLock(selectedObject.guideId);
      setCommandStatus("Guide kilidi degisti");
      setCommandQuery("");
      return;
    }

    if (command === "guide" && args[0] === "unlock" && selectedObject?.type === "guide") {
      toggleGuideLock(selectedObject.guideId);
      setCommandStatus("Guide kilidi acildi");
      setCommandQuery("");
      return;
    }

    if (command === "guide" && (args[0] === "del" || args[0] === "delete") && selectedObject?.type === "guide") {
      removeGuide(selectedObject.guideId);
      setSelectedObject(null);
      setCommandTarget(null);
      setCommandStatus("Guide silindi");
      setCommandQuery("");
      return;
    }

    if (command === "move" && Number.isFinite(firstNumeric) && firstNumeric !== 0) {
      if (applyMoveDisplacement(firstNumeric, "panel")) {
        setCommandQuery("");
        return;
      }
    }

    if (command === "move" && (args[0] === "row" || args[0] === "rows") && Number.isFinite(secondNumeric) && secondNumeric !== 0) {
      if (applyMoveDisplacement(secondNumeric, "row")) {
        setCommandQuery("");
        return;
      }
    }

    if (command === "grid" || (command === "array" && args[0] === "grid")) {
      const columnSource = command === "grid" ? Number((args[0] ?? "").replace(",", ".")) : Number((args[1] ?? "").replace(",", "."));
      const rowSource = command === "grid" ? Number((args[1] ?? "").replace(",", ".")) : Number((args[2] ?? "").replace(",", "."));
      const columnStepSource = command === "grid" ? Number((args[2] ?? "").replace(",", ".")) : Number((args[3] ?? "").replace(",", "."));
      const rowStepSource = command === "grid" ? Number((args[3] ?? "").replace(",", ".")) : Number((args[4] ?? "").replace(",", "."));

      if (Number.isFinite(columnSource) && columnSource >= 2 && Number.isFinite(rowSource) && rowSource >= 2) {
        const columns = Math.round(columnSource);
        const rows = Math.round(rowSource);
        const columnStepMm = Number.isFinite(columnStepSource) && columnStepSource > 1 ? Math.round(columnStepSource) : undefined;
        const rowStepMm = Number.isFinite(rowStepSource) && rowStepSource > 1 ? Math.round(rowStepSource) : undefined;

        arraySelectedGrid(columns, rows, columnStepMm, rowStepMm);
        setCommandStatus(
          columnStepMm || rowStepMm
            ? `${columns}x${rows} grid modulu ritim kontrollu olusturuldu`
            : `${columns}x${rows} grid modulu olusturuldu`
        );
        setCommandQuery("");
        return;
      }
    }

    if (command === "array") {
      const mode = args[0] === "row" || args[0] === "rows" ? "row" : args[0] === "col" || args[0] === "column" || args[0] === "columns" ? "panel" : "panel";
      const countSource = mode === "panel" && Number.isFinite(numericValue) ? numericValue : Number((args[1] ?? "").replace(",", "."));
      const stepSource = mode === "panel" ? Number((args[1] ?? "").replace(",", ".")) : Number((args[2] ?? "").replace(",", "."));
      if (Number.isFinite(countSource) && countSource >= 2) {
        const count = Math.round(countSource);
        const stepMm = Number.isFinite(stepSource) && stepSource > 1 ? Math.round(stepSource) : undefined;
        if (mode === "row") {
          arraySelectedTransom(count, stepMm);
          setCommandStatus(
            stepMm
              ? `${count}'li satir dizisi ${stepMm} mm ritimle olusturuldu`
              : `${count}'li satir dizisi olusturuldu`
          );
        } else {
          arraySelectedPanel(count, stepMm);
          setCommandStatus(
            stepMm
              ? `${count}'lu panel dizisi ${stepMm} mm ritimle olusturuldu`
              : `${count}'lu panel dizisi olusturuldu`
          );
        }
        setCommandQuery("");
        return;
      }
    }

    if (command === "copy" && Number.isFinite(firstNumeric) && firstNumeric >= 2) {
      if (multiSelection.length > 1 && (!multiSelectionInfo?.sameTransom || !multiSelectionInfo.contiguous)) {
        setCommandStatus("Coklu copy icin secim ayni satirda bitisik panellerden olusmali");
        setCommandQuery("");
        return;
      }

      setInteractivePlacement({
        type: "copy",
        mode: "panel",
        phase: "base",
        repeatCount: Math.round(firstNumeric),
        stepMm: Number.isFinite(secondNumeric) && secondNumeric > 1 ? Math.round(secondNumeric) : undefined,
        axisLock: null,
        lockedDistanceMm: null,
        lockedVectorMm: null
      });
      setCommandStatus(`Kaynak noktayi sec: ${Math.round(firstNumeric)} adet panel kopyasi hazirlaniyor`);
      setCommandQuery("");
      return;
    }

    if (command === "copy" && (args[0] === "row" || args[0] === "rows") && Number.isFinite(secondNumeric) && secondNumeric >= 2) {
      setInteractivePlacement({
        type: "copy",
        mode: "row",
        phase: "base",
        repeatCount: Math.round(secondNumeric),
        stepMm: Number.isFinite(thirdNumeric) && thirdNumeric > 1 ? Math.round(thirdNumeric) : undefined,
        axisLock: null,
        lockedDistanceMm: null,
        lockedVectorMm: null
      });
      setCommandStatus(`Kaynak noktayi sec: ${Math.round(secondNumeric)} adet satir kopyasi hazirlaniyor`);
      setCommandQuery("");
      return;
    }

    if (command === "copy" && !args[0]) {
      if (multiSelection.length > 1 && (!multiSelectionInfo?.sameTransom || !multiSelectionInfo.contiguous)) {
        setCommandStatus("Coklu copy icin secim ayni satirda bitisik panellerden olusmali");
        setCommandQuery("");
        return;
      }
      const mode = selectedObject?.type === "transom-bar" ? "row" : "panel";
      setInteractivePlacement({ type: "copy", mode, phase: "base", axisLock: null, lockedDistanceMm: null, lockedVectorMm: null });
      setCommandStatus(
        mode === "row"
          ? "Kaynak noktayi sec: secili satirdan referans alinacak"
          : "Kaynak noktayi sec: secili panelden referans alinacak"
      );
      setCommandQuery("");
      return;
    }

    if (command === "move" && !args[0]) {
      if (multiSelection.length > 1 && (!multiSelectionInfo?.sameTransom || !multiSelectionInfo.contiguous)) {
        setCommandStatus("Coklu move icin secim ayni satirda bitisik panellerden olusmali");
        setCommandQuery("");
        return;
      }
      const mode = selectedObject?.type === "transom-bar" ? "row" : "panel";
      setInteractivePlacement({ type: "move", mode, phase: "base", axisLock: null, lockedDistanceMm: null, lockedVectorMm: null });
      setCommandStatus(
        mode === "row"
          ? "Kaynak noktayi sec: tasinacak satiri referansla"
          : "Kaynak noktayi sec: tasinacak paneli referansla"
      );
      setCommandQuery("");
      return;
    }

    if ((command === "copy" || command === "add") && args[0]) {
      if (args[0] === "left" || args[0] === "right") {
        insertPanelAdjacent(args[0]);
        setCommandStatus(`Panele ${args[0] === "left" ? "sol" : "sag"} ek yapildi`);
        setCommandQuery("");
        return;
      }

      if (args[0] === "top" || args[0] === "bottom") {
        insertTransomAdjacent(args[0]);
        setCommandStatus(`Satira ${args[0] === "top" ? "ust" : "alt"} ek yapildi`);
        setCommandQuery("");
        return;
      }
    }

    if (command === "equal" || command === "eq") {
      if (multiSelection.length > 1) {
        equalizePanelsByRefs(multiSelection);
        setCommandStatus("Secili paneller esit dagitildi");
      } else {
        equalizeSelectedRowPanels();
        setCommandStatus("Secili satir esit dagitildi");
      }
      setCommandQuery("");
      return;
    }

    if (command === "help" || command === "?") {
      setCommandStatus("Komutlar: set 900, move 120, move row -80, trim left 80, extend right 60, align left/right/top/bottom/center, align guide left/right/center/top/bottom/middle, distribute, distribute rows, match width, match height, center, center row, copy, copy 3 50, offset -50 3, offset panel 300 3, offset block 300 2, offset row 400 2, mirror, array 4 25, array row 3 50, array grid 3 2 25 50, guide v 600, osnap, ortho, polar 45, lib triple. Placement: X/Y kilit, F sifirla, F3 OSNAP, F8 ORTHO, F10 POLAR, mm veya dx,dy vektor lock.");
      setCommandQuery("");
      return;
    }

    if ((command === "lib" || command === "module") && args[0] && applyLibraryShortcut(args[0])) {
      setCommandQuery("");
      return;
    }

    setCommandStatus(`Komut anlasilmadi: ${source}`);
  }

  function focusPanelRef(ref: PanelRef) {
    const transom = design.transoms.find((item) => item.id === ref.transomId);
    const panel = transom?.panels.find((item) => item.id === ref.panelId);
    if (!transom || !panel) {
      return;
    }

    selectPanel(ref.transomId, ref.panelId);
    setMultiSelection([ref]);
    setRailTab("inspector");
    setSelectedObject({
      type: "panel",
      transomId: ref.transomId,
      panelId: ref.panelId
    });
    setCommandTarget({
      type: "panel-width",
      transomId: ref.transomId,
      panelId: ref.panelId,
      label: `Panel Genisligi - ${panel.width} mm`
    });
  }

  function focusTransom(transomId: string) {
    const transom = design.transoms.find((item) => item.id === transomId);
    const panel = transom?.panels[0];
    if (!transom || !panel) {
      return;
    }

    focusPanelRef({ transomId, panelId: panel.id });
    setSelectedObject({ type: "transom-bar", transomId });
    setCommandTarget({
      type: "transom-height",
      transomId,
      label: `Satir Yuksekligi - ${transom.height} mm`
    });
  }

  function selectCanvasObject(nextObject: CanvasObjectSelection, options?: ObjectSelectOptions) {
    setSelectedObject(nextObject);
    setRailTab("inspector");

    if (nextObject.type === "outer-frame") {
      if (!options?.preserveMultiSelection) {
        setMultiSelection([]);
      }
      setCommandTarget({
        type: "frame-thickness",
        label: `Kasa Kalinligi - ${design.outerFrameThickness} mm`
      });
      return;
    }

    if (nextObject.type === "guide") {
      if (!options?.preserveMultiSelection) {
        setMultiSelection([]);
      }
      const guide = design.guides.find((item) => item.id === nextObject.guideId);
      if (!guide) {
        return;
      }
      setCommandTarget({
        type: "guide-position",
        guideId: guide.id,
        orientation: guide.orientation,
        label: `${guide.orientation === "vertical" ? "Dikey" : "Yatay"} Guide - ${guide.positionMm} mm`
      });
      return;
    }

    if (nextObject.type === "transom-bar") {
      const transom = design.transoms.find((item) => item.id === nextObject.transomId);
      const anchorPanel = transom?.panels[0];
      if (transom && anchorPanel) {
        selectPanel(transom.id, anchorPanel.id);
        if (!options?.preserveMultiSelection) {
          setMultiSelection([{ transomId: transom.id, panelId: anchorPanel.id }]);
        }
      }
      setCommandTarget({
        type: "mullion-thickness",
        label: `Kayit Kalinligi - ${design.mullionThickness} mm`
      });
      return;
    }

    if (nextObject.type === "mullion") {
      selectPanel(nextObject.transomId, nextObject.panelId);
      if (!options?.preserveMultiSelection) {
        setMultiSelection([{ transomId: nextObject.transomId, panelId: nextObject.panelId }]);
      }
      setCommandTarget({
        type: "mullion-thickness",
        label: `Kayit Kalinligi - ${design.mullionThickness} mm`
      });
      return;
    }

    selectPanel(nextObject.transomId, nextObject.panelId);
    if (!options?.preserveMultiSelection) {
      setMultiSelection([{ transomId: nextObject.transomId, panelId: nextObject.panelId }]);
    }
    setCommandTarget({
      type: "panel-width",
      transomId: nextObject.transomId,
      panelId: nextObject.panelId,
      label: `Panel Genisligi - ${
        design.transoms.find((item) => item.id === nextObject.transomId)?.panels.find((item) => item.id === nextObject.panelId)?.width ?? 0
      } mm`
    });
  }

  function applyInteractiveCanvasTarget(target: InteractiveCanvasTarget) {
    if (!interactivePlacement) {
      return;
    }

    if (target.kind === "base-point") {
      if (interactivePlacement.type === "copy" || interactivePlacement.type === "move") {
        setInteractivePlacement({
          ...interactivePlacement,
          phase: "target",
          basePoint: target.point
        });
        setCommandStatus(
          interactivePlacement.type === "copy"
            ? "Hedef noktayi sec: X/Y ile eksen kilitle, mm girerek mesafe lock koy"
            : "Hedef noktayi sec: X/Y ile eksen kilitle, mm girerek mesafe lock koy"
        );
      }
      return;
    }

    if (target.kind === "mirror-axis") {
      if (target.axis === "horizontal") {
        mirrorTransomStack();
        setCommandStatus("Satir istifi yatay eksende aynalandi");
      } else {
        mirrorSelectedRow();
        setCommandStatus("Secili satir dikey eksende aynalandi");
      }
      setInteractivePlacement(null);
      return;
    }

    if (target.kind === "offset-target" && interactivePlacement.type === "offset") {
      if (interactivePlacement.count && interactivePlacement.count >= 2 && target.guideMeta) {
        const limit =
          target.guideMeta.orientation === "vertical"
            ? design.totalWidth
            : design.totalHeight;
        Array.from({ length: interactivePlacement.count }, (_, index) => {
          const position = target.guideMeta!.positionMm + interactivePlacement.delta * (index + 1);
          if (position >= 0 && position <= limit) {
            addReferenceGuide(
              target.guideMeta!.orientation,
              position,
              `${target.guideMeta!.orientation === "vertical" ? "V" : "H"} ${Math.round(position)}`
            );
          }
        });
        setCommandStatus(`${interactivePlacement.count} paralel guide olusturuldu`);
      } else {
        const currentValue = getCommandTargetCurrentValue(target.target);
        if (currentValue !== null) {
          applyCommandDimension(Math.max(1, Math.round(currentValue + interactivePlacement.delta)), target.target);
        }
      }
      setInteractivePlacement(null);
      return;
    }

    if ((interactivePlacement.type === "copy" || interactivePlacement.type === "move") && interactivePlacement.phase === "target") {
      if (target.kind === "panel") {
        let resolvedTransomId = target.transomId;
        let resolvedPanelId = target.panelId;
        let rerouteLabel: string | null = null;
        const repeatCount = Math.max(1, interactivePlacement.repeatCount ?? 1);
        const usingBlock = multiSelection.length > 1 && multiSelectionInfo?.sameTransom && multiSelectionInfo.contiguous;
        const sourceSpanMm = usingBlock
          ? multiSelectionInfo.panels.reduce((sum, item) => sum + item.panel.width, 0)
          : selectedPanel?.panel.width ?? 0;
        const minimumSpanMm = usingBlock ? multiSelectionInfo.panels.length * 100 : 100;
        const sameTransomMove =
          interactivePlacement.type === "move" &&
          ((usingBlock && multiSelectionInfo?.transomId === target.transomId) ||
            (!usingBlock && selected?.transomId === target.transomId));

        if (!sameTransomMove) {
          const fit = analyzePanelPlacementFit(
            design,
            resolvedTransomId,
            resolvedPanelId,
            sourceSpanMm,
            repeatCount,
            minimumSpanMm,
            interactivePlacement.stepMm
          );
          if (!fit) {
            const alternative = findAlternativePanelPlacement(
              design,
              sourceSpanMm,
              repeatCount,
              minimumSpanMm,
              interactivePlacement.stepMm,
              `${target.transomId}:${target.panelId}`
            );
            if (!alternative) {
              setCommandStatus("Hedef panel bu yerlesimi alamiyor");
              return;
            }
            resolvedTransomId = alternative.transomId;
            resolvedPanelId = alternative.panelId;
            rerouteLabel = alternative.label;
          }
        }

        if (interactivePlacement.type === "copy") {
          if (multiSelection.length > 1 && multiSelectionInfo?.sameTransom && multiSelectionInfo.contiguous) {
            if (interactivePlacement.repeatCount && interactivePlacement.repeatCount >= 2) {
              copyPanelGroupRepeatedToTarget(
                multiSelection,
                resolvedTransomId,
                resolvedPanelId,
                target.side,
                interactivePlacement.repeatCount,
                interactivePlacement.stepMm
              );
              setCommandStatus(
                `${interactivePlacement.repeatCount} adet panel blogu hedefe kopyalandi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
              );
            } else {
              copyPanelGroupToTarget(multiSelection, resolvedTransomId, resolvedPanelId, target.side);
              setCommandStatus(
                `Secili panel blogu ${target.side === "left" ? "sol" : "sag"} hedefe kopyalandi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
              );
            }
          } else {
            if (interactivePlacement.repeatCount && interactivePlacement.repeatCount >= 2) {
              copySelectedPanelRepeatedToTarget(
                resolvedTransomId,
                resolvedPanelId,
                target.side,
                interactivePlacement.repeatCount,
                interactivePlacement.stepMm
              );
              setCommandStatus(
                `${interactivePlacement.repeatCount} adet panel hedefe kopyalandi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
              );
            } else {
              copySelectedPanelToTarget(resolvedTransomId, resolvedPanelId, target.side);
              setCommandStatus(
                `Panel ${target.side === "left" ? "sol" : "sag"} hedefe kopyalandi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
              );
            }
          }
        } else {
          if (multiSelection.length > 1 && multiSelectionInfo?.sameTransom && multiSelectionInfo.contiguous) {
            movePanelGroupToTarget(multiSelection, resolvedTransomId, resolvedPanelId, target.side);
            setCommandStatus(
              `Secili panel blogu ${target.side === "left" ? "sol" : "sag"} konuma tasindi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
            );
          } else {
            moveSelectedPanelToTarget(resolvedTransomId, resolvedPanelId, target.side);
            setCommandStatus(
              `Panel ${target.side === "left" ? "sol" : "sag"} konuma tasindi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
            );
          }
        }
      }

      if (target.kind === "row") {
        let resolvedTransomId = target.transomId;
        let rerouteLabel: string | null = null;
        const repeatCount = Math.max(1, interactivePlacement.repeatCount ?? 1);
        const sameRowMove = interactivePlacement.type === "move";
        if (!sameRowMove) {
          const sourceSpanMm = selectedPanel?.transom.height ?? 0;
          const fit = analyzeRowPlacementFit(
            design,
            resolvedTransomId,
            sourceSpanMm,
            repeatCount,
            interactivePlacement.stepMm
          );
          if (!fit) {
            const alternative = findAlternativeRowPlacement(
              design,
              sourceSpanMm,
              repeatCount,
              interactivePlacement.stepMm,
              target.transomId
            );
            if (!alternative) {
              setCommandStatus("Hedef satir bu yerlesimi alamiyor");
              return;
            }
            resolvedTransomId = alternative.transomId;
            rerouteLabel = alternative.label;
          }
        }

        if (interactivePlacement.type === "copy") {
          if (interactivePlacement.repeatCount && interactivePlacement.repeatCount >= 2) {
            copySelectedTransomRepeatedToTarget(
              resolvedTransomId,
              target.side,
              interactivePlacement.repeatCount,
              interactivePlacement.stepMm
            );
            setCommandStatus(
              `${interactivePlacement.repeatCount} adet satir hedefe kopyalandi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
            );
          } else {
            copySelectedTransomToTarget(resolvedTransomId, target.side);
            setCommandStatus(
              `Satir ${target.side === "top" ? "ust" : "alt"} hedefe kopyalandi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
            );
          }
        } else {
          moveSelectedTransomToTarget(resolvedTransomId, target.side);
          setCommandStatus(
            `Satir ${target.side === "top" ? "ust" : "alt"} konuma tasindi${rerouteLabel ? ` / Auto Slot ${rerouteLabel}` : ""}`
          );
        }
      }

      setInteractivePlacement(null);
    }
  }

  function getDiagnosticActions(diagnostic: DesignDiagnostic) {
    const actions: Array<{ label: string; onClick: () => void; subtle?: boolean }> = [];

    if (diagnostic.panelId && diagnostic.transomId) {
      actions.push({
        label: "Panele Git",
        onClick: () => focusPanelRef({ transomId: diagnostic.transomId!, panelId: diagnostic.panelId! }),
        subtle: true
      });
    } else if (diagnostic.transomId) {
      actions.push({
        label: "Satira Git",
        onClick: () => focusTransom(diagnostic.transomId!),
        subtle: true
      });
    }

    if (
      diagnostic.id === "outer-frame-range" ||
      diagnostic.id === "mullion-range" ||
      diagnostic.id === "frame-series-mismatch" ||
      diagnostic.id === "mullion-series-mismatch"
    ) {
      actions.push({
        label: "Seriyle Senkronla",
        onClick: () => {
          setOuterFrameThickness(profileSpec.recommendedFrameMm);
          setMullionThickness(profileSpec.recommendedMullionMm);
        }
      });
    }

    if (
      diagnostic.id === "total-height-mismatch" ||
      diagnostic.id.startsWith("row-min-height-") ||
      diagnostic.id.startsWith("row-max-height-")
    ) {
      actions.push({
        label: "Satirlari Dengele",
        onClick: equalizeAllTransomHeights
      });
    }

    if (diagnostic.id.startsWith("row-width-") && diagnostic.transomId) {
      actions.push({
        label: "Satiri Esitle",
        onClick: () => {
          focusTransom(diagnostic.transomId!);
          equalizeSelectedRowPanels();
        }
      });
    }

    if (
      nextProfileSeries &&
      (diagnostic.id.startsWith("panel-series-") ||
        diagnostic.id.startsWith("panel-area-limit-") ||
        diagnostic.id === "frame-series-mismatch" ||
        diagnostic.id === "mullion-series-mismatch")
    ) {
      actions.push({
        label: "Seriyi Yukselt",
        onClick: () => setProfileSeries(nextProfileSeries)
      });
    }

    if (nextHardwareQuality && diagnostic.id.startsWith("panel-weight-limit-")) {
      actions.push({
        label: "Donanimi Guclendir",
        onClick: () => setHardwareQuality(nextHardwareQuality)
      });
    }

    if (
      diagnostic.panelId &&
      diagnostic.transomId &&
      (diagnostic.id.startsWith("panel-operable-max-") ||
        diagnostic.id.startsWith("panel-series-width-") ||
        diagnostic.id.startsWith("panel-area-limit-") ||
        diagnostic.id.startsWith("panel-weight-limit-"))
    ) {
      actions.push({
        label: "Kanadi Bol",
        onClick: () => {
          focusPanelRef({ transomId: diagnostic.transomId!, panelId: diagnostic.panelId! });
          splitSelectedPanelVertical();
        }
      });
    }

    if (
      diagnostic.panelId &&
      diagnostic.transomId &&
      (diagnostic.id.startsWith("panel-operable-width-") ||
        diagnostic.id.startsWith("panel-operable-height-") ||
        diagnostic.id.startsWith("panel-min-width-") ||
        diagnostic.id.startsWith("panel-weight-limit-"))
    ) {
      actions.push({
        label: "Sabit Yap",
        onClick: () => {
          focusPanelRef({ transomId: diagnostic.transomId!, panelId: diagnostic.panelId! });
          setSelectedOpeningType("fixed");
        }
      });
    }

    return actions.slice(0, 3);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingSurface =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";

      if (event.code === "Space") {
        setSpacePressed(true);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
      if (event.ctrlKey && event.key === "0") {
        event.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
      if (event.ctrlKey && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        setZoom((value) => Math.min(2.5, Number((value + 0.1).toFixed(2))));
      }
      if (event.ctrlKey && event.key === "-") {
        event.preventDefault();
        setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(2))));
      }
      if (event.key === "F3") {
        event.preventDefault();
        setOsnapEnabled((current) => {
          const next = !current;
          setCommandStatus(`OSNAP ${next ? "acildi" : "kapandi"}`);
          return next;
        });
      }
      if (event.key === "F8") {
        event.preventDefault();
        setOrthoMode((current) => {
          const next = !current;
          setCommandStatus(`ORTHO ${next ? "acik" : "kapali"}`);
          return next;
        });
      }
      if (event.key === "F10") {
        event.preventDefault();
        setPolarMode((current) => {
          const next = !current;
          setCommandStatus(`POLAR ${next ? `${polarAngle}° acik` : "kapali"}`);
          return next;
        });
      }
      if (isTypingSurface) {
        return;
      }
      if (!event.ctrlKey && !event.altKey) {
        if (event.key === "Escape") {
          setCommandValue("");
          setCommandQuery("");
          setInteractivePlacement(null);
        }
        if (
          interactivePlacement &&
          (interactivePlacement.type === "copy" || interactivePlacement.type === "move") &&
          interactivePlacement.phase === "target"
        ) {
          if (event.key.toLowerCase() === "x") {
            event.preventDefault();
            updatePlacementLock((current) => ({
              ...current,
              axisLock: current.axisLock === "x" ? null : "x",
              lockedVectorMm: null
            }));
            setCommandStatus("Yatay eksen kilidi guncellendi");
            return;
          }
          if (event.key.toLowerCase() === "y") {
            event.preventDefault();
            updatePlacementLock((current) => ({
              ...current,
              axisLock: current.axisLock === "y" ? null : "y",
              lockedVectorMm: null
            }));
            setCommandStatus("Dikey eksen kilidi guncellendi");
            return;
          }
          if (event.key.toLowerCase() === "f") {
            event.preventDefault();
            updatePlacementLock((current) => ({
              ...current,
              axisLock: null,
              lockedDistanceMm: null,
              lockedVectorMm: null
            }));
            setCommandStatus("Placement kilitleri temizlendi");
            return;
          }
        }
        if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && panelShiftRange) {
          event.preventDefault();
          const step = (event.shiftKey ? snapMm * 5 : snapMm) * (event.key === "ArrowRight" ? 1 : -1);
          applyMoveDisplacement(step, "panel");
        }
        if ((event.key === "ArrowUp" || event.key === "ArrowDown") && selectedObject?.type === "transom-bar" && transomShiftRange) {
          event.preventDefault();
          const step = (event.shiftKey ? snapMm * 5 : snapMm) * (event.key === "ArrowDown" ? 1 : -1);
          applyMoveDisplacement(step, "row");
        }
        if (event.key.toLowerCase() === "v") {
          event.preventDefault();
          splitSelectedPanelVertical();
        }
        if (event.key.toLowerCase() === "h") {
          event.preventDefault();
          splitSelectedTransomHorizontal();
        }
        if (event.key.toLowerCase() === "e" && multiSelection.length > 1) {
          event.preventDefault();
          equalizePanelsByRefs(multiSelection);
        }
        if (event.key.toLowerCase() === "r" && multiSelection.length > 1) {
          event.preventDefault();
          equalizeTransomsByRefs(multiSelection);
        }
        if (event.key.toLowerCase() === "m") {
          event.preventDefault();
          mirrorSelectedRow();
        }
        if (event.key === "Delete" && event.shiftKey) {
          event.preventDefault();
          deleteSelectedTransom();
        } else if (event.key === "Delete") {
          event.preventDefault();
          deleteSelectedPanel();
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    applyMoveDisplacement,
    deleteSelectedPanel,
    deleteSelectedTransom,
    equalizePanelsByRefs,
    equalizeTransomsByRefs,
    interactivePlacement,
    mirrorTransomStack,
    mirrorSelectedRow,
    multiSelection,
    panelShiftRange,
    redo,
    selectedObject,
    splitSelectedPanelVertical,
    splitSelectedTransomHorizontal,
    snapMm,
    polarAngle,
    transomShiftRange,
    updatePlacementLock,
    undo
  ]);

  async function handleSaveProject() {
    if (!window.desktopApi) {
      return;
    }

    await window.desktopApi.saveProject({
      suggestedName: design.name.replace(/\s+/g, "-").toLowerCase(),
      content: design
    });
  }

  async function handleOpenProject() {
    if (!window.desktopApi) {
      return;
    }

    const result = await window.desktopApi.openProject();
    if (!result.canceled && result.content) {
      replaceDesign(result.content, result.path);
    }
  }

  function handleOpenNewProjectDialog() {
    setNewProjectDraft({
      name: "Yeni Proje",
      width: String(design.totalWidth),
      height: String(design.totalHeight)
    });
    setNewProjectDialogOpen(true);
  }

  function handleCreateBlankProject() {
    const width = Math.max(600, Math.round(Number(newProjectDraft.width) || 0));
    const height = Math.max(600, Math.round(Number(newProjectDraft.height) || 0));
    const nextDesign = createBlankDesign({
      name: newProjectDraft.name.trim() || "Yeni Proje",
      totalWidth: width,
      totalHeight: height,
      outerFrameThickness: design.outerFrameThickness,
      mullionThickness: design.mullionThickness,
      materials: design.materials
    });

    replaceDesign(nextDesign);
    setViewMode("studio");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedObject({ type: "outer-frame" });
    setMultiSelection([]);
    setCommandTarget(null);
    setCommandQuery("");
    setCommandValue("");
    setNewProjectDialogOpen(false);
    setCommandStatus(`Bos proje ${width} x ${height} mm olarak olusturuldu`);
  }

  function handleLoadGalleryTemplate(template: PvcDesign) {
    replaceDesign(cloneDesignPayload(template));
    setViewMode("studio");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedObject(null);
    setMultiSelection([]);
    setCommandTarget(null);
    setCommandStatus(`${template.name} yuklendi`);
  }

  function handleSaveCurrentAsTemplate() {
    const templateName = window.prompt("Yeni sablon adi", `${design.name} Sablonu`);
    if (!templateName?.trim()) {
      return;
    }

    const template = cloneDesignPayload(design);
    template.id = `custom-template-${Date.now()}`;
    template.name = templateName.trim();
    setCustomTemplates((current) => [template, ...current]);
    setCommandStatus(`${template.name} sablon galerisine eklendi`);
  }

  function handleEditTemplate(template: PvcDesign, source: "builtin" | "custom") {
    const nextName = window.prompt("Sablon adi", template.name);
    if (!nextName?.trim()) {
      return;
    }

    if (source === "builtin") {
      const duplicate = cloneDesignPayload(template);
      duplicate.id = `custom-template-${Date.now()}`;
      duplicate.name = nextName.trim();
      setCustomTemplates((current) => [duplicate, ...current]);
      setCommandStatus(`${duplicate.name} ozel sablon olarak eklendi`);
      return;
    }

    setCustomTemplates((current) =>
      current.map((item) => (item.id === template.id ? { ...cloneDesignPayload(item), name: nextName.trim() } : item))
    );
    setCommandStatus(`${nextName.trim()} sablonu guncellendi`);
  }

  function handleDeleteTemplate(templateId: string) {
    setCustomTemplates((current) => current.filter((item) => item.id !== templateId));
    setCommandStatus("Ozel sablon silindi");
  }

  async function handlePrintBom() {
    const html = buildManufacturingHtml(design, bom);
    if (window.desktopApi?.printBom) {
      await window.desktopApi.printBom(html);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1240,height=860");
    if (!printWindow) {
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function handlePrintTechnical() {
    const html = buildTechnicalPrintHtml(design);
    if (window.desktopApi?.printTechnical) {
      await window.desktopApi.printTechnical(html);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1400,height=920");
    if (!printWindow) {
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className={`studio-shell ${viewMode === "presentation" ? "presentation-mode" : ""}`}>
      <aside className="left-rail">
        <div className="brand-block">
          <div className="brand-mark">PD</div>
          <div>
            <p className="eyebrow bright">PVC Designer</p>
            <h1>Tasarim Studyosu</h1>
          </div>
        </div>

        <div className="mission-card">
          <p>
            Hizli cizim, net olculendirme ve kolay proje yonetimi icin
            optimize edilmis bir masaustu cizim deneyimi.
          </p>
        </div>

        <section className="rail-section">
          <h2>Proje Ayarlari</h2>
          <div className="stack-fields">
            <label>
              Proje Adi
              <input
                type="text"
                value={design.name}
                onChange={(event) => setDesignName(event.target.value)}
              />
            </label>
            <NumberField label="Genislik (mm)" value={design.totalWidth} onChange={setTotalWidth} />
            <NumberField label="Yukseklik (mm)" value={design.totalHeight} onChange={setTotalHeight} />
            <NumberField
              label="Kasa Kalinligi"
              value={design.outerFrameThickness}
              onChange={setOuterFrameThickness}
            />
            <NumberField
              label="Kayit Kalinligi"
              value={design.mullionThickness}
              onChange={setMullionThickness}
            />
          </div>
        </section>

        <section className="rail-section compact">
          <h2>Hizli Duzenleme</h2>
          <div className="dual-action-grid">
            <ActionTile
              title="Dikey Bol"
              subtitle="Secili paneli ikiye ayir"
              onClick={splitSelectedPanelVertical}
            />
            <ActionTile
              title="Yatay Bol"
              subtitle="Secili satiri ayir"
              onClick={splitSelectedTransomHorizontal}
            />
          </div>
          <div className="history-badges">
            <span className="canvas-chip">Undo {history.length}</span>
            <span className="canvas-chip">Redo {future.length}</span>
          </div>
        </section>

        <section className="rail-section compact">
          <h2>CAD Araclari</h2>
          <div className="tool-grid">
            {[
              ["select", "Sec"],
              ["split-vertical", "Dikey"],
              ["split-horizontal", "Yatay"],
              ["add-left", "Sol +"],
              ["add-right", "Sag +"],
              ["add-top", "Ust +"],
              ["add-bottom", "Alt +"],
              ["guide-vertical", "V Guide"],
              ["guide-horizontal", "H Guide"],
              ["delete-panel", "Sil"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={`tool-chip ${toolMode === value ? "active" : ""}`}
                onClick={() => setToolMode(value as ToolMode)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="snap-row">
            <span className="canvas-chip">Snap</span>
            {[1, 5, 10, 50].map((value) => (
              <button
                key={value}
                className={`snap-chip ${snapMm === value ? "active" : ""}`}
                onClick={() => setSnapMm(value)}
              >
                {value} mm
              </button>
            ))}
          </div>
          <div className="cad-ops">
            <button className="tool-chip" onClick={equalizeSelectedRowPanels}>Satiri Esitle</button>
            <button className="tool-chip" onClick={equalizeAllTransomHeights}>Satirlari Esitle</button>
            {multiSelection.length > 1 && (
              <>
                <button className="tool-chip" onClick={() => equalizePanelsByRefs(multiSelection)}>Secili Genislikleri Esitle</button>
                <button className="tool-chip" onClick={() => equalizeTransomsByRefs(multiSelection)}>Secili Satirlari Dengele</button>
              </>
            )}
          </div>
        </section>

        <section className="rail-section compact">
          <h2>Panel Tipleri</h2>
          <div className="option-pills">
            {openingTypeOptions.map((option) => (
              <button
                key={option.value}
                className={`pill-button ${
                  selectedPanel?.panel.openingType === option.value ? "active" : ""
                }`}
                onClick={() => selectedPanel && setSelectedOpeningType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="studio-main">
        <section className="hero-bar">
          <div>
            <p className="eyebrow">Aktif Proje</p>
            <h2>{design.name}</h2>
            <p className="hero-path">
              {activeProjectPath ? activeProjectPath : "Henüz kaydedilmemis calisma"}
            </p>
          </div>

          <div className="hero-actions">
            <button className="hero-button primary" onClick={handleOpenNewProjectDialog}>
              Yeni Proje
            </button>
            <button className="hero-button" onClick={handleOpenProject}>
              Ac
            </button>
            <button className="hero-button" onClick={handleSaveProject}>
              Kaydet
            </button>
            <button className="hero-button" onClick={undo}>
              Undo
            </button>
            <button className="hero-button" onClick={redo}>
              Redo
            </button>
            <button
              className={`hero-button ${viewMode === "technical" ? "primary" : "ghost"}`}
              onClick={() => setViewMode("technical")}
            >
              Teknik
            </button>
            <button
              className={`hero-button ${viewMode === "studio" ? "primary" : "ghost"}`}
              onClick={() => setViewMode("studio")}
            >
              Studyo
            </button>
            <button
              className={`hero-button ${viewMode === "presentation" ? "primary" : "ghost"}`}
              onClick={() => setViewMode("presentation")}
            >
              Sunum
            </button>
            <button className="hero-button ghost" onClick={handlePrintTechnical}>
              Teknik PDF
            </button>
            <button className="hero-button ghost" onClick={handlePrintBom}>
              BOM Yazdir
            </button>
          </div>
        </section>

        <section className="template-strip">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Hazir Baslangiclar</p>
              <h3>Sablon Galerisi</h3>
            </div>
            <div className="template-strip-actions">
              <div className="metric-badge">{design.totalWidth} x {design.totalHeight} mm</div>
              <button className="hero-button ghost compact" onClick={handleSaveCurrentAsTemplate}>
                + Sablon Ekle
              </button>
            </div>
          </div>

          <div className="template-grid">
            {galleryTemplates.map((templateEntry) => (
              <article
                key={templateEntry.id}
                className={`template-card ${templateEntry.design.id === design.id ? "selected" : ""}`}
              >
                <button className="template-surface" onClick={() => handleLoadGalleryTemplate(templateEntry.design)}>
                  <div className="template-preview">
                    <MiniTemplatePreview design={templateEntry.design} />
                  </div>
                  <div className="template-copy">
                    <strong>{templateEntry.design.name}</strong>
                    <span>
                      {templateEntry.design.totalWidth} x {templateEntry.design.totalHeight} mm
                    </span>
                    <span className="template-source-badge">
                      {templateEntry.source === "builtin" ? "Hazir" : "Ozel"}
                    </span>
                  </div>
                </button>
                <div className="template-card-actions">
                  <button
                    className="template-icon-button"
                    onClick={() => handleEditTemplate(templateEntry.design, templateEntry.source)}
                  >
                    Duzenle
                  </button>
                  {templateEntry.source === "custom" && (
                    <button
                      className="template-icon-button danger"
                      onClick={() => handleDeleteTemplate(templateEntry.design.id)}
                    >
                      Sil
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="work-grid">
          <section className="canvas-stage">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Cizim Alani</p>
                <h3>Canli Tasarim Yuzeyi</h3>
              </div>
              <div className="canvas-chip-row">
                <span className="canvas-chip">Snap acik</span>
                <span className="canvas-chip">Olcu modu</span>
                <span className="canvas-chip">Ctrl+Scroll Zoom</span>
                <span className="canvas-chip">Space Pan</span>
                <span className="canvas-chip">Guide {design.guides.length}</span>
                <span className="canvas-chip">
                  {viewMode === "studio" ? "Studyo" : viewMode === "technical" ? "Teknik" : "Sunum"}
                </span>
              </div>
            </div>

            <PvcCanvas
              design={design}
              selected={selected}
              selectedObject={selectedObject}
              multiSelection={multiSelection}
              onMultiSelectionChange={setMultiSelection}
              onObjectSelect={selectCanvasObject}
              visibleLayers={visibleLayers}
              onAddGuide={addReferenceGuide}
              onMoveGuide={setGuidePosition}
              onInsertPanel={insertPanelAdjacent}
              onInsertTransom={insertTransomAdjacent}
              viewMode={viewMode}
              toolMode={toolMode}
              onToolModeChange={setToolMode}
              commandTarget={commandTarget}
            commandPreview={commandPreview}
            panelShiftRange={panelShiftRange}
            transomShiftRange={transomShiftRange}
            activePanelBlockRefs={activePanelBlockRefs}
            selectedTransomId={selected?.transomId ?? null}
            activePanelPreviewCount={Math.max(activePanelBlockRefs.length, multiSelection.length)}
            activeRowPreviewCount={selectedTransomRefs.length}
            interactivePlacement={interactivePlacement}
              onCommandTargetChange={setCommandTarget}
              onApplyPlacement={applyInteractiveCanvasTarget}
              onApplySelectedMullionPreset={applySelectedMullionPreset}
              onApplySelectedTransomPreset={applySelectedTransomPreset}
              onRunCadCommand={runCadCommand}
              onCancelPlacement={() => setInteractivePlacement(null)}
              onSplitVertical={splitSelectedPanelVertical}
              onSplitHorizontal={splitSelectedTransomHorizontal}
              onDeletePanel={deleteSelectedPanel}
              zoom={zoom}
              pan={pan}
              snapMm={snapMm}
              osnapEnabled={osnapEnabled}
              osnapModes={osnapModes}
              orthoMode={orthoMode}
              polarMode={polarMode}
              polarAngle={polarAngle}
              onWheelZoom={(delta, reset) => {
                if (reset) {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  return;
                }
                setZoom((value) => Math.max(0.4, Math.min(2.5, Number((value + delta).toFixed(2)))));
              }}
              onPanStart={(clientX, clientY) => {
                panRef.current = { startX: clientX, startY: clientY, originX: pan.x, originY: pan.y };
              }}
              onPanMove={(clientX, clientY) => {
                if (!panRef.current) {
                  return;
                }
                setPan({
                  x: panRef.current.originX + clientX - panRef.current.startX,
                  y: panRef.current.originY + clientY - panRef.current.startY
                });
              }}
              onPanEnd={() => {
                panRef.current = null;
              }}
              panEnabled={spacePressed}
            />
            <div className="zoom-panel">
              <button className="zoom-button" onClick={() => setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(2))))}>-</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button className="zoom-button" onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.1).toFixed(2))))}>+</button>
              <button className="zoom-button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>100%</button>
              <button className={`zoom-button mode ${osnapEnabled ? "active" : ""}`} onClick={() => setOsnapEnabled((current) => !current)}>OSNAP</button>
              <button className={`zoom-button mode ${orthoMode ? "active" : ""}`} onClick={() => setOrthoMode((current) => !current)}>ORTHO</button>
              <button className={`zoom-button mode ${polarMode ? "active" : ""}`} onClick={() => setPolarMode((current) => !current)}>
                POLAR {polarAngle}°
              </button>
            </div>
            <div className="command-bar">
              <span className="command-label">Komut</span>
              <strong>{toolMode}</strong>
              <span className="command-meta">Snap {snapMm} mm</span>
              <span className="command-meta">OSNAP {osnapEnabled ? "On" : "Off"}</span>
              <span className="command-meta">ORTHO {orthoMode ? "On" : "Off"}</span>
              <span className="command-meta">POLAR {polarMode ? `${polarAngle}°` : "Off"}</span>
              <span className="command-meta">Zoom %{Math.round(zoom * 100)}</span>
              <span className="command-meta">Shift+Surukle: Kutu Secim</span>
              <span className={`health-chip ${designHealth.status}`}>
                Kontrol: {getHealthLabel(designHealth.status)} {designHealth.score}/100
              </span>
              <div className="command-line">
                <input
                  type="text"
                  value={commandQuery}
                  placeholder="align guide left | distribute | match width | move 120 | trim left 80 | help"
                  onChange={(event) => {
                    setCommandQuery(event.target.value);
                    setCommandHistoryIndex(-1);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      runCadCommand(commandQuery);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      browseCommandHistory("older");
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      browseCommandHistory("newer");
                    }
                  }}
                />
                <button className="tool-chip" onClick={() => runCadCommand(commandQuery)}>Calistir</button>
              </div>
              {(commandTarget ||
                (interactivePlacement &&
                  (interactivePlacement.type === "copy" || interactivePlacement.type === "move") &&
                  interactivePlacement.phase === "target")) && (
                <div className="command-input">
                  <span className="command-meta">
                    {interactivePlacement &&
                    (interactivePlacement.type === "copy" || interactivePlacement.type === "move") &&
                    interactivePlacement.phase === "target"
                      ? "Placement Kilidi (mm veya dx,dy)"
                      : commandTarget?.label}
                  </span>
                  <input
                    type="text"
                    value={commandValue}
                    placeholder={
                      interactivePlacement &&
                      (interactivePlacement.type === "copy" || interactivePlacement.type === "move") &&
                      interactivePlacement.phase === "target"
                        ? "lock mm veya dx,dy"
                        : "mm yaz"
                    }
                    onChange={(event) => setCommandValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyCommandValue();
                      }
                    }}
                  />
                  <button className="tool-chip" onClick={applyCommandValue}>Uygula</button>
                </div>
              )}
              {interactivePlacement &&
                (interactivePlacement.type === "copy" || interactivePlacement.type === "move") &&
                interactivePlacement.phase === "target" && (
                  <div className="command-input placement-locks">
                    <span className="command-meta">
                      Placement Kilidi
                      {interactivePlacement.lockedDistanceMm ? ` / ${interactivePlacement.lockedDistanceMm} mm` : ""}
                      {interactivePlacement.lockedVectorMm ? ` / ${interactivePlacement.lockedVectorMm.dxMm},${interactivePlacement.lockedVectorMm.dyMm}` : ""}
                      {interactivePlacement.axisLock ? ` / ${interactivePlacement.axisLock.toUpperCase()}` : " / Free"}
                    </span>
                    <button
                      className={`tool-chip ${interactivePlacement.axisLock === "x" ? "active" : ""}`}
                      onClick={() =>
                        updatePlacementLock((current) => ({
                          ...current,
                          axisLock: current.axisLock === "x" ? null : "x",
                          lockedVectorMm: null
                        }))
                      }
                    >
                      X Kilit
                    </button>
                    <button
                      className={`tool-chip ${interactivePlacement.axisLock === "y" ? "active" : ""}`}
                      onClick={() =>
                        updatePlacementLock((current) => ({
                          ...current,
                          axisLock: current.axisLock === "y" ? null : "y",
                          lockedVectorMm: null
                        }))
                      }
                    >
                      Y Kilit
                    </button>
                    <button
                      className="tool-chip"
                      onClick={() =>
                        updatePlacementLock((current) => ({
                          ...current,
                          axisLock: null,
                          lockedDistanceMm: null,
                          lockedVectorMm: null
                        }))
                      }
                    >
                      Serbest
                    </button>
                  </div>
                )}
              <div className="command-presets">
                <button className="tool-chip" onClick={() => runCadCommand("mirror")}>Mirror</button>
                <button className="tool-chip" onClick={() => runCadCommand("move")}>Move</button>
                <button className="tool-chip" onClick={() => runCadCommand("move 120")}>Move +120</button>
                <button className="tool-chip" onClick={() => runCadCommand("copy")}>Copy</button>
                <button className="tool-chip" onClick={() => runCadCommand("copy 3 50")}>Copy x3</button>
                <button className="tool-chip" onClick={() => runCadCommand("array 3")}>Array 3</button>
                <button className="tool-chip" onClick={() => runCadCommand("array 4 25")}>Array 4/25</button>
                <button className="tool-chip" onClick={() => runCadCommand("array row 3 50")}>Row 3/50</button>
                <button className="tool-chip" onClick={() => runCadCommand("array grid 3 2 25 50")}>Grid 3x2</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset -50")}>-50</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset 50 3")}>Offset x3</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset 50")}>+50</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset panel 300 3")}>Panel Offset</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset block 300 2")}>Block Offset</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset row 400 2")}>Row Offset</button>
                <button className="tool-chip" onClick={() => runCadCommand("trim left 80")}>Trim Left</button>
                <button className="tool-chip" onClick={() => runCadCommand("trim right 80")}>Trim Right</button>
                <button className="tool-chip" onClick={() => runCadCommand("extend left 60")}>Extend Left</button>
                <button className="tool-chip" onClick={() => runCadCommand("extend right 60")}>Extend Right</button>
                <button className="tool-chip" onClick={() => runCadCommand("align left")}>Align Left</button>
                <button className="tool-chip" onClick={() => runCadCommand("align right")}>Align Right</button>
                <button className="tool-chip" onClick={() => runCadCommand("center")}>Center Block</button>
                <button className="tool-chip" onClick={() => runCadCommand("align top")}>Align Top</button>
                <button className="tool-chip" onClick={() => runCadCommand("align bottom")}>Align Bottom</button>
                <button className="tool-chip" onClick={() => runCadCommand("center row")}>Center Row</button>
                <button className="tool-chip" onClick={() => runCadCommand("distribute")}>Distribute</button>
                <button className="tool-chip" onClick={() => runCadCommand("distribute rows")}>Rows</button>
                <button className="tool-chip" onClick={() => runCadCommand("match width")}>Match W</button>
                <button className="tool-chip" onClick={() => runCadCommand("match height")}>Match H</button>
                <button className="tool-chip" onClick={() => runCadCommand("lib double")}>Cift Kanat</button>
                <button className="tool-chip" onClick={() => runCadCommand("lib slider")}>Surgu</button>
                <button className="tool-chip" onClick={() => setToolMode("guide-vertical")}>V Guide</button>
                <button className="tool-chip" onClick={() => setToolMode("guide-horizontal")}>H Guide</button>
                <button className={`tool-chip ${osnapEnabled ? "active" : ""}`} onClick={() => runCadCommand("osnap")}>OSNAP</button>
                <button className={`tool-chip ${orthoMode ? "active" : ""}`} onClick={() => runCadCommand("ortho")}>ORTHO</button>
                <button className={`tool-chip ${polarMode ? "active" : ""}`} onClick={() => runCadCommand(`polar ${polarAngle === 45 ? 30 : polarAngle === 30 ? 90 : 45}`)}>
                  POLAR {polarAngle}°
                </button>
                <button className={`tool-chip ${osnapModes.endpoint ? "active" : ""}`} onClick={() => runCadCommand("osnap end")}>END</button>
                <button className={`tool-chip ${osnapModes.midpoint ? "active" : ""}`} onClick={() => runCadCommand("osnap mid")}>MID</button>
                <button className={`tool-chip ${osnapModes.center ? "active" : ""}`} onClick={() => runCadCommand("osnap cen")}>CEN</button>
                <button className={`tool-chip ${osnapModes.intersection ? "active" : ""}`} onClick={() => runCadCommand("osnap int")}>INT</button>
              </div>
              {commandHistory.length > 0 && (
                <div className="command-history-strip">
                  {commandHistory
                    .slice(-5)
                    .reverse()
                    .map((item, index) => (
                      <button key={`${item}-${index}`} className="tool-chip command-history-chip" onClick={() => setCommandQuery(item)}>
                        {item}
                      </button>
                    ))}
                </div>
              )}
              {commandStatus && <span className="command-status">{commandStatus}</span>}
              {commandPreview && (
                <span className="command-meta preview-meta">
                  Onizleme: {formatCommandPreview(commandPreview)}
                </span>
              )}
              <div className="layer-pills">
                {Object.entries(visibleLayers).map(([key, value]) => (
                  <button
                    key={key}
                    className={`tool-chip layer-chip ${value ? "active" : ""}`}
                    onClick={() =>
                      setVisibleLayers((current) => ({
                        ...current,
                        [key]: !current[key as keyof typeof current]
                      }))
                    }
                  >
                    {formatLayerLabel(key as keyof typeof visibleLayers)}
                  </button>
                ))}
              </div>
              {multiSelection.length > 0 && (
                <>
                  <span className="command-meta">{multiSelection.length} panel secili</span>
                  <button className="tool-chip" onClick={() => applyOpeningTypeToPanels(multiSelection, "fixed")}>Toplu Sabit</button>
                  <button className="tool-chip" onClick={() => applyOpeningTypeToPanels(multiSelection, "turn-right")}>Toplu Sag</button>
                  <button className="tool-chip" onClick={() => applyOpeningTypeToPanels(multiSelection, "turn-left")}>Toplu Sol</button>
                  <button className="tool-chip" onClick={() => applyOpeningTypeToPanels(multiSelection, "sliding")}>Toplu Surme</button>
                  <button className="tool-chip" onClick={() => equalizePanelsByRefs(multiSelection)}>E</button>
                  <button className="tool-chip" onClick={() => equalizeTransomsByRefs(multiSelection)}>R</button>
                  {multiSelection.length > 1 && (
                    <>
                      <button className="tool-chip" onClick={() => runCadCommand("copy")}>Blok Copy</button>
                      <button className="tool-chip" onClick={() => runCadCommand("move")}>Blok Move</button>
                    </>
                  )}
                  <button className="tool-chip" onClick={() => setMultiSelection([])}>Secimi Temizle</button>
                </>
              )}
            </div>
          </section>

          <aside className="right-rail">
            <section className="inspector-card">
              <div className="tab-bar">
                <button className={`tab-button ${railTab === "inspector" ? "active" : ""}`} onClick={() => setRailTab("inspector")}>Inspector</button>
                <button className={`tab-button ${railTab === "materials" ? "active" : ""}`} onClick={() => setRailTab("materials")}>Malzeme</button>
                <button className={`tab-button ${railTab === "library" ? "active" : ""}`} onClick={() => setRailTab("library")}>Kutuphane</button>
                <button className={`tab-button ${railTab === "bom" ? "active" : ""}`} onClick={() => setRailTab("bom")}>BOM</button>
              </div>

              {railTab === "inspector" && selectedObjectInfo && (
                <div className="object-focus-card">
                  <div className="section-title-row tight">
                    <div>
                      <p className="eyebrow">Secili Obje</p>
                      <h3>{selectedObjectInfo.title}</h3>
                    </div>
                    <div className="mini-badge">{getCanvasObjectLabel(selectedObject)}</div>
                  </div>
                  <div className="focus-card">
                    <strong>{selectedObjectInfo.subtitle}</strong>
                    <span>{selectedObjectInfo.detail}</span>
                  </div>
                  <div className="object-quick-actions">
                    {selectedObjectInfo.quickActions.map((action) => (
                      <button
                        key={action}
                        className="tool-chip object-chip"
                        onClick={() => runCadCommand(action)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {railTab === "inspector" && selectedGuide && (
                <div className="guide-management-card">
                  <div className="section-title-row tight">
                    <div>
                      <p className="eyebrow">Referans Kilavuz</p>
                      <h3>Guide Yonetimi</h3>
                    </div>
                    <div className="mini-badge">{selectedGuide.orientation === "vertical" ? "Dikey" : "Yatay"}</div>
                  </div>
                  <div className="guide-meta-row">
                    <span className={`guide-state-pill ${selectedGuide.locked ? "locked" : ""}`}>
                      {selectedGuide.locked ? "Kilitli" : "Serbest"}
                    </span>
                    <span className="guide-state-pill">{selectedGuide.positionMm} mm</span>
                  </div>
                  <div className="stack-fields light">
                    <label className="light-select">
                      Guide Adi
                      <input
                        value={guideLabelDraft}
                        onChange={(event) => setGuideLabelDraft(event.target.value)}
                        onBlur={() => renameGuide(selectedGuide.id, guideLabelDraft)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            renameGuide(selectedGuide.id, guideLabelDraft);
                          }
                        }}
                      />
                    </label>
                    <label className="light-select">
                      Pozisyon (mm)
                      <input
                        type="number"
                        min={0}
                        max={selectedGuide.orientation === "vertical" ? design.totalWidth : design.totalHeight}
                        value={selectedGuide.positionMm}
                        onChange={(event) => setGuidePosition(selectedGuide.id, Number(event.target.value))}
                      />
                    </label>
                  </div>
                  <div className="guide-action-row">
                    <button className="tool-chip guide-action-chip" onClick={() => toggleGuideLock(selectedGuide.id)}>
                      {selectedGuide.locked ? "Kilidi Ac" : "Kilitle"}
                    </button>
                    <button
                      className="danger-button subtle"
                      onClick={() => {
                        removeGuide(selectedGuide.id);
                        setSelectedObject(null);
                        setCommandTarget(null);
                      }}
                    >
                      Guide Sil
                    </button>
                  </div>
                </div>
              )}

              {railTab === "inspector" && selectedPanel && (
                <>
                  <div className="section-title-row tight">
                    <div>
                      <p className="eyebrow">Inspector</p>
                      <h3>Secili Eleman</h3>
                    </div>
                    <div className="mini-badge">{selectedPanel.panel.label}</div>
                  </div>
                  <div className="focus-card">
                    <strong>{selectedPanel.panel.label}</strong>
                    <span>{getOpeningLabel(selectedPanel.panel.openingType)}</span>
                    <span>
                      {selectedPanel.panel.width} x {selectedPanel.transom.height} mm
                    </span>
                    <span>Cam Alani: {calculatePanelArea(selectedPanel.panel.width, selectedPanel.transom.height).toFixed(2)} m²</span>
                  </div>

                  {selectedPanelEngineering && (
                    <div className="tech-card">
                      <div className="tech-card-row">
                        <span>Net Kanat Kesim</span>
                        <strong>
                          {selectedPanelEngineering.approxSashWidthMm} x {selectedPanelEngineering.approxSashHeightMm} mm
                        </strong>
                      </div>
                      <div className="tech-card-row">
                        <span>Yaklasik Cam Kesim</span>
                        <strong>
                          {selectedPanelEngineering.approxGlassWidthMm} x {selectedPanelEngineering.approxGlassHeightMm} mm
                        </strong>
                      </div>
                      <div className="tech-card-row">
                        <span>Cita Kesim Referansi</span>
                        <strong>
                          {selectedPanelEngineering.approxGlassWidthMm + profileSpec.beadAllowanceMm} / {selectedPanelEngineering.approxGlassHeightMm + profileSpec.beadAllowanceMm} mm
                        </strong>
                      </div>
                      <div className="tech-card-row">
                        <span>Tahmini Kanat Agirligi</span>
                        <strong>{selectedPanelEngineering.approxSashWeightKg.toFixed(1)} kg</strong>
                      </div>
                      <div className="tech-card-row">
                        <span>Seri / Donanim Durumu</span>
                        <strong>
                          {selectedPanelEngineering.seriesLimitOk && selectedPanelEngineering.weightLimitOk
                            ? "Uygun"
                            : "Kontrol Gerekli"}
                        </strong>
                      </div>
                    </div>
                  )}

                  {selectedPanelEngineering && (
                    <div className="smart-actions-card">
                      <div className="section-title-row tight">
                        <div>
                          <p className="eyebrow">Akilli Hamleler</p>
                          <h3>Tek Tik Duzeltmeler</h3>
                        </div>
                      </div>
                      <div className="smart-actions-grid">
                        {nextProfileSeries &&
                          (!selectedPanelEngineering.seriesLimitOk ||
                            Math.abs(design.outerFrameThickness - profileSpec.recommendedFrameMm) > 12) && (
                            <button className="smart-action-button" onClick={() => setProfileSeries(nextProfileSeries)}>
                              Seriyi Yukselt
                              <span>{profileSeriesCatalog[nextProfileSeries].label}</span>
                            </button>
                          )}
                        {nextHardwareQuality && !selectedPanelEngineering.weightLimitOk && (
                          <button className="smart-action-button" onClick={() => setHardwareQuality(nextHardwareQuality)}>
                            Donanimi Guclendir
                            <span>{hardwareCatalog[nextHardwareQuality].label}</span>
                          </button>
                        )}
                        {(Math.abs(design.outerFrameThickness - profileSpec.recommendedFrameMm) > 12 ||
                          Math.abs(design.mullionThickness - profileSpec.recommendedMullionMm) > 12) && (
                          <button
                            className="smart-action-button"
                            onClick={() => {
                              setOuterFrameThickness(profileSpec.recommendedFrameMm);
                              setMullionThickness(profileSpec.recommendedMullionMm);
                            }}
                          >
                            Profili Seriyle Senkronla
                            <span>
                              {profileSpec.recommendedFrameMm} / {profileSpec.recommendedMullionMm} mm
                            </span>
                          </button>
                        )}
                        {selectedPanel.panel.openingType !== "fixed" &&
                          (selectedPanel.panel.width > profileSpec.maxOperableWidthMm ||
                            selectedPanelEngineering.approxSashWeightKg > hardwareSpec.maxSashWeightKg) && (
                            <button className="smart-action-button" onClick={splitSelectedPanelVertical}>
                              Kanadi Bol
                              <span>Genis paneli ikiye ayir</span>
                            </button>
                          )}
                        {selectedPanel.panel.openingType !== "fixed" && !selectedPanelEngineering.weightLimitOk && (
                          <button className="smart-action-button subtle" onClick={() => setSelectedOpeningType("fixed")}>
                            Sabit Cama Donustur
                            <span>Agirligi sifirla, riski azalt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="stack-fields light">
                    <NumberField
                      label="Panel Genisligi"
                      value={selectedPanel.panel.width}
                      onChange={setSelectedPanelWidth}
                    />
                    <NumberField
                      label="Satir Yuksekligi"
                      value={selectedPanel.transom.height}
                      onChange={setSelectedTransomHeight}
                    />
                    <label className="light-select">
                      Acilim Tipi
                      <select
                        value={selectedPanel.panel.openingType}
                        onChange={(event) =>
                          setSelectedOpeningType(event.target.value as OpeningType)
                        }
                      >
                        {openingTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="danger-zone">
                    <button className="danger-button" onClick={deleteSelectedPanel}>
                      Panel Sil
                    </button>
                    <button className="danger-button subtle" onClick={deleteSelectedTransom}>
                      Kayit Sil / Satiri Kaldir
                    </button>
                  </div>

                  <div className="type-hint-list">
                    {openingTypeOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`type-hint ${
                          selectedPanel.panel.openingType === option.value ? "active" : ""
                        }`}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.hint}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {railTab === "inspector" && multiSelection.length > 1 && (
                <div className="focus-card bulk-card">
                  <strong>Coklu Secim</strong>
                  <span>{multiSelection.length} panel birlikte secili</span>
                  <span>
                    {multiSelectionInfo?.sameTransom
                      ? multiSelectionInfo.contiguous
                        ? "Ayni satirda bitisik blok"
                        : "Ayni satirda daginik secim"
                      : "Birden fazla satira dagilan secim"}
                  </span>
                  <span>Komutlar: E = Genislik Esitle, R = Satir Dengele</span>
                  <span>
                    Toplam Cam Alani:{" "}
                    {multiSelection
                      .reduce((sum, item) => {
                        const transom = design.transoms.find((row) => row.id === item.transomId);
                        const panel = transom?.panels.find((cell) => cell.id === item.panelId);
                        if (!transom || !panel) {
                          return sum;
                        }
                        return sum + calculatePanelArea(panel.width, transom.height);
                      }, 0)
                      .toFixed(2)}{" "}
                    m2
                  </span>
                  {multiSelectionInfo?.sameTransom && multiSelectionInfo.contiguous && (
                    <span>Blok islemleri hazir: copy / move</span>
                  )}
                </div>
              )}

              {railTab === "inspector" && !selectedPanel && !selectedObjectInfo && (
                <p className="soft-text">Duzenlemek icin cizim alani icinden bir panel sec.</p>
              )}

              {railTab === "materials" && (
                <>
                  <div className="section-title-row tight">
                    <div>
                      <p className="eyebrow">Malzeme</p>
                      <h3>Sistem Ayarlari</h3>
                    </div>
                  </div>
                  <div className="swatch-grid">
                    {frameColorOptions.map((item) => (
                      <button
                        key={item.value}
                        className={`swatch-card ${design.materials.frameColor === item.value ? "selected" : ""}`}
                        onClick={() => setFrameColor(item.value)}
                      >
                        <span className="swatch-dot" style={{ background: item.color }} />
                        <strong>{item.label}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="stack-fields light">
                    <SelectField
                      label="Malzeme Cinsi"
                      value={design.materials.materialSystem}
                      onChange={(value) => setMaterialSystem(value as MaterialSystem)}
                      options={materialSystemOptions.map((item) => ({ value: item.value, label: item.label }))}
                    />
                    <SelectField label="Cam Tipi" value={design.materials.glassType} onChange={(value) => setGlassType(value as GlassType)} options={glassTypeOptions.map((item) => ({ value: item.value, label: item.label }))} />
                    <SelectField label="Profil Serisi" value={design.materials.profileSeries} onChange={(value) => setProfileSeries(value as ProfileSeries)} options={profileSeriesOptions.map((item) => ({ value: item.value, label: item.label }))} />
                    <SelectField label="Donanim" value={design.materials.hardwareQuality} onChange={(value) => setHardwareQuality(value as HardwareQuality)} options={hardwareOptions.map((item) => ({ value: item.value, label: item.label }))} />
                    <label>Musteri<input value={design.customer.customerName} onChange={(event) => setCustomerField("customerName", event.target.value)} /></label>
                    <label>Proje Kodu<input value={design.customer.projectCode} onChange={(event) => setCustomerField("projectCode", event.target.value)} /></label>
                    <label>Adres<input value={design.customer.address} onChange={(event) => setCustomerField("address", event.target.value)} /></label>
                    <label>Notlar<input value={design.customer.notes} onChange={(event) => setCustomerField("notes", event.target.value)} /></label>
                  </div>
                  <div className="material-insights">
                    <div className="material-card accent">
                      <strong>{materialSystemSpec.label}</strong>
                      <span>{materialSystemSpec.description}</span>
                      <span>Onerilen Kasa: {materialSystemSpec.recommendedFrameMm} mm</span>
                      <span>Onerilen Kayit: {materialSystemSpec.recommendedMullionMm} mm</span>
                    </div>
                    <div className="material-card">
                      <strong>{profileSpec.label}</strong>
                      <span>Derinlik: {profileSpec.depthMm} mm</span>
                      <span>Onerilen Kasa: {profileSpec.recommendedFrameMm} mm</span>
                      <span>Maks. Kanat: {profileSpec.maxOperableWidthMm} x {profileSpec.maxOperableHeightMm} mm</span>
                    </div>
                    <div className="material-card">
                      <strong>{glassSpec.label}</strong>
                      <span>Dizilim: {glassSpec.buildUp}</span>
                      <span>Kalinlik: {glassSpec.thicknessLabel}</span>
                      <span>Agirlik: {glassSpec.weightKgM2} kg/m2</span>
                      <span>Sinif: {glassSpec.thermalClass}</span>
                    </div>
                    <div className="material-card">
                      <strong>{hardwareSpec.label}</strong>
                      <span>Maks. Kanat Agirligi: {hardwareSpec.maxSashWeightKg} kg</span>
                      <span>Standart Mentese: {hardwareSpec.hingeCount} adet</span>
                    </div>
                  </div>
                </>
              )}

              {railTab === "library" && (
                <>
                  <div className="section-title-row tight">
                    <div>
                      <p className="eyebrow">Kutuphane</p>
                      <h3>Hazir Dograma Modulleri</h3>
                    </div>
                    <div className="mini-badge">
                      {selectedTransom ? `${selectedTransom.panels.length} panel` : "Secim bekliyor"}
                    </div>
                  </div>

                  <div className="library-group">
                    <p className="soft-text">
                      Tek panel modulleri secili gozeyi donusturur. Satir modulleri ise secili satiri profesyonel bir duzenle yeniden kurar.
                    </p>
                    <div className="library-grid">
                      {panelLibraryModules.map((module) => (
                        <button
                          key={module.id}
                          className="library-card"
                          onClick={() => {
                            applyPanelLibraryModule(module.id);
                            setCommandStatus(`${module.title} modulu uygulandi`);
                          }}
                        >
                          <strong>{module.title}</strong>
                          <span>{module.description}</span>
                          <em>Komut: {module.commandAlias}</em>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="library-group">
                    <div className="section-title-row tight">
                      <div>
                        <p className="eyebrow">Satir Modulleri</p>
                        <h3>Cephe Kurgulari</h3>
                      </div>
                    </div>
                    <div className="library-grid row-library-grid">
                      {rowLibraryModules.map((module) => (
                        <button
                          key={module.id}
                          className="library-card row"
                          onClick={() => {
                            applyRowLibraryModule(module.id);
                            setCommandStatus(`${module.title} satir modulu uygulandi`);
                          }}
                        >
                          <strong>{module.title}</strong>
                          <span>{module.description}</span>
                          <em>Komut: lib {module.commandAlias}</em>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {railTab === "bom" && (
                <>
                  <div className="section-title-row tight">
                    <div>
                      <p className="eyebrow">BOM</p>
                      <h3>Malzeme Listesi</h3>
                    </div>
                    <button className="hero-button ghost" onClick={handlePrintBom}>Yazdir</button>
                  </div>
                  <div className="bom-list">
                    <BomRow label="Toplam Profil" value={`${bom.profileLengthMeters.toFixed(2)} m`} />
                    <BomRow label="Cam Alani" value={`${bom.glassAreaM2.toFixed(2)} m²`} />
                    <BomRow label="Menteşe" value={`${bom.hingeCount} Adet`} />
                    <BomRow label="Acilir Kanat" value={`${bom.openingPanels} Adet`} />
                  </div>
                  <div className="cutlist-table">
                    <div className="cutlist-head">
                      <span>Grup</span>
                      <span>Parca</span>
                      <span>Malzeme</span>
                      <span>Adet</span>
                      <span>Olcu / Not</span>
                    </div>
                    {bom.cutList.slice(0, 14).map((item) => (
                      <div key={item.id} className="cutlist-row">
                        <span>{getCutGroupLabel(item.group)}</span>
                        <span>{item.part}</span>
                        <span>{item.material}</span>
                        <span>{item.quantity}</span>
                        <span>
                          {item.lengthMm
                            ? `${item.lengthMm} mm`
                            : item.widthMm && item.heightMm
                              ? `${item.widthMm} x ${item.heightMm} mm`
                              : "-"}
                          {item.note ? ` • ${item.note}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="inspector-card">
              <div className="section-title-row tight">
                <div>
                  <p className="eyebrow">Ozet</p>
                  <h3>Uretim Panosu</h3>
                </div>
              </div>

              <div className="dashboard-metrics">
                <MetricCard label="Toplam Bolme" value={String(totalPanelCount)} accent="gold" />
                <MetricCard label="Acilir Kanat" value={String(openingCount)} accent="blue" />
                <MetricCard label="Sabit Cam" value={String(fixedCount)} accent="slate" />
                <MetricCard
                  label="Tahmini Profil"
                  value={`${bom.profileLengthMeters.toFixed(2)} m`}
                  accent="green"
                />
              </div>
            </section>

            <section className="inspector-card">
              <div className="section-title-row tight">
                <div>
                  <p className="eyebrow">Akilli Kontrol</p>
                  <h3>Proje Sagligi</h3>
                </div>
                <div className={`health-badge ${designHealth.status}`}>
                  {getHealthLabel(designHealth.status)}
                </div>
              </div>

              <div className="health-overview">
                <div className="health-score">
                  <span>Skor</span>
                  <strong>{designHealth.score}</strong>
                </div>
                <div className="health-stats">
                  <span>{designHealth.errors} kritik</span>
                  <span>{designHealth.warnings} uyari</span>
                  <span>{designSnapshot.transomCount} satir</span>
                  <span>Ort. panel {designSnapshot.averagePanelWidth} mm</span>
                  <span>{profileSpec.label}</span>
                  <span>{glassSpec.buildUp}</span>
                </div>
              </div>

              <div className="diagnostic-list">
                {designHealth.diagnostics.length === 0 ? (
                  <div className="diagnostic-item healthy">
                    <strong>Tasarim dengeli gorunuyor</strong>
                    <span>Mevcut olculer temel kontrollerden gecti. Profil ve seri secimiyle devam edebilirsin.</span>
                  </div>
                ) : (
                  designHealth.diagnostics.slice(0, 6).map((item) => (
                    <div key={item.id} className={`diagnostic-item ${item.severity}`}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                      {item.suggestion && <em>{item.suggestion}</em>}
                      <div className="diagnostic-actions">
                        {getDiagnosticActions(item).map((action) => (
                          <button
                            key={`${item.id}-${action.label}`}
                            className={`diagnostic-action-button ${action.subtle ? "subtle" : ""}`}
                            onClick={action.onClick}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </section>
      </main>

      {newProjectDialogOpen && (
        <div className="modal-scrim" onClick={() => setNewProjectDialogOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row tight">
              <div>
                <p className="eyebrow">Bos Baslangic</p>
                <h3>Yeni Proje</h3>
              </div>
              <button className="hero-button ghost compact" onClick={() => setNewProjectDialogOpen(false)}>
                Kapat
              </button>
            </div>
            <p className="soft-text">
              Once bos bir kasa olusturulur. Sonra bolmeleri, kayitlari ve panel tiplerini sen cizersin.
            </p>
            <div className="stack-fields light">
              <label>
                Proje Adi
                <input
                  type="text"
                  value={newProjectDraft.name}
                  onChange={(event) => setNewProjectDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Genislik (mm)
                <input
                  type="number"
                  min={600}
                  value={newProjectDraft.width}
                  onChange={(event) => setNewProjectDraft((current) => ({ ...current, width: event.target.value }))}
                />
              </label>
              <label>
                Yukseklik (mm)
                <input
                  type="number"
                  min={600}
                  value={newProjectDraft.height}
                  onChange={(event) => setNewProjectDraft((current) => ({ ...current, height: event.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="hero-button ghost" onClick={() => setNewProjectDialogOpen(false)}>
                Vazgec
              </button>
              <button className="hero-button primary" onClick={handleCreateBlankProject}>
                Bos Kasa Olustur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 1
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const nextValue = Math.max(min, Math.round(Number(draft) || value));
    setDraft(String(nextValue));
    onChange(nextValue);
  };

  return (
    <label>
      {label}
      <input
        type="number"
        value={draft}
        min={min}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            (event.currentTarget as HTMLInputElement).blur();
          }
          if (event.key === "Escape") {
            setDraft(String(value));
            (event.currentTarget as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="light-select">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionTile({
  title,
  subtitle,
  onClick
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button className="action-tile" onClick={onClick}>
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent: "gold" | "blue" | "slate" | "green";
}) {
  return (
    <div className={`metric-card ${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BomRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bom-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getHealthLabel(status: "healthy" | "warning" | "critical") {
  if (status === "healthy") {
    return "Temiz";
  }
  if (status === "warning") {
    return "Dikkat";
  }
  return "Kritik";
}

function getCutGroupLabel(group: string) {
  switch (group) {
    case "outer-frame":
      return "Kasa";
    case "mullion":
      return "Dikey";
    case "transom":
      return "Yatay";
    case "sash":
      return "Kanat";
    case "bead":
      return "Cita";
    case "glass":
      return "Cam";
    case "hardware":
      return "Aksesuar";
    default:
      return group;
  }
}

function getNextProfileSeries(current: ProfileSeries) {
  const index = profileSeriesOptions.findIndex((item) => item.value === current);
  return index >= 0 && index < profileSeriesOptions.length - 1 ? profileSeriesOptions[index + 1].value : null;
}

function getNextHardwareQuality(current: HardwareQuality) {
  const index = hardwareOptions.findIndex((item) => item.value === current);
  return index >= 0 && index < hardwareOptions.length - 1 ? hardwareOptions[index + 1].value : null;
}

function getFramePalette(frameColor: FrameColor, presentation: boolean) {
  const palettes: Record<FrameColor, { frameFill: string; frameStroke: string; sashFill: string; sashStroke: string; glassStroke: string }> = {
    white: { frameFill: "#f7f8fa", frameStroke: "#b5bdc9", sashFill: "#eef2f7", sashStroke: "#b1bac7", glassStroke: "#87aeca" },
    cream: { frameFill: "#efe6d2", frameStroke: "#bca98c", sashFill: "#e8dcc2", sashStroke: "#b59e7c", glassStroke: "#88aeca" },
    anthracite: { frameFill: "#5f6670", frameStroke: "#3a4149", sashFill: "#737b86", sashStroke: "#4a515b", glassStroke: "#a3c1d9" },
    black: { frameFill: "#2e3136", frameStroke: "#17191c", sashFill: "#3e434b", sashStroke: "#21252a", glassStroke: "#a3c1d9" },
    "golden-oak": { frameFill: "#bf8852", frameStroke: "#8b5c30", sashFill: "#c89661", sashStroke: "#956135", glassStroke: "#89acca" },
    walnut: { frameFill: "#8c654b", frameStroke: "#5f3f2d", sashFill: "#9a7459", sashStroke: "#694633", glassStroke: "#8caeca" },
    mahogany: { frameFill: "#964d3f", frameStroke: "#663028", sashFill: "#a5594a", sashStroke: "#74362d", glassStroke: "#8caeca" },
    silver: { frameFill: "#bec5ce", frameStroke: "#818b97", sashFill: "#d0d6de", sashStroke: "#9099a5", glassStroke: "#86a8c6" }
  };

  if (presentation) {
    return {
      frameFill: "#1c2b3e",
      frameStroke: "#d2b377",
      sashFill: "#22344b",
      sashStroke: "#d2b377",
      glassStroke: "#7ea6c7"
    };
  }

  return palettes[frameColor];
}

function MiniTemplatePreview({ design }: { design: PvcDesign }) {
  const width = 120;
  const scale = width / (design.totalWidth + design.outerFrameThickness * 2);
  const outerX = 6;
  const outerY = 10;
  const outerW = width;
  const outerH = (design.totalHeight + design.outerFrameThickness * 2) * scale;
  const canvasLayout = buildCanvasLayout(
    design,
    { x: outerX, y: outerY, width: outerW, height: outerH },
    scale
  );

  return (
    <svg viewBox={`0 0 140 ${Math.max(92, outerH + 24)}`} className="mini-svg" aria-hidden="true">
      <rect x={outerX} y={outerY} width={outerW} height={outerH} rx="4" fill="#fdfefe" stroke="#90a0b8" />
      {canvasLayout.rows.map((row) =>
        row.panels.map((panel) => (
          <rect
            key={`${row.transomId}:${panel.panelId}`}
            x={panel.bounds.x}
            y={panel.bounds.y}
            width={panel.bounds.width}
            height={panel.bounds.height}
            fill={design.transoms[row.transomIndex].panels[panel.panelIndex].openingType === "fixed" ? "#cfe5f8" : "#a8d7ff"}
            stroke="#7f8ca0"
          />
        ))
      )}
      {canvasLayout.verticalBars.map((bar) => (
        <rect
          key={`mini-v-${bar.transomId}-${bar.panelId}`}
          x={bar.rect.x}
          y={bar.rect.y}
          width={bar.rect.width}
          height={bar.rect.height}
          fill="#d8dde6"
          stroke="#a4adb9"
        />
      ))}
      {canvasLayout.horizontalBars.map((bar) => (
        <rect
          key={`mini-h-${bar.aboveTransomId}`}
          x={bar.rect.x}
          y={bar.rect.y}
          width={bar.rect.width}
          height={bar.rect.height}
          fill="#d8dde6"
          stroke="#a4adb9"
        />
      ))}
    </svg>
  );
}

function calculatePanelArea(width: number, height: number) {
  return (width * height) / 1000000;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRulerStepMm(scale: number, zoom: number) {
  const pxPerMm = scale * zoom;
  const steps = [25, 50, 100, 200, 250, 500, 1000];
  return steps.find((step) => step * pxPerMm >= 72) ?? 1000;
}

function buildRulerTicks(totalMm: number, stepMm: number) {
  const ticks: number[] = [];

  for (let value = 0; value <= totalMm; value += stepMm) {
    ticks.push(value);
  }

  if (ticks[ticks.length - 1] !== totalMm) {
    ticks.push(totalMm);
  }

  return ticks;
}

function isSameCanvasObject(
  current: CanvasObjectSelection | null,
  expected: CanvasObjectSelection
) {
  if (!current) {
    return false;
  }

  switch (expected.type) {
    case "outer-frame":
      return current.type === "outer-frame";
    case "guide":
      return current.type === "guide" && current.guideId === expected.guideId;
    case "transom-bar":
      return current.type === "transom-bar" && current.transomId === expected.transomId;
    case "panel":
    case "sash":
    case "glass":
    case "mullion":
      return (
        current.type === expected.type &&
        current.transomId === expected.transomId &&
        current.panelId === expected.panelId
      );
    default:
      return false;
  }
}

function getCanvasObjectLabel(selection: CanvasObjectSelection | null) {
  if (!selection) {
    return "Yok";
  }

  switch (selection.type) {
    case "outer-frame":
      return "Dis Kasa";
    case "panel":
      return "Panel";
    case "sash":
      return "Kanat";
    case "glass":
      return "Cam";
    case "mullion":
      return "Dikey Kayit";
    case "guide":
      return "Kilavuz";
    case "transom-bar":
      return "Yatay Kayit";
  }

  return "Obje";
}

function formatLayerLabel(layer: keyof VisibleLayers) {
  switch (layer) {
    case "rulers":
      return "Cetvel";
    case "dimensions":
      return "Olcu";
    case "guides":
      return "Guide";
    case "hud":
      return "HUD";
    case "profiles":
      return "Profil";
    case "glass":
      return "Cam";
    case "hardware":
      return "Donanim";
    case "notes":
      return "Not";
  }
}

function getPanelBlockMetrics(design: PvcDesign, refs: PanelRef[]) {
  if (!refs.length) {
    return null;
  }

  const sourceTransomId = refs[0].transomId;
  if (!refs.every((item) => item.transomId === sourceTransomId)) {
    return null;
  }

  const transom = design.transoms.find((item) => item.id === sourceTransomId);
  if (!transom) {
    return null;
  }

  const indexes = refs
    .map((item) => transom.panels.findIndex((panel) => panel.id === item.panelId))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  if (!indexes.length) {
    return null;
  }

  const startIndex = indexes[0];
  const endIndex = indexes[indexes.length - 1];
  const startMm = transom.panels.slice(0, startIndex).reduce((sum, panel) => sum + panel.width, 0);
  const widthMm = transom.panels.slice(startIndex, endIndex + 1).reduce((sum, panel) => sum + panel.width, 0);

  return {
    transomId: sourceTransomId,
    startMm,
    endMm: startMm + widthMm,
    centerMm: startMm + widthMm / 2,
    widthMm
  };
}

function getSelectedTransomMetrics(design: PvcDesign, transomId: string | null | undefined) {
  if (!transomId) {
    return null;
  }

  const transomIndex = design.transoms.findIndex((item) => item.id === transomId);
  if (transomIndex === -1) {
    return null;
  }

  const startMm = design.transoms.slice(0, transomIndex).reduce((sum, item) => sum + item.height, 0);
  const heightMm = design.transoms[transomIndex].height;

  return {
    transomId,
    startMm,
    endMm: startMm + heightMm,
    centerMm: startMm + heightMm / 2,
    heightMm
  };
}

function getNearestGuide(
  guides: PvcDesign["guides"],
  orientation: GuideOrientation,
  targetMm: number
) {
  const candidates = guides.filter((guide) => guide.orientation === orientation);
  if (!candidates.length) {
    return null;
  }

  return candidates
    .map((guide) => ({
      guide,
      distance: Math.abs(guide.positionMm - targetMm)
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.guide ?? null;
}

function getReachableGuideAlternative(
  guides: PvcDesign["guides"],
  orientation: GuideOrientation,
  targetMm: number,
  range: { min: number; max: number } | null,
  excludeGuideId?: string
) {
  if (!range) {
    return null;
  }

  return (
    guides
      .filter((guide) => guide.orientation === orientation && guide.id !== excludeGuideId)
      .map((guide) => ({
        guide,
        deltaMm: Math.round(guide.positionMm - targetMm),
        distance: Math.abs(guide.positionMm - targetMm)
      }))
      .filter((item) => item.deltaMm >= range.min && item.deltaMm <= range.max)
      .sort((a, b) => a.distance - b.distance)[0] ?? null
  );
}

function getGuideLockedEdgeAdjustment(
  guides: PvcDesign["guides"],
  orientation: GuideOrientation,
  currentEdgeMm: number,
  requestedMm: number,
  maxAmountMm: number,
  direction: 1 | -1
) {
  if (!guides.length || requestedMm <= 0 || maxAmountMm <= 0) {
    return null;
  }

  const requestedTargetMm = currentEdgeMm + direction * requestedMm;
  const nearestGuide = getNearestGuide(guides, orientation, requestedTargetMm);
  if (!nearestGuide) {
    return null;
  }

  const snappedDeltaMm = Math.round(nearestGuide.positionMm - currentEdgeMm);
  if ((direction > 0 && snappedDeltaMm < 0) || (direction < 0 && snappedDeltaMm > 0)) {
    return null;
  }

  const snappedAmountMm = Math.abs(snappedDeltaMm);
  const thresholdMm = Math.max(18, Math.min(96, Math.round(requestedMm * 0.42)));
  if (Math.abs(nearestGuide.positionMm - requestedTargetMm) > thresholdMm || snappedAmountMm > maxAmountMm || snappedAmountMm === 0) {
    return null;
  }

  return {
    guide: nearestGuide,
    appliedMm: snappedAmountMm,
    deltaMm: snappedDeltaMm,
    targetMm: nearestGuide.positionMm
  };
}

function getPanelBlockEdgeCapacity(
  design: PvcDesign,
  refs: PanelRef[],
  edge: "left" | "right"
) {
  if (!refs.length) {
    return null;
  }

  const sourceTransomId = refs[0].transomId;
  if (!refs.every((item) => item.transomId === sourceTransomId)) {
    return null;
  }

  const transom = design.transoms.find((item) => item.id === sourceTransomId);
  if (!transom) {
    return null;
  }

  const indexes = refs
    .map((item) => transom.panels.findIndex((panel) => panel.id === item.panelId))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (!indexes.length) {
    return null;
  }

  const startIndex = indexes[0];
  const endIndex = indexes[indexes.length - 1];
  if (endIndex - startIndex + 1 !== indexes.length) {
    return null;
  }

  if (edge === "left") {
    if (startIndex <= 0) {
      return { trimMaxMm: 0, extendMaxMm: 0, blockedBy: "border" as const };
    }
    const neighbor = transom.panels[startIndex - 1];
    const panel = transom.panels[startIndex];
    if (!neighbor || !panel) {
      return null;
    }
    return {
      trimMaxMm: Math.max(0, panel.width - 100),
      extendMaxMm: Math.max(0, neighbor.width - 100),
      blockedBy: "neighbor" as const
    };
  }

  if (endIndex >= transom.panels.length - 1) {
    return { trimMaxMm: 0, extendMaxMm: 0, blockedBy: "border" as const };
  }
  const neighbor = transom.panels[endIndex + 1];
  const panel = transom.panels[endIndex];
  if (!neighbor || !panel) {
    return null;
  }
  return {
    trimMaxMm: Math.max(0, panel.width - 100),
    extendMaxMm: Math.max(0, neighbor.width - 100),
    blockedBy: "neighbor" as const
  };
}

function getTransomEdgeCapacity(
  design: PvcDesign,
  transomId: string | null | undefined,
  edge: "top" | "bottom"
) {
  if (!transomId) {
    return null;
  }

  const transomIndex = design.transoms.findIndex((item) => item.id === transomId);
  if (transomIndex === -1) {
    return null;
  }

  const transom = design.transoms[transomIndex];
  if (!transom) {
    return null;
  }

  if (edge === "top") {
    if (transomIndex <= 0) {
      return { trimMaxMm: 0, extendMaxMm: 0, blockedBy: "border" as const };
    }
    const neighbor = design.transoms[transomIndex - 1];
    return {
      trimMaxMm: Math.max(0, transom.height - 150),
      extendMaxMm: Math.max(0, neighbor.height - 150),
      blockedBy: "neighbor" as const
    };
  }

  if (transomIndex >= design.transoms.length - 1) {
    return { trimMaxMm: 0, extendMaxMm: 0, blockedBy: "border" as const };
  }
  const neighbor = design.transoms[transomIndex + 1];
  return {
    trimMaxMm: Math.max(0, transom.height - 150),
    extendMaxMm: Math.max(0, neighbor.height - 150),
    blockedBy: "neighbor" as const
  };
}

function getMullionDragCapacity(design: PvcDesign, transomId: string, panelId: string) {
  const transom = design.transoms.find((item) => item.id === transomId);
  if (!transom) {
    return null;
  }

  const panelIndex = transom.panels.findIndex((item) => item.id === panelId);
  if (panelIndex === -1 || panelIndex >= transom.panels.length - 1) {
    return null;
  }

  const leftPanel = transom.panels[panelIndex];
  const rightPanel = transom.panels[panelIndex + 1];
  if (!leftPanel || !rightPanel) {
    return null;
  }

  return {
    minDeltaMm: -(leftPanel.width - 100),
    maxDeltaMm: rightPanel.width - 100,
    leftPanelWidth: leftPanel.width,
    rightPanelWidth: rightPanel.width
  };
}

function getTransomDragCapacity(design: PvcDesign, transomId: string) {
  const transomIndex = design.transoms.findIndex((item) => item.id === transomId);
  if (transomIndex === -1 || transomIndex >= design.transoms.length - 1) {
    return null;
  }

  const topRow = design.transoms[transomIndex];
  const bottomRow = design.transoms[transomIndex + 1];
  if (!topRow || !bottomRow) {
    return null;
  }

  return {
    minDeltaMm: -(topRow.height - 150),
    maxDeltaMm: bottomRow.height - 150,
    topHeightMm: topRow.height,
    bottomHeightMm: bottomRow.height
  };
}

function buildCommandPreview(query: string): CommandPreview | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  const [command, ...args] = parts;
  const numeric = Number((args[0] ?? "").replace(",", "."));
  const secondaryNumeric = Number((args[1] ?? "").replace(",", "."));
  const tertiaryNumeric = Number((args[2] ?? "").replace(",", "."));
  const quaternaryNumeric = Number((args[3] ?? "").replace(",", "."));

  if (command === "mirror") {
    const axis = args[0];
    if (axis === "h" || axis === "horizontal") {
      return { type: "mirror", axis: "horizontal" };
    }
    if (axis === "v" || axis === "vertical") {
      return { type: "mirror", axis: "vertical" };
    }
    return { type: "mirror", axis: "pick" };
  }

  if (command === "align" && args[0] === "guide") {
    const axis = args[1] ?? "center";
    if (axis === "left" || axis === "start") {
      return { type: "guide-align", mode: "panel", position: "start" };
    }
    if (axis === "right" || axis === "end") {
      return { type: "guide-align", mode: "panel", position: "end" };
    }
    if (axis === "center" || axis === "centre") {
      return { type: "guide-align", mode: "panel", position: "center" };
    }
    if (axis === "top") {
      return { type: "guide-align", mode: "row", position: "start" };
    }
    if (axis === "bottom") {
      return { type: "guide-align", mode: "row", position: "end" };
    }
    if (axis === "middle" || axis === "mid") {
      return { type: "guide-align", mode: "row", position: "center" };
    }
  }

  if ((command === "grid" || (command === "array" && args[0] === "grid")) && parts.length >= 3) {
    const columnSource = command === "grid" ? numeric : secondaryNumeric;
    const rowSource = command === "grid" ? secondaryNumeric : tertiaryNumeric;
    const columnStepSource = command === "grid" ? tertiaryNumeric : quaternaryNumeric;
    const rowStepSource = Number((args[command === "grid" ? 3 : 4] ?? "").replace(",", "."));

    if (Number.isFinite(columnSource) && columnSource >= 2 && Number.isFinite(rowSource) && rowSource >= 2) {
      return {
        type: "grid-array",
        columns: Math.max(2, Math.min(8, Math.round(columnSource))),
        rows: Math.max(2, Math.min(6, Math.round(rowSource))),
        columnStepMm: Number.isFinite(columnStepSource) && columnStepSource > 1 ? Math.round(columnStepSource) : undefined,
        rowStepMm: Number.isFinite(rowStepSource) && rowStepSource > 1 ? Math.round(rowStepSource) : undefined
      };
    }
  }

  if ((command === "offset" || command === "off") && (args[0] === "panel" || args[0] === "row" || args[0] === "block")) {
    const mode = args[0] === "row" ? "row" : "panel";
    const deltaSource = Number((args[1] ?? "").replace(",", "."));
    const countSource = Number((args[2] ?? "").replace(",", "."));
    if (Number.isFinite(deltaSource) && deltaSource !== 0) {
      return {
        type: "offset-pattern",
        delta: Math.round(deltaSource),
        count: Number.isFinite(countSource) && countSource >= 1 ? Math.max(1, Math.min(mode === "row" ? 6 : 8, Math.round(countSource))) : 1,
        mode
      };
    }
  }

  if ((command === "trim" || command === "extend") && args[0]) {
    const deltaSource = Number((args[1] ?? "").replace(",", "."));
    if (Number.isFinite(deltaSource) && deltaSource > 0 && ["left", "right", "top", "bottom"].includes(args[0])) {
      return {
        type: "edge-adjust",
        operation: command as "trim" | "extend",
        edge: args[0] as "left" | "right" | "top" | "bottom",
        delta: Math.round(deltaSource),
        mode: args[0] === "top" || args[0] === "bottom" ? "row" : "panel"
      };
    }
  }

  if (command === "center" || command === "centre") {
    return {
      type: "center",
      mode: args[0] === "row" || args[0] === "rows" ? "row" : "panel"
    };
  }

  if (command === "align" && args[0]) {
    if (args[0] === "left" || args[0] === "start") {
      return { type: "align", mode: "panel", position: "start" };
    }
    if (args[0] === "right" || args[0] === "end") {
      return { type: "align", mode: "panel", position: "end" };
    }
    if (args[0] === "center" || args[0] === "centre") {
      return { type: "center", mode: "panel" };
    }
    if (args[0] === "top") {
      return { type: "align", mode: "row", position: "start" };
    }
    if (args[0] === "bottom") {
      return { type: "align", mode: "row", position: "end" };
    }
    if (args[0] === "middle" || args[0] === "mid") {
      return { type: "center", mode: "row" };
    }
  }

  if (command === "distribute" || command === "dist") {
    return {
      type: "distribute",
      mode: args[0] === "row" || args[0] === "rows" || args[0] === "height" ? "row" : "panel",
      label: "Distribute"
    };
  }

  if (command === "match" && args[0]) {
    return {
      type: "distribute",
      mode: args[0] === "height" || args[0] === "row" || args[0] === "rows" ? "row" : "panel",
      label: "Match"
    };
  }

  if (command === "move" && Number.isFinite(numeric) && numeric !== 0) {
    return {
      type: "move-displace",
      delta: Math.round(numeric),
      mode: "panel"
    };
  }

  if (command === "move" && (args[0] === "row" || args[0] === "rows") && Number.isFinite(secondaryNumeric) && secondaryNumeric !== 0) {
    return {
      type: "move-displace",
      delta: Math.round(secondaryNumeric),
      mode: "row"
    };
  }

  if (command === "copy" && Number.isFinite(numeric) && numeric >= 2) {
    return {
      type: "copy-series",
      count: Math.max(2, Math.min(8, Math.round(numeric))),
      stepMm: Number.isFinite(secondaryNumeric) && secondaryNumeric > 1 ? Math.round(secondaryNumeric) : undefined,
      mode: "panel"
    };
  }

  if (command === "copy" && (args[0] === "row" || args[0] === "rows")) {
    return {
      type: "copy-series",
      count: Math.max(2, Math.min(6, Math.round(Number.isFinite(secondaryNumeric) ? secondaryNumeric : 2))),
      stepMm: Number.isFinite(tertiaryNumeric) && tertiaryNumeric > 1 ? Math.round(tertiaryNumeric) : undefined,
      mode: "row"
    };
  }

  if ((command === "offset" || command === "off") && Number.isFinite(numeric) && numeric !== 0 && Number.isFinite(secondaryNumeric) && secondaryNumeric >= 2) {
    return {
      type: "offset-chain",
      delta: Math.round(numeric),
      count: Math.max(2, Math.min(8, Math.round(secondaryNumeric)))
    };
  }

  if (command === "array" && Number.isFinite(numeric) && numeric >= 2) {
    return {
      type: "array",
      count: Math.max(2, Math.min(8, Math.round(numeric))),
      stepMm: Number.isFinite(secondaryNumeric) && secondaryNumeric > 1 ? Math.round(secondaryNumeric) : undefined,
      mode: "panel"
    };
  }

  if (command === "array" && (args[0] === "row" || args[0] === "rows")) {
    return {
      type: "array",
      count: Math.max(2, Math.min(6, Math.round(Number.isFinite(secondaryNumeric) ? secondaryNumeric : 2))),
      stepMm: Number.isFinite(tertiaryNumeric) && tertiaryNumeric > 1 ? Math.round(tertiaryNumeric) : undefined,
      mode: "row"
    };
  }

  if (command === "array" && (args[0] === "col" || args[0] === "column" || args[0] === "columns")) {
    return {
      type: "array",
      count: Math.max(2, Math.min(8, Math.round(Number.isFinite(secondaryNumeric) ? secondaryNumeric : 2))),
      stepMm: Number.isFinite(tertiaryNumeric) && tertiaryNumeric > 1 ? Math.round(tertiaryNumeric) : undefined,
      mode: "panel"
    };
  }

  if (command === "offset" && Number.isFinite(numeric) && numeric !== 0) {
    return { type: "offset", delta: Math.round(numeric) };
  }

  if ((command === "copy" || command === "add") && args[0]) {
    if (args[0] === "left" || args[0] === "right") {
      return { type: "copy-panel", side: args[0] };
    }
    if (args[0] === "top" || args[0] === "bottom") {
      return { type: "copy-row", side: args[0] };
    }
  }

  if (command === "move") {
    return { type: "move", mode: args[0] === "row" ? "row" : "panel" };
  }

  return null;
}

function formatCommandPreview(preview: CommandPreview) {
  switch (preview.type) {
    case "mirror":
      if (preview.axis === "pick") {
        return "Ayna ekseni sec";
      }
      return `Aynalama ${preview.axis === "vertical" ? "Dikey Eksen" : "Yatay Eksen"}`;
    case "guide-align":
      return `Guide Align ${
        preview.mode === "row"
          ? preview.position === "start"
            ? "Top"
            : preview.position === "end"
              ? "Bottom"
              : "Middle"
          : preview.position === "start"
            ? "Left"
            : preview.position === "end"
              ? "Right"
              : "Center"
      }`;
    case "array":
      return preview.stepMm
        ? `Array ${preview.mode === "row" ? "Row" : "Col"} ${preview.count} / Step ${preview.stepMm}`
        : `Array ${preview.mode === "row" ? "Row" : "Col"} ${preview.count}`;
    case "grid-array":
      if (preview.columnStepMm && preview.rowStepMm) {
        return `Grid ${preview.columns}x${preview.rows} / ${preview.columnStepMm}-${preview.rowStepMm}`;
      }
      if (preview.columnStepMm) {
        return `Grid ${preview.columns}x${preview.rows} / Col ${preview.columnStepMm}`;
      }
      if (preview.rowStepMm) {
        return `Grid ${preview.columns}x${preview.rows} / Row ${preview.rowStepMm}`;
      }
      return `Grid ${preview.columns}x${preview.rows}`;
    case "offset-pattern":
      return `Offset ${preview.mode === "row" ? "Row" : "Panel"} ${preview.delta > 0 ? "+" : ""}${preview.delta} / ${preview.count}`;
    case "edge-adjust":
      return `${preview.operation === "trim" ? "Trim" : "Extend"} ${preview.mode === "row" ? "Row" : "Block"} ${preview.edge} ${preview.delta}`;
    case "center":
      return preview.mode === "row" ? "Center Row" : "Center Block";
    case "align":
      return `${preview.mode === "row" ? "Align Row" : "Align Block"} ${
        preview.mode === "row"
          ? preview.position === "start"
            ? "Top"
            : "Bottom"
          : preview.position === "start"
            ? "Left"
            : "Right"
      }`;
    case "distribute":
      return `${preview.label} ${preview.mode === "row" ? "Rows" : "Panels"}`;
    case "copy-series":
      return preview.stepMm
        ? `Copy ${preview.mode === "row" ? "Row" : "Panel"} x${preview.count} / Step ${preview.stepMm}`
        : `Copy ${preview.mode === "row" ? "Row" : "Panel"} x${preview.count}`;
    case "move-displace":
      return `Move ${preview.mode === "row" ? "Row" : "Panel"} ${preview.delta > 0 ? "+" : ""}${preview.delta}`;
    case "offset-chain":
      return `Offset ${preview.delta > 0 ? "+" : ""}${preview.delta} / ${preview.count} paralel`;
    case "offset":
      return `Offset ${preview.delta > 0 ? "+" : ""}${preview.delta}`;
    case "copy-panel":
      return `Panel ${preview.side === "left" ? "sol" : "sag"} kopya`;
    case "copy-row":
      return `Satir ${preview.side === "top" ? "ust" : "alt"} kopya`;
    case "move":
      return preview.mode === "row" ? "Satir tasi" : "Panel tasi";
  }
}

function getVerticalSnapCandidate(
  design: PvcDesign,
  transomId: string,
  panelId: string,
  desiredWidth: number
): { value: number; label: string } | null {
  const transom = design.transoms.find((item) => item.id === transomId);
  if (!transom) {
    return null;
  }

  const panelIndex = transom.panels.findIndex((item) => item.id === panelId);
  if (panelIndex === -1) {
    return null;
  }

  const totalWidth = transom.panels.reduce((sum, panel) => sum + panel.width, 0);
  const threshold = 24;
  const candidates: Array<{ value: number; label: string }> = [];
  const precedingWidth = transom.panels.slice(0, panelIndex).reduce((sum, panel) => sum + panel.width, 0);
  const maxAllowedWidth = Math.max(100, totalWidth - 100 * (transom.panels.length - 1));
  const equalWidth = Math.round(totalWidth / transom.panels.length);
  candidates.push({ value: equalWidth, label: "Esit dagitim" });

  design.transoms.forEach((row) => {
    if (row.id === transomId || panelIndex >= row.panels.length) {
      return;
    }
    candidates.push({
      value: row.panels[panelIndex].width,
      label: `Satir referansi ${panelIndex + 1}`
    });
  });

  if (transom.panels.length === 2) {
    candidates.push({ value: Math.round(totalWidth / 2), label: "Orta eksen" });
  }

  design.guides
    .filter((guide) => guide.orientation === "vertical")
    .forEach((guide) => {
      const guideWidth = guide.positionMm - precedingWidth;
      if (guideWidth >= 100 && guideWidth <= maxAllowedWidth) {
        candidates.push({ value: guideWidth, label: `Guide ${guide.label}` });
      }
    });

  return chooseSnapCandidate(desiredWidth, candidates, threshold);
}

function getHorizontalSnapCandidate(
  design: PvcDesign,
  transomId: string,
  desiredHeight: number
): { value: number; label: string } | null {
  const transomIndex = design.transoms.findIndex((item) => item.id === transomId);
  if (transomIndex === -1) {
    return null;
  }

  const threshold = 24;
  const candidates: Array<{ value: number; label: string }> = [];
  const precedingHeight = design.transoms.slice(0, transomIndex).reduce((sum, row) => sum + row.height, 0);
  const maxAllowedHeight = Math.max(150, design.totalHeight - 150 * (design.transoms.length - 1));
  const equalHeight = Math.round(design.totalHeight / design.transoms.length);
  candidates.push({ value: equalHeight, label: "Esit satir" });

  design.transoms.forEach((row, index) => {
    if (index !== transomIndex) {
      candidates.push({ value: row.height, label: `Satir ${index + 1} referansi` });
    }
  });

  if (design.transoms.length === 2) {
    candidates.push({ value: Math.round(design.totalHeight / 2), label: "Merkez yatay" });
  }

  design.guides
    .filter((guide) => guide.orientation === "horizontal")
    .forEach((guide) => {
      const guideHeight = guide.positionMm - precedingHeight;
      if (guideHeight >= 150 && guideHeight <= maxAllowedHeight) {
        candidates.push({ value: guideHeight, label: `Guide ${guide.label}` });
      }
    });

  return chooseSnapCandidate(desiredHeight, candidates, threshold);
}

function getGuideMoveSnapCandidate(
  design: PvcDesign,
  guideId: string,
  desiredPosition: number
): { value: number; label: string } | null {
  const guide = design.guides.find((item) => item.id === guideId);
  if (!guide) {
    return null;
  }

  const threshold = 22;
  const candidates: Array<{ value: number; label: string }> = [];

  if (guide.orientation === "vertical") {
    design.transoms.forEach((row, rowIndex) => {
      let cumulativeWidth = 0;
      row.panels.slice(0, -1).forEach((panel, panelIndex) => {
        cumulativeWidth += panel.width;
        candidates.push({
          value: cumulativeWidth,
          label: `Satir ${rowIndex + 1} / Kayit ${panelIndex + 1}`
        });
      });
    });
    candidates.push({ value: Math.round(design.totalWidth / 2), label: "Merkez eksen" });
  } else {
    let cumulativeHeight = 0;
    design.transoms.slice(0, -1).forEach((row, rowIndex) => {
      cumulativeHeight += row.height;
      candidates.push({
        value: cumulativeHeight,
        label: `Satir ayirici ${rowIndex + 1}`
      });
    });
    candidates.push({ value: Math.round(design.totalHeight / 2), label: "Merkez yatay" });
  }

  design.guides
    .filter((item) => item.orientation === guide.orientation && item.id !== guide.id)
    .forEach((item) => {
      candidates.push({ value: item.positionMm, label: `Guide ${item.label}` });
    });

  return chooseSnapCandidate(desiredPosition, candidates, threshold);
}

function chooseSnapCandidate(
  desiredValue: number,
  candidates: Array<{ value: number; label: string }>,
  threshold: number
): { value: number; label: string } | null {
  let winner: { value: number; label: string } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    const distance = Math.abs(candidate.value - desiredValue);
    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance;
      winner = candidate;
    }
  });

  return winner;
}

function formatOpeningLabel(openingType: OpeningType) {
  switch (openingType) {
    case "turn-right":
      return "Sag acilim";
    case "turn-left":
      return "Sol acilim";
    case "tilt-turn-right":
      return "Vasistas + sag";
    case "sliding":
      return "Surme";
    default:
      return "Sabit";
  }
}

function snapValue(value: number, step: number) {
  if (step <= 1) {
    return value;
  }
  return Math.round(value / step) * step;
}

function parsePlacementVectorValue(value: string) {
  const normalized = value.trim().replace("@", "").replace(";", ",");
  if (!normalized.includes(",")) {
    return null;
  }
  const [xSource, ySource] = normalized.split(",").map((item) => Number(item.trim().replace(",", ".")));
  if (!Number.isFinite(xSource) || !Number.isFinite(ySource)) {
    return null;
  }
  if (Math.abs(xSource) < 0.001 && Math.abs(ySource) < 0.001) {
    return null;
  }
  return {
    dxMm: Math.round(xSource),
    dyMm: Math.round(ySource)
  };
}

function appendRectOsnapCandidates(
  candidates: OsnapCandidate[],
  rect: { x: number; y: number; width: number; height: number },
  modes: OsnapModes,
  detail: string
) {
  const { x, y, width, height } = rect;
  if (modes.endpoint) {
    candidates.push(
      { point: { x, y }, label: "END", detail, priority: 1 },
      { point: { x: x + width, y }, label: "END", detail, priority: 1 },
      { point: { x, y: y + height }, label: "END", detail, priority: 1 },
      { point: { x: x + width, y: y + height }, label: "END", detail, priority: 1 }
    );
  }

  if (modes.midpoint) {
    candidates.push(
      { point: { x: x + width / 2, y }, label: "MID", detail, priority: 2 },
      { point: { x: x + width / 2, y: y + height }, label: "MID", detail, priority: 2 },
      { point: { x, y: y + height / 2 }, label: "MID", detail, priority: 2 },
      { point: { x: x + width, y: y + height / 2 }, label: "MID", detail, priority: 2 }
    );
  }

  if (modes.center) {
    candidates.push({
      point: { x: x + width / 2, y: y + height / 2 },
      label: "CEN",
      detail,
      priority: 3
    });
  }
}

function appendVerticalLineOsnapCandidates(
  candidates: OsnapCandidate[],
  x: number,
  y1: number,
  y2: number,
  modes: OsnapModes,
  detail: string
) {
  if (modes.endpoint) {
    candidates.push(
      { point: { x, y: y1 }, label: "END", detail, priority: 1 },
      { point: { x, y: y2 }, label: "END", detail, priority: 1 }
    );
  }
  if (modes.midpoint) {
    candidates.push({
      point: { x, y: (y1 + y2) / 2 },
      label: "MID",
      detail,
      priority: 2
    });
  }
}

function appendHorizontalLineOsnapCandidates(
  candidates: OsnapCandidate[],
  x1: number,
  x2: number,
  y: number,
  modes: OsnapModes,
  detail: string
) {
  if (modes.endpoint) {
    candidates.push(
      { point: { x: x1, y }, label: "END", detail, priority: 1 },
      { point: { x: x2, y }, label: "END", detail, priority: 1 }
    );
  }
  if (modes.midpoint) {
    candidates.push({
      point: { x: (x1 + x2) / 2, y },
      label: "MID",
      detail,
      priority: 2
    });
  }
}

function resolveOsnapCandidate(
  worldPoint: { x: number; y: number } | null,
  design: PvcDesign,
  canvasLayout: CanvasLayout,
  scale: number,
  modes: OsnapModes | null,
  zoom: number,
  technicalReferencePoints?: Array<{ x: number; y: number; detail: string }>,
  technicalDetailPoints?: Array<{ x: number; y: number; detail: string }>
) {
  if (!worldPoint || !modes) {
    return null;
  }

  const candidates: OsnapCandidate[] = [];
  const verticalLines: Array<{ x: number; y1: number; y2: number; detail: string }> = [];
  const horizontalLines: Array<{ x1: number; x2: number; y: number; detail: string }> = [];
  const { outerRect, innerRect } = canvasLayout;

  appendRectOsnapCandidates(candidates, outerRect, modes, "Kasa");
  appendRectOsnapCandidates(candidates, innerRect, modes, "Ic Kasa");
  verticalLines.push(
    { x: innerRect.x, y1: innerRect.y, y2: innerRect.y + innerRect.height, detail: "Ic Kasa Sol" },
    { x: innerRect.x + innerRect.width, y1: innerRect.y, y2: innerRect.y + innerRect.height, detail: "Ic Kasa Sag" }
  );
  horizontalLines.push(
    { x1: innerRect.x, x2: innerRect.x + innerRect.width, y: innerRect.y, detail: "Ic Kasa Ust" },
    { x1: innerRect.x, x2: innerRect.x + innerRect.width, y: innerRect.y + innerRect.height, detail: "Ic Kasa Alt" }
  );

  canvasLayout.rows.forEach((row) => {
    const transom = design.transoms[row.transomIndex];
    const topY = row.cellBounds.y;
    const bottomY = row.cellBounds.y + row.cellBounds.height;
    horizontalLines.push(
      { x1: innerRect.x, x2: innerRect.x + innerRect.width, y: topY, detail: `Satir ${row.transomIndex + 1} Ust` },
      { x1: innerRect.x, x2: innerRect.x + innerRect.width, y: bottomY, detail: `Satir ${row.transomIndex + 1} Alt` }
    );

    row.panels.forEach((panel) => {
      const sourcePanel = transom?.panels[panel.panelIndex];
      if (!sourcePanel) {
        return;
      }
      appendRectOsnapCandidates(
        candidates,
        panel.bounds,
        modes,
        `Panel ${sourcePanel.label}`
      );
    });

    row.mullions.forEach((bar) => {
      verticalLines.push({
        x: bar.centerX,
        y1: bar.rect.y,
        y2: bar.rect.y + bar.rect.height,
        detail: `Dikey Kayit ${row.transomIndex + 1}.${bar.panelIndex + 1}`
      });
    });
  });

  design.guides.forEach((guide) => {
    if (guide.orientation === "vertical") {
      verticalLines.push({
        x: innerRect.x + guide.positionMm * scale,
        y1: innerRect.y,
        y2: innerRect.y + innerRect.height,
        detail: `Guide ${guide.label}`
      });
    } else {
      horizontalLines.push({
        x1: innerRect.x,
        x2: innerRect.x + innerRect.width,
        y: innerRect.y + guide.positionMm * scale,
        detail: `Guide ${guide.label}`
      });
    }
  });

  verticalLines.forEach((line) => appendVerticalLineOsnapCandidates(candidates, line.x, line.y1, line.y2, modes, line.detail));
  horizontalLines.forEach((line) =>
    appendHorizontalLineOsnapCandidates(candidates, line.x1, line.x2, line.y, modes, line.detail)
  );

  if (modes.intersection) {
    verticalLines.forEach((verticalLine) => {
      horizontalLines.forEach((horizontalLine) => {
        if (
          verticalLine.x >= horizontalLine.x1 - 0.1 &&
          verticalLine.x <= horizontalLine.x2 + 0.1 &&
          horizontalLine.y >= verticalLine.y1 - 0.1 &&
          horizontalLine.y <= verticalLine.y2 + 0.1
        ) {
          candidates.push({
            point: {
              x: verticalLine.x,
              y: horizontalLine.y
            },
            label: "INT",
            detail: `${verticalLine.detail} x ${horizontalLine.detail}`,
            priority: 0
          });
        }
      });
    });
  }

  technicalReferencePoints?.forEach((point) => {
    candidates.push({
      point: { x: point.x, y: point.y },
      label: "INT",
      detail: point.detail,
      priority: 0
    });
  });

  technicalDetailPoints?.forEach((point) => {
    candidates.push({
      point: { x: point.x, y: point.y },
      label: "END",
      detail: point.detail,
      priority: 1
    });
  });

  const threshold = Math.max(9, 16 / Math.max(0.4, zoom));
  let nearest: { candidate: OsnapCandidate; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.point.x - worldPoint.x, candidate.point.y - worldPoint.y);
    if (distance > threshold) {
      continue;
    }

    if (
      !nearest ||
      distance < nearest.distance - 0.001 ||
      (Math.abs(distance - nearest.distance) < 0.001 && candidate.priority < nearest.candidate.priority)
    ) {
      nearest = { candidate, distance };
    }
  }

  return nearest ? nearest.candidate : null;
}

function projectPlacementTelemetry(
  placement: InteractivePlacement,
  cursorPoint: { x: number; y: number } | null,
  scale: number,
  snapMm: number,
  options?: {
    orthoMode?: boolean;
    polarMode?: boolean;
    polarAngle?: number;
    osnapLabel?: string | null;
  }
): PlacementTelemetry | null {
  if (!cursorPoint || !placement || (placement.type !== "copy" && placement.type !== "move") || placement.phase !== "target" || !placement.basePoint) {
    return null;
  }

  let dxMm = snapValue((cursorPoint.x - placement.basePoint.x) / scale, snapMm);
  let dyMm = snapValue((cursorPoint.y - placement.basePoint.y) / scale, snapMm);
  let trackingMode: PlacementTelemetry["trackingMode"] = "free";

  if (placement.lockedVectorMm) {
    dxMm = placement.lockedVectorMm.dxMm;
    dyMm = placement.lockedVectorMm.dyMm;
    trackingMode = "vector";
  } else if (placement.axisLock === "x") {
    dyMm = 0;
  } else if (placement.axisLock === "y") {
    dxMm = 0;
  } else if (options?.orthoMode) {
    trackingMode = "ortho";
    if (Math.abs(dxMm) >= Math.abs(dyMm)) {
      dyMm = 0;
    } else {
      dxMm = 0;
    }
  } else if (options?.polarMode) {
    const rawDistance = Math.hypot(dxMm, dyMm);
    if (rawDistance > 0.001) {
      const angleStep = Math.max(5, options.polarAngle ?? 45);
      const stepRad = (angleStep * Math.PI) / 180;
      const snappedAngle = Math.round(Math.atan2(dyMm, dxMm) / stepRad) * stepRad;
      dxMm = snapValue(Math.cos(snappedAngle) * rawDistance, snapMm);
      dyMm = snapValue(Math.sin(snappedAngle) * rawDistance, snapMm);
      trackingMode = "polar";
    }
  }

  const rawDistance = Math.hypot(dxMm, dyMm);
  if (placement.lockedDistanceMm && placement.lockedDistanceMm > 0) {
    if (rawDistance < 0.001) {
      if (placement.axisLock === "y") {
        dyMm = placement.lockedDistanceMm;
      } else {
        dxMm = placement.lockedDistanceMm;
      }
    } else {
      const factor = placement.lockedDistanceMm / rawDistance;
      dxMm = snapValue(dxMm * factor, snapMm);
      dyMm = snapValue(dyMm * factor, snapMm);
    }
  }

  const point = {
    x: placement.basePoint.x + dxMm * scale,
    y: placement.basePoint.y + dyMm * scale
  };

  return {
    point,
    dxMm,
    dyMm,
    distanceMm: Math.round(Math.hypot(dxMm, dyMm)),
    angleDeg: Math.round((Math.atan2(dyMm, dxMm) * 180) / Math.PI),
    axisLock: placement.axisLock ?? null,
    lockedDistanceMm: placement.lockedDistanceMm ?? null,
    lockedVectorMm: placement.lockedVectorMm ?? null,
    trackingMode,
    osnapLabel: options?.osnapLabel ?? null
  };
}

function buildBom(design: PvcDesign) {
  const openingPanels = design.transoms.flatMap((item) => item.panels).filter((panel) => panel.openingType !== "fixed").length;
  const glassAreaM2 = design.transoms.reduce(
    (sum, transom) => sum + transom.panels.reduce((sub, panel) => sub + calculatePanelArea(panel.width, transom.height), 0),
    0
  );
  const profileLengthMeters =
    (design.totalWidth * 2 +
      design.totalHeight * 2 +
      design.transoms.reduce((sum, transom) => sum + Math.max(0, transom.panels.length - 1) * transom.height, 0) +
      (design.transoms.length - 1) * design.totalWidth) /
    1000;
  const hingeCount = Math.max(2, openingPanels * (design.materials.hardwareQuality === "premium" ? 3 : 2));
  return { openingPanels, glassAreaM2, profileLengthMeters, hingeCount };
}

function buildBomHtml(design: PvcDesign, bom: ReturnType<typeof buildBom>) {
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${design.name} BOM</title>
      <style>
        body { font-family: Segoe UI, Arial, sans-serif; padding: 24px; color: #111827; }
        h1 { margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>${design.name}</h1>
      <p>${design.customer.customerName || "Musteri tanimsiz"} | ${design.totalWidth} x ${design.totalHeight} mm</p>
      <table>
        <tr><th>Kalem</th><th>Deger</th></tr>
        <tr><td>Toplam Profil</td><td>${bom.profileLengthMeters.toFixed(2)} m</td></tr>
        <tr><td>Cam Alani</td><td>${bom.glassAreaM2.toFixed(2)} m²</td></tr>
        <tr><td>Menteşe</td><td>${bom.hingeCount} Adet</td></tr>
        <tr><td>Acilir Kanat</td><td>${bom.openingPanels} Adet</td></tr>
      </table>
    </body>
  </html>`;
}

function PvcCanvas({
  design,
  selected,
  selectedObject,
  multiSelection,
  onMultiSelectionChange,
  onObjectSelect,
  visibleLayers,
  onAddGuide,
  onMoveGuide,
  onInsertPanel,
  onInsertTransom,
  viewMode,
  toolMode,
  onToolModeChange,
  commandTarget,
  commandPreview,
  panelShiftRange,
  transomShiftRange,
  activePanelBlockRefs,
  selectedTransomId,
  activePanelPreviewCount,
  activeRowPreviewCount,
  interactivePlacement,
  onCommandTargetChange,
  onApplyPlacement,
  onApplySelectedMullionPreset,
  onApplySelectedTransomPreset,
  onRunCadCommand,
  onCancelPlacement,
  onSplitVertical,
  onSplitHorizontal,
  onDeletePanel,
  zoom,
  pan,
  snapMm,
  osnapEnabled,
  osnapModes,
  orthoMode,
  polarMode,
  polarAngle,
  onWheelZoom,
  onPanStart,
  onPanMove,
  onPanEnd,
  panEnabled
}: {
  design: PvcDesign;
  selected: { transomId: string; panelId: string } | null;
  selectedObject: CanvasObjectSelection | null;
  multiSelection: PanelRef[];
  onMultiSelectionChange: (panels: PanelRef[]) => void;
  onObjectSelect: (selection: CanvasObjectSelection, options?: ObjectSelectOptions) => void;
  visibleLayers: VisibleLayers;
  onAddGuide: (orientation: GuideOrientation, positionMm: number, label?: string) => void;
  onMoveGuide: (guideId: string, positionMm: number) => void;
  onInsertPanel: (side: "left" | "right") => void;
  onInsertTransom: (side: "top" | "bottom") => void;
  viewMode: "studio" | "technical" | "presentation";
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  commandTarget: CommandTarget | null;
  commandPreview: CommandPreview | null;
  panelShiftRange: { min: number; max: number } | null;
  transomShiftRange: { min: number; max: number } | null;
  activePanelBlockRefs: PanelRef[];
  selectedTransomId: string | null;
  activePanelPreviewCount: number;
  activeRowPreviewCount: number;
  interactivePlacement: InteractivePlacement;
  onCommandTargetChange: (target: CommandTarget | null) => void;
  onApplyPlacement: (target: InteractiveCanvasTarget) => void;
  onApplySelectedMullionPreset: (action: string) => boolean;
  onApplySelectedTransomPreset: (action: string) => boolean;
  onRunCadCommand: (command: string) => void;
  onCancelPlacement: () => void;
  onSplitVertical: () => void;
  onSplitHorizontal: () => void;
  onDeletePanel: () => void;
  zoom: number;
  pan: { x: number; y: number };
  snapMm: number;
  osnapEnabled: boolean;
  osnapModes: OsnapModes;
  orthoMode: boolean;
  polarMode: boolean;
  polarAngle: number;
  onWheelZoom: (delta: number, reset?: boolean) => void;
  onPanStart: (clientX: number, clientY: number) => void;
  onPanMove: (clientX: number, clientY: number) => void;
  onPanEnd: () => void;
  panEnabled: boolean;
}) {
  const selectPanel = useDesignerStore((state) => state.selectPanel);
  const setPanelWidthById = useDesignerStore((state) => state.setPanelWidthById);
  const setTransomHeightById = useDesignerStore((state) => state.setTransomHeightById);
  const adjustPanelBlockEdge = useDesignerStore((state) => state.adjustPanelBlockEdge);
  const adjustSelectedTransomEdge = useDesignerStore((state) => state.adjustSelectedTransomEdge);
  const setOuterFrameThickness = useDesignerStore((state) => state.setOuterFrameThickness);
  const setMullionThickness = useDesignerStore((state) => state.setMullionThickness);
  const setSelectedOpeningType = useDesignerStore((state) => state.setSelectedOpeningType);
  const setGlassType = useDesignerStore((state) => state.setGlassType);
  const setHardwareQuality = useDesignerStore((state) => state.setHardwareQuality);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const hudDimensionInputRef = useRef<HTMLInputElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [inlineDimensionEditor, setInlineDimensionEditor] = useState<
    | {
        kind: "panel";
        transomId: string;
        panelId: string;
        value: string;
        x: number;
        y: number;
      }
    | {
        kind: "row";
        transomId: string;
        value: string;
        x: number;
        y: number;
      }
    | null
  >(null);
  const [hudDimensionDraft, setHudDimensionDraft] = useState("");
  const [dragPreview, setDragPreview] = useState<string | null>(null);
  const [dragHint, setDragHint] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const dragAppliedDeltaRef = useRef(0);
  const [dragState, setDragState] = useState<
    | {
        type: "vertical";
        transomId: string;
        panelId: string;
        startClientX: number;
        startWidth: number;
        scale: number;
      }
    | {
        type: "horizontal";
        transomId: string;
        startClientY: number;
        startHeight: number;
        scale: number;
      }
    | {
        type: "guide-vertical";
        guideId: string;
        startClientX: number;
        startPosition: number;
        scale: number;
      }
    | {
        type: "guide-horizontal";
        guideId: string;
        startClientY: number;
        startPosition: number;
        scale: number;
      }
    | {
        type: "object-width";
        transomId: string;
        panelId: string;
        startClientX: number;
        startWidth: number;
        scale: number;
        sourceLabel: string;
      }
    | {
        type: "object-height";
        transomId: string;
        startClientY: number;
        startHeight: number;
        scale: number;
        sourceLabel: string;
      }
    | {
        type: "frame-thickness";
        axis: "x" | "y";
        startClient: number;
        startThickness: number;
        scale: number;
      }
    | {
        type: "mullion-thickness";
        axis: "x" | "y";
        startClient: number;
        startThickness: number;
        scale: number;
      }
    | null
  >(null);
  const margin = 120;
  const drawingWidth = 900;
  const rulerBandSize = 34;
  const scale = drawingWidth / (design.totalWidth + design.outerFrameThickness * 2);
  const svgWidth = drawingWidth + margin * 2;
  const outerH = (design.totalHeight + design.outerFrameThickness * 2) * scale;
  const svgHeight = outerH + 300;

  const outerX = margin;
  const outerY = 120;
  const outerW = drawingWidth;
  const isTechnical = viewMode === "technical";
  const isPresentation = viewMode === "presentation";
  const canvasLayout = useMemo(
    () => buildCanvasLayout(design, { x: outerX, y: outerY, width: outerW, height: outerH }, scale),
    [design, outerH, outerW, outerX, outerY, scale]
  );
  const { frameInset, innerRect, mullionSize } = canvasLayout;
  const selectedBounds = useMemo(() => getSelectedBounds(canvasLayout, selected), [canvasLayout, selected]);
  const selectedPanelData = useMemo(() => {
    if (!selected) {
      return null;
    }

    const transomIndex = design.transoms.findIndex((item) => item.id === selected.transomId);
    if (transomIndex === -1) {
      return null;
    }

    const transom = design.transoms[transomIndex];
    const panelIndex = transom.panels.findIndex((item) => item.id === selected.panelId);
    if (panelIndex === -1) {
      return null;
    }

    return {
      transom,
      transomIndex,
      panel: transom.panels[panelIndex],
      panelIndex
    };
  }, [design, selected]);
  const multiSelectionKeys = useMemo(
    () => new Set(multiSelection.map((panel) => `${panel.transomId}:${panel.panelId}`)),
    [multiSelection]
  );
  const blockSelectionPreview = useMemo(
    () => buildBlockSelectionPreview(canvasLayout, design, multiSelection),
    [canvasLayout, design, multiSelection]
  );
  const worldCursor = useMemo(() => {
    if (!cursor) {
      return null;
    }

    return {
      x: (cursor.x - pan.x) / zoom,
      y: (cursor.y - pan.y) / zoom
    };
  }, [cursor, pan.x, pan.y, zoom]);
  const osnapCandidate = useMemo(
    () =>
      resolveOsnapCandidate(
        worldCursor,
        design,
        canvasLayout,
        scale,
        osnapEnabled ? osnapModes : null,
        zoom
      ),
    [canvasLayout, design, osnapEnabled, osnapModes, scale, worldCursor, zoom]
  );
  const rulerStepMm = useMemo(() => getRulerStepMm(scale, zoom), [scale, zoom]);
  const horizontalRulerTicks = useMemo(
    () =>
      buildRulerTicks(design.totalWidth, rulerStepMm)
        .map((value) => ({
          value,
          x: pan.x + (innerRect.x + value * scale) * zoom
        }))
        .filter((tick) => tick.x >= rulerBandSize && tick.x <= svgWidth - 18),
    [design.totalWidth, innerRect.x, pan.x, rulerBandSize, rulerStepMm, scale, svgWidth, zoom]
  );
  const verticalRulerTicks = useMemo(
    () =>
      buildRulerTicks(design.totalHeight, rulerStepMm)
        .map((value) => ({
          value,
          y: pan.y + (innerRect.y + value * scale) * zoom
        }))
        .filter((tick) => tick.y >= rulerBandSize && tick.y <= svgHeight - 18),
    [design.totalHeight, innerRect.y, pan.y, rulerBandSize, rulerStepMm, scale, svgHeight, zoom]
  );
  const selectedHud = useMemo(() => {
    if (!selectedBounds || !selectedPanelData) {
      return null;
    }

    return {
      x: clamp(pan.x + (selectedBounds.x + selectedBounds.width / 2) * zoom, 114, svgWidth - 114),
      y: Math.max(72, pan.y + selectedBounds.y * zoom - 24),
      title: selectedPanelData.panel.label,
      subtitle: `${selectedPanelData.panel.width} x ${selectedPanelData.transom.height} mm`,
      detail: `${formatOpeningLabel(selectedPanelData.panel.openingType)} | ${calculatePanelArea(
        selectedPanelData.panel.width,
        selectedPanelData.transom.height
      ).toFixed(2)} m²`
    };
  }, [pan.x, pan.y, selectedBounds, selectedPanelData, svgWidth, zoom]);
  const selectedTechnicalPanel = useMemo(() => {
    if (!selectedPanelData) {
      return null;
    }

    return buildPanelEngineering(
      design,
      selectedPanelData.panel.width,
      selectedPanelData.transom.height,
      selectedPanelData.panel.openingType
    );
  }, [design, selectedPanelData]);
  const technicalDetailRows = useMemo(() => {
    if (!selectedPanelData || !selectedTechnicalPanel) {
      return [];
    }

    return [
      {
        id: "D1",
        title: "Panel Kimligi",
        value: `${selectedPanelData.panel.label} / ${formatOpeningLabel(selectedPanelData.panel.openingType)}`
      },
      {
        id: "D2",
        title: "Net Kanat",
        value: `${Math.round(selectedTechnicalPanel.approxSashWidthMm)} x ${Math.round(selectedTechnicalPanel.approxSashHeightMm)} mm`
      },
      {
        id: "D3",
        title: "Net Cam",
        value: `${Math.round(selectedTechnicalPanel.approxGlassWidthMm)} x ${Math.round(selectedTechnicalPanel.approxGlassHeightMm)} mm`
      },
      {
        id: "D4",
        title: "Sistem",
        value: `${profileSeriesCatalog[design.materials.profileSeries].label} / ${glassCatalog[design.materials.glassType].label}`
      }
    ];
  }, [design.materials.glassType, design.materials.profileSeries, selectedPanelData, selectedTechnicalPanel]);
  const selectedRowBounds = useMemo(() => {
    if (!selectedPanelData) {
      return null;
    }

    return getCanvasRowLayout(canvasLayout, selectedPanelData.transom.id)?.bounds ?? null;
  }, [canvasLayout, selectedPanelData]);
  const hudDimensionTarget = useMemo(() => {
    if (isTechnical || !visibleLayers.hud || inlineDimensionEditor || interactivePlacement) {
      return null;
    }

    if (selectedObject?.type === "mullion") {
      const bar = getCanvasMullionLayout(canvasLayout, selectedObject.transomId, selectedObject.panelId);
      const transom = design.transoms.find((item) => item.id === selectedObject.transomId);
      const panel = transom?.panels.find((item) => item.id === selectedObject.panelId);
      if (!bar || !panel) {
        return null;
      }

      return {
        key: `mullion:${selectedObject.transomId}:${selectedObject.panelId}`,
        kind: "panel" as const,
        transomId: selectedObject.transomId,
        panelId: selectedObject.panelId,
        value: panel.width,
        label: "Dikey Kayit",
        x: pan.x + bar.centerX * zoom,
        y: pan.y + bar.rect.y * zoom - 18
      };
    }

    if (selectedObject?.type === "transom-bar") {
      const bar = getCanvasHorizontalBarLayout(canvasLayout, selectedObject.transomId);
      const transom = design.transoms.find((item) => item.id === selectedObject.transomId);
      if (!bar || !transom) {
        return null;
      }

      return {
        key: `transom:${selectedObject.transomId}`,
        kind: "row" as const,
        transomId: selectedObject.transomId,
        value: transom.height,
        label: "Yatay Kayit",
        x: pan.x + (bar.rect.x + bar.rect.width / 2) * zoom,
        y: pan.y + bar.rect.y * zoom - 18
      };
    }

    return null;
  }, [canvasLayout, design.transoms, inlineDimensionEditor, interactivePlacement, isTechnical, pan.x, pan.y, selectedObject, visibleLayers.hud, zoom]);
  const panelCenterDelta = useMemo(() => {
    if (!blockSelectionPreview) {
      return null;
    }

    const transom = design.transoms.find((item) => item.id === blockSelectionPreview.transomId);
    if (!transom) {
      return null;
    }

    const indexes = blockSelectionPreview.panels
      .map((item) => transom.panels.findIndex((panel) => panel.id === item.panelId))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);
    if (!indexes.length || indexes[0] <= 0 || indexes[indexes.length - 1] >= transom.panels.length - 1) {
      return null;
    }

    const leftNeighbor = transom.panels[indexes[0] - 1];
    const rightNeighbor = transom.panels[indexes[indexes.length - 1] + 1];
    if (!leftNeighbor || !rightNeighbor) {
      return null;
    }

    return Math.round((rightNeighbor.width - leftNeighbor.width) / 2);
  }, [blockSelectionPreview, design.transoms]);
  const transomCenterDelta = useMemo(() => {
    if (!selectedPanelData) {
      return null;
    }

    const transomIndex = design.transoms.findIndex((item) => item.id === selectedPanelData.transom.id);
    if (transomIndex <= 0 || transomIndex >= design.transoms.length - 1) {
      return null;
    }

    const aboveTransom = design.transoms[transomIndex - 1];
    const belowTransom = design.transoms[transomIndex + 1];
    if (!aboveTransom || !belowTransom) {
      return null;
    }

    return Math.round((belowTransom.height - aboveTransom.height) / 2);
  }, [design.transoms, selectedPanelData]);
  const placementTelemetry = useMemo(
    () =>
      projectPlacementTelemetry(interactivePlacement, osnapCandidate?.point ?? worldCursor, scale, snapMm, {
        orthoMode,
        polarMode,
        polarAngle,
        osnapLabel: osnapCandidate?.label ?? null
      }),
    [interactivePlacement, orthoMode, osnapCandidate, polarAngle, polarMode, scale, snapMm, worldCursor]
  );
  const projectedWorldCursor = placementTelemetry?.point ?? osnapCandidate?.point ?? worldCursor;
  const cursorMeasure = useMemo(() => {
    if (!projectedWorldCursor) {
      return null;
    }

    return {
      xMm: clamp(Math.round((projectedWorldCursor.x - innerRect.x) / scale), 0, design.totalWidth),
      yMm: clamp(Math.round((projectedWorldCursor.y - innerRect.y) / scale), 0, design.totalHeight)
    };
  }, [design.totalHeight, design.totalWidth, innerRect.x, innerRect.y, projectedWorldCursor, scale]);
  const interactiveCanvasTarget = useMemo(
    () =>
      interactivePlacement && projectedWorldCursor
        ? resolveInteractiveCanvasTarget(
            interactivePlacement,
            projectedWorldCursor,
            design,
            canvasLayout,
            scale,
            selectedBounds,
            selectedRowBounds
          )
        : null,
    [
      canvasLayout,
      design,
      interactivePlacement,
      scale,
      selectedBounds,
      selectedRowBounds,
      projectedWorldCursor,
      worldCursor
    ]
  );
  const showPanelCanvasActions =
    selectedBounds &&
    viewMode !== "technical" &&
    (!selectedObject || selectedObject.type === "panel");
  const activeVerticalGuide = useMemo(() => {
    if (!dragState || (dragState.type !== "vertical" && dragState.type !== "object-width")) {
      return null;
    }

    const bar = getCanvasMullionLayout(canvasLayout, dragState.transomId, dragState.panelId);
    const row = getCanvasRowLayout(canvasLayout, dragState.transomId);
    const transom = design.transoms.find((item) => item.id === dragState.transomId);
    if (!bar || !row || !transom) {
      return null;
    }

    const leftPanel = transom.panels[bar.panelIndex];
    const rightPanel = transom.panels[bar.panelIndex + 1];
    if (!leftPanel || !rightPanel) {
      return null;
    }

    return {
      x: pan.x + bar.centerX * zoom,
      y1: pan.y + row.bounds.y * zoom,
      y2: pan.y + (row.bounds.y + row.bounds.height) * zoom,
      leftLabel: `${leftPanel.width} mm`,
      rightLabel: `${rightPanel.width} mm`
    };
  }, [canvasLayout, design, dragState, pan.x, pan.y, zoom]);
  const activeHorizontalGuide = useMemo(() => {
    if (!dragState || (dragState.type !== "horizontal" && dragState.type !== "object-height")) {
      return null;
    }

    const bar = getCanvasHorizontalBarLayout(canvasLayout, dragState.transomId);
    const transomIndex = design.transoms.findIndex((item) => item.id === dragState.transomId);
    if (!bar || transomIndex === -1 || transomIndex >= design.transoms.length - 1) {
      return null;
    }

    const transom = design.transoms[transomIndex];
    const nextTransom = design.transoms[transomIndex + 1];

    return {
      y: pan.y + bar.centerY * zoom,
      x1: pan.x + bar.rect.x * zoom,
      x2: pan.x + (bar.rect.x + bar.rect.width) * zoom,
      topLabel: `${transom.height} mm`,
      bottomLabel: `${nextTransom.height} mm`
    };
  }, [canvasLayout, design, dragState, pan.x, pan.y, zoom]);
  const technicalReferences = useMemo(
    () => buildTechnicalPanelReferences(design, canvasLayout),
    [canvasLayout, design]
  );
  const technicalScheduleHeight = useMemo(
    () => getTechnicalScheduleHeight(technicalReferences.length),
    [technicalReferences.length]
  );
  const technicalBoardData = useMemo(() => {
    const report = buildManufacturingReport(design);
    const snapshot = buildDesignSnapshot(design);
    const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
    const glassSpec = glassCatalog[design.materials.glassType];
    const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];
    const frameColorLabel =
      frameColorOptions.find((item) => item.value === design.materials.frameColor)?.label ?? design.materials.frameColor;

    return {
      customerName: design.customer.customerName || "Musteri tanimsiz",
      projectCode: design.customer.projectCode || "PRJ-000",
      address: design.customer.address || "Adres girilmedi",
      notes: design.customer.notes || "Teknik not girilmedi",
      frameColorLabel,
      profileLabel: profileSpec.label,
      glassLabel: glassSpec.label,
      hardwareLabel: hardwareSpec.label,
      hingeCount: hardwareSpec.hingeCount,
      profileMeters: report.profileLengthMeters.toFixed(2),
      glassAreaM2: report.glassAreaM2.toFixed(2),
      openingCount: snapshot.openingCount,
      panelCount: snapshot.panelCount
    };
  }, [design]);
  const technicalManufacturingSummary = useMemo(() => {
    const report = buildManufacturingReport(design);
    const health = buildDesignHealth(design);
    const snapshot = buildDesignSnapshot(design);
    const grouped = [
      { key: "outer-frame", label: "Kasa", items: report.cutList.filter((item) => item.group === "outer-frame") },
      { key: "mullion", label: "Dikey", items: report.cutList.filter((item) => item.group === "mullion") },
      { key: "transom", label: "Yatay", items: report.cutList.filter((item) => item.group === "transom") },
      { key: "sash", label: "Kanat", items: report.cutList.filter((item) => item.group === "sash") },
      { key: "glass", label: "Cam", items: report.cutList.filter((item) => item.group === "glass") },
      { key: "hardware", label: "Aksesuar", items: report.cutList.filter((item) => item.group === "hardware") }
    ]
      .map((group) => ({
        ...group,
        quantity: group.items.reduce((sum, item) => sum + item.quantity, 0),
        lengthMeters:
          group.items.reduce((sum, item) => sum + (item.lengthMm ?? 0) * item.quantity, 0) / 1000,
        areaM2: group.items.reduce((sum, item) => sum + (item.areaM2 ?? 0) * item.quantity, 0)
      }))
      .filter((group) => group.quantity > 0)
      .slice(0, 5);

    return {
      revisionTag: `R${String(Math.min(99, snapshot.panelCount + snapshot.transomCount)).padStart(2, "0")}`,
      issueStatus: health.errors > 0 ? "Kontrol Gerekli" : health.warnings > 0 ? "Revizyonlu" : "Uretime Hazir",
      checker: design.customer.customerName || "Kontrol Bekliyor",
      totalCuts: report.cutList.length,
      grouped
    };
  }, [design]);

  useEffect(() => {
    dragAppliedDeltaRef.current = 0;
  }, [dragState]);

  const getWorldPoint = (clientX: number, clientY: number, host: HTMLDivElement) => {
    const rect = host.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  };

  const finishMarqueeSelection = (selectionRect: { x: number; y: number; width: number; height: number }) => {
    const nextSelection = collectPanelsInRect(canvasLayout, selectionRect);
    onMultiSelectionChange(nextSelection);
    if (nextSelection[0]) {
      selectPanel(nextSelection[0].transomId, nextSelection[0].panelId);
    }
  };

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handleMove = (event: MouseEvent) => {
      if (dragState.type === "vertical") {
        const deltaPx = event.clientX - dragState.startClientX;
        const capacity = getMullionDragCapacity(design, dragState.transomId, dragState.panelId);
        if (!capacity) {
          setDragPreview(`${Math.round(dragState.startWidth)} mm`);
          setDragHint("Kayit dis sinira dayaniyor");
          return;
        }
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const clampedDeltaMm = clamp(deltaMm, capacity.minDeltaMm, capacity.maxDeltaMm);
        const incrementalDeltaMm = clampedDeltaMm - dragAppliedDeltaRef.current;
        if (incrementalDeltaMm !== 0) {
          adjustPanelBlockEdge(
            [{ transomId: dragState.transomId, panelId: dragState.panelId }],
            "right",
            -incrementalDeltaMm
          );
          dragAppliedDeltaRef.current = clampedDeltaMm;
        }
        setDragPreview(`${Math.round(dragState.startWidth + clampedDeltaMm)} mm`);
        setDragHint(
          deltaMm !== clampedDeltaMm
            ? `Limit: ${clampedDeltaMm > 0 ? "+" : ""}${clampedDeltaMm} mm / komsu payi`
            : `Komsu denge: ${capacity.leftPanelWidth + clampedDeltaMm} | ${capacity.rightPanelWidth - clampedDeltaMm} mm`
        );
        return;
      }

      if (dragState.type === "object-width") {
        const deltaPx = event.clientX - dragState.startClientX;
        const capacity = getMullionDragCapacity(design, dragState.transomId, dragState.panelId);
        if (!capacity) {
          setDragPreview(`${Math.round(dragState.startWidth)} mm`);
          setDragHint(`${dragState.sourceLabel} / komsu bulunamadi`);
          return;
        }
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const clampedDeltaMm = clamp(deltaMm, capacity.minDeltaMm, capacity.maxDeltaMm);
        const incrementalDeltaMm = clampedDeltaMm - dragAppliedDeltaRef.current;
        if (incrementalDeltaMm !== 0) {
          adjustPanelBlockEdge(
            [{ transomId: dragState.transomId, panelId: dragState.panelId }],
            "right",
            -incrementalDeltaMm
          );
          dragAppliedDeltaRef.current = clampedDeltaMm;
        }
        setDragPreview(`${Math.round(dragState.startWidth + clampedDeltaMm)} mm`);
        setDragHint(
          deltaMm !== clampedDeltaMm
            ? `${dragState.sourceLabel} / max ${clampedDeltaMm > 0 ? "+" : ""}${clampedDeltaMm} mm`
            : `${dragState.sourceLabel} / komsu panel dengeleniyor`
        );
        return;
      }

      if (dragState.type === "guide-vertical") {
        const deltaPx = event.clientX - dragState.startClientX;
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const rawValue = dragState.startPosition + deltaMm;
        const snapCandidate = getGuideMoveSnapCandidate(design, dragState.guideId, rawValue);
        const nextValue = snapCandidate?.value ?? rawValue;
        onMoveGuide(dragState.guideId, nextValue);
        setDragPreview(`${Math.round(nextValue)} mm`);
        setDragHint(snapCandidate?.label ?? "Guide referansi");
        return;
      }

      if (dragState.type === "frame-thickness") {
        const currentClient = dragState.axis === "x" ? event.clientX : event.clientY;
        const deltaPx = currentClient - dragState.startClient;
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const nextValue = clamp(
          Math.round(dragState.startThickness + deltaMm),
          40,
          Math.max(80, Math.round(Math.min(design.totalWidth, design.totalHeight) * 0.22))
        );
        setOuterFrameThickness(nextValue);
        setDragPreview(`${nextValue} mm`);
        setDragHint("Kasa kalinligi");
        return;
      }

      if (dragState.type === "mullion-thickness") {
        const currentClient = dragState.axis === "x" ? event.clientX : event.clientY;
        const deltaPx = currentClient - dragState.startClient;
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const nextValue = clamp(
          Math.round(dragState.startThickness + deltaMm),
          24,
          Math.max(54, Math.round(Math.min(design.totalWidth, design.totalHeight) * 0.14))
        );
        setMullionThickness(nextValue);
        setDragPreview(`${nextValue} mm`);
        setDragHint("Kayit kalinligi");
        return;
      }

      if (dragState.type === "guide-horizontal") {
        const deltaPx = event.clientY - dragState.startClientY;
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const rawValue = dragState.startPosition + deltaMm;
        const snapCandidate = getGuideMoveSnapCandidate(design, dragState.guideId, rawValue);
        const nextValue = snapCandidate?.value ?? rawValue;
        onMoveGuide(dragState.guideId, nextValue);
        setDragPreview(`${Math.round(nextValue)} mm`);
        setDragHint(snapCandidate?.label ?? "Guide referansi");
        return;
      }

      if (dragState.type === "object-height") {
        const deltaPx = event.clientY - dragState.startClientY;
        const capacity = getTransomDragCapacity(design, dragState.transomId);
        if (!capacity) {
          setDragPreview(`${Math.round(dragState.startHeight)} mm`);
          setDragHint(`${dragState.sourceLabel} / sinirda`);
          return;
        }
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const clampedDeltaMm = clamp(deltaMm, capacity.minDeltaMm, capacity.maxDeltaMm);
        const incrementalDeltaMm = clampedDeltaMm - dragAppliedDeltaRef.current;
        if (incrementalDeltaMm !== 0) {
          adjustSelectedTransomEdge("bottom", -incrementalDeltaMm);
          dragAppliedDeltaRef.current = clampedDeltaMm;
        }
        setDragPreview(`${Math.round(dragState.startHeight + clampedDeltaMm)} mm`);
        setDragHint(
          deltaMm !== clampedDeltaMm
            ? `${dragState.sourceLabel} / max ${clampedDeltaMm > 0 ? "+" : ""}${clampedDeltaMm} mm`
            : `${dragState.sourceLabel} / alt satir dengeleniyor`
        );
        return;
      }

      const deltaPx = event.clientY - dragState.startClientY;
      const capacity = getTransomDragCapacity(design, dragState.transomId);
      if (!capacity) {
        setDragPreview(`${Math.round(dragState.startHeight)} mm`);
        setDragHint("Satir dis sinira dayaniyor");
        return;
      }
      const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
      const clampedDeltaMm = clamp(deltaMm, capacity.minDeltaMm, capacity.maxDeltaMm);
      const incrementalDeltaMm = clampedDeltaMm - dragAppliedDeltaRef.current;
      if (incrementalDeltaMm !== 0) {
        adjustSelectedTransomEdge("bottom", -incrementalDeltaMm);
        dragAppliedDeltaRef.current = clampedDeltaMm;
      }
      setDragPreview(`${Math.round(dragState.startHeight + clampedDeltaMm)} mm`);
      setDragHint(
        deltaMm !== clampedDeltaMm
          ? `Limit: ${clampedDeltaMm > 0 ? "+" : ""}${clampedDeltaMm} mm / komsu payi`
          : `Komsu denge: ${capacity.topHeightMm + clampedDeltaMm} | ${capacity.bottomHeightMm - clampedDeltaMm} mm`
      );
    };

    const handleUp = () => {
      setDragState(null);
      setDragPreview(null);
      setDragHint(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [
    adjustPanelBlockEdge,
    adjustSelectedTransomEdge,
    design,
    dragState,
    onMoveGuide,
    setMullionThickness,
    setOuterFrameThickness,
    snapMm
  ]);

  useEffect(() => {
    setInlineDimensionEditor(null);
  }, [design.id]);

  useEffect(() => {
    if (!hudDimensionTarget) {
      setHudDimensionDraft("");
      return;
    }

    setHudDimensionDraft(String(hudDimensionTarget.value));
  }, [hudDimensionTarget?.key, hudDimensionTarget?.value]);

  function openInlineDimensionEditor(
    event: ReactMouseEvent<SVGTextElement>,
    target:
      | { kind: "panel"; transomId: string; panelId: string; value: number }
      | { kind: "row"; transomId: string; value: number }
  ) {
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setInlineDimensionEditor({
      ...target,
      value: String(target.value),
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  }

  function commitInlineDimensionEditor() {
    if (!inlineDimensionEditor) {
      return;
    }

    const numericValue = Math.round(Number(inlineDimensionEditor.value) || 0);
    if (inlineDimensionEditor.kind === "panel" && numericValue >= 100) {
      setPanelWidthById(inlineDimensionEditor.transomId, inlineDimensionEditor.panelId, numericValue);
    } else if (inlineDimensionEditor.kind === "row" && numericValue >= 150) {
      setTransomHeightById(inlineDimensionEditor.transomId, numericValue);
    }

    setInlineDimensionEditor(null);
  }

  function commitHudDimensionEditor() {
    if (!hudDimensionTarget) {
      return;
    }

    const numericValue = Math.round(Number(hudDimensionDraft) || 0);
    if (hudDimensionTarget.kind === "panel" && numericValue >= 100) {
      setPanelWidthById(hudDimensionTarget.transomId, hudDimensionTarget.panelId, numericValue);
    } else if (hudDimensionTarget.kind === "row" && numericValue >= 150) {
      setTransomHeightById(hudDimensionTarget.transomId, numericValue);
    }
  }

  useEffect(() => {
    const handleHudTyping = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingSurface =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTypingSurface || !hudDimensionTarget || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setHudDimensionDraft(event.key);
        requestAnimationFrame(() => {
          hudDimensionInputRef.current?.focus();
          const length = hudDimensionInputRef.current?.value.length ?? 0;
          hudDimensionInputRef.current?.setSelectionRange(length, length);
        });
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setHudDimensionDraft((current) => current.slice(0, -1));
        requestAnimationFrame(() => {
          hudDimensionInputRef.current?.focus();
        });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        commitHudDimensionEditor();
      }
    };

    window.addEventListener("keydown", handleHudTyping);
    return () => window.removeEventListener("keydown", handleHudTyping);
  }, [hudDimensionTarget]);

  const showCadActionOverlays = !isTechnical && visibleLayers.hud && toolMode === "select" && !interactivePlacement;

  return (
    <div
      ref={canvasRef}
      className={`canvas-wrap premium ${isTechnical ? "technical" : ""} ${isPresentation ? "presentation" : ""}`}
      onWheel={(event) => {
        if (!event.ctrlKey) {
          return;
        }
        event.preventDefault();
        onWheelZoom(event.deltaY < 0 ? 0.08 : -0.08);
      }}
      onMouseDown={(event) => {
        if (
          inlineDimensionEditor &&
          !(event.target instanceof HTMLElement && event.target.closest(".inline-dimension-editor"))
        ) {
          commitInlineDimensionEditor();
        }

        if (event.button === 1 || panEnabled) {
          onPanStart(event.clientX, event.clientY);
          return;
        }

        if (event.button === 0 && (toolMode === "guide-vertical" || toolMode === "guide-horizontal")) {
          const worldPoint = projectedWorldCursor ?? getWorldPoint(event.clientX, event.clientY, event.currentTarget);
          const mmValue =
            toolMode === "guide-vertical"
              ? clamp(Math.round((worldPoint.x - innerRect.x) / scale), 0, design.totalWidth)
              : clamp(Math.round((worldPoint.y - innerRect.y) / scale), 0, design.totalHeight);
          onAddGuide(toolMode === "guide-vertical" ? "vertical" : "horizontal", mmValue);
          onToolModeChange("select");
          setDragHint(null);
          return;
        }

        if (event.button === 0 && interactivePlacement) {
          const worldPoint = projectedWorldCursor ?? getWorldPoint(event.clientX, event.clientY, event.currentTarget);
          if (interactivePlacement.type === "copy" || interactivePlacement.type === "move") {
            event.preventDefault();
            event.stopPropagation();
            if (interactivePlacement.phase === "base") {
              onApplyPlacement({ kind: "base-point", point: worldPoint });
              return;
            }
          }
          if (interactiveCanvasTarget) {
            event.preventDefault();
            event.stopPropagation();
            onApplyPlacement(interactiveCanvasTarget);
          }
          return;
        }

        if (event.button === 0 && event.shiftKey && toolMode === "select") {
          const worldPoint = getWorldPoint(event.clientX, event.clientY, event.currentTarget);
          marqueeStart.current = worldPoint;
          setMarquee({ x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 });
        }
      }}
      onMouseMove={(event) => {
        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        if (marqueeStart.current) {
          const worldPoint = getWorldPoint(event.clientX, event.clientY, event.currentTarget);
          setMarquee(normalizeRect(marqueeStart.current.x, marqueeStart.current.y, worldPoint.x, worldPoint.y));
          return;
        }
        if ((event.buttons & 4) || panEnabled) {
          onPanMove(event.clientX, event.clientY);
        }
      }}
      onMouseUp={() => {
        if (marquee) {
          finishMarqueeSelection(marquee);
        }
        marqueeStart.current = null;
        setMarquee(null);
        onPanEnd();
      }}
      onMouseLeave={() => {
        setCursor(null);
        marqueeStart.current = null;
        setMarquee(null);
        onPanEnd();
      }}
    >
      {inlineDimensionEditor && (
        <div
          className="inline-dimension-editor"
          style={{ left: inlineDimensionEditor.x, top: inlineDimensionEditor.y }}
        >
          <input
            autoFocus
            type="number"
            min={inlineDimensionEditor.kind === "panel" ? 100 : 150}
            value={inlineDimensionEditor.value}
            onChange={(event) =>
              setInlineDimensionEditor((current) =>
                current ? { ...current, value: event.target.value } : current
              )
            }
            onBlur={commitInlineDimensionEditor}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitInlineDimensionEditor();
              }
              if (event.key === "Escape") {
                setInlineDimensionEditor(null);
              }
            }}
          />
          <span>mm</span>
        </div>
      )}
      {hudDimensionTarget && (
        <div
          className="hud-dimension-editor"
          style={{ left: hudDimensionTarget.x, top: hudDimensionTarget.y }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <span className="hud-dimension-label">{hudDimensionTarget.label}</span>
          <input
            ref={hudDimensionInputRef}
            type="number"
            min={hudDimensionTarget.kind === "panel" ? 100 : 150}
            value={hudDimensionDraft}
            onChange={(event) => setHudDimensionDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitHudDimensionEditor();
              }
              if (event.key === "Escape") {
                setHudDimensionDraft(String(hudDimensionTarget.value));
              }
            }}
          />
          <span className="hud-dimension-unit">mm</span>
          <button type="button" onClick={commitHudDimensionEditor}>
            Uygula
          </button>
        </div>
      )}
      <svg
        className="drawing-surface"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="PVC cizim editoru"
      >
        <defs>
          <linearGradient id="glassFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dff4ff" />
            <stop offset="100%" stopColor="#b9dbf6" />
          </linearGradient>
          <linearGradient id="technicalGlassFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#101722" />
            <stop offset="100%" stopColor="#152033" />
          </linearGradient>
          <filter id="panelShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#425066" floodOpacity="0.16" />
          </filter>
        </defs>

        {isTechnical && (
          <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#101722" />
        )}

        {visibleLayers.rulers && (
        <g>
          <rect x="0" y="0" width={svgWidth} height={rulerBandSize} className={`ruler-band ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`} />
          <rect x="0" y="0" width={rulerBandSize} height={svgHeight} className={`ruler-band ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`} />
          <rect x="0" y="0" width={rulerBandSize} height={rulerBandSize} className={`ruler-corner ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`} />
          {horizontalRulerTicks.map((tick) => (
            <g key={`ruler-x-${tick.value}`}>
              <line
                x1={tick.x}
                y1={rulerBandSize}
                x2={tick.x}
                y2={tick.value % (rulerStepMm * 2) === 0 ? "10" : "18"}
                className={`ruler-tick ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}
              />
              {tick.value % (rulerStepMm * 2) === 0 && (
                <text x={tick.x + 3} y="11" className={`ruler-text ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}>
                  {tick.value}
                </text>
              )}
            </g>
          ))}
          {verticalRulerTicks.map((tick) => (
            <g key={`ruler-y-${tick.value}`}>
              <line
                x1={rulerBandSize}
                y1={tick.y}
                x2={tick.value % (rulerStepMm * 2) === 0 ? "10" : "18"}
                y2={tick.y}
                className={`ruler-tick ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}
              />
              {tick.value % (rulerStepMm * 2) === 0 && (
                <text
                  x="12"
                  y={tick.y - 4}
                  transform={`rotate(-90 12 ${tick.y - 4})`}
                  className={`ruler-text ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}
                >
                  {tick.value}
                </text>
              )}
            </g>
          ))}
          {cursor && cursorMeasure && (
            <>
              <line x1={cursor.x} y1="0" x2={cursor.x} y2={rulerBandSize} className="ruler-cursor" />
              <line x1="0" y1={cursor.y} x2={rulerBandSize} y2={cursor.y} className="ruler-cursor" />
            </>
          )}
        </g>
        )}

        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        <rect
          x={outerX}
          y={outerY}
          width={outerW}
          height={outerH}
          fill={isTechnical ? "none" : isPresentation ? "#111b2a" : "#f8f9fb"}
          stroke={isTechnical ? "#8acb6d" : isPresentation ? "#d8e5f4" : "#8994a3"}
          strokeWidth="2.2"
          rx="8"
          opacity={visibleLayers.profiles ? 1 : 0}
          className="clickable-panel"
          onClick={(event) => {
            event.stopPropagation();
            onObjectSelect({ type: "outer-frame" });
          }}
        />
        <rect
          x={innerRect.x}
          y={innerRect.y}
          width={innerRect.width}
          height={innerRect.height}
          fill={isTechnical ? "none" : isPresentation ? "#0d1521" : "#ffffff"}
          stroke={isTechnical ? "#69b95c" : isPresentation ? "#364a66" : "#c6ccd6"}
          strokeWidth="1.6"
          opacity={visibleLayers.profiles ? 1 : 0}
        />
        {isSameCanvasObject(selectedObject, { type: "outer-frame" }) && (
          <>
            <rect
              x={outerX - 4}
              y={outerY - 4}
              width={outerW + 8}
              height={outerH + 8}
              rx="12"
              className="object-selection-outline frame"
            />
            <rect
              x={innerRect.x + 4}
              y={innerRect.y + 4}
              width={Math.max(24, innerRect.width - 8)}
              height={Math.max(24, innerRect.height - 8)}
              rx="8"
              className="object-selection-outline frame inner"
            />
          </>
        )}
        {isSameCanvasObject(selectedObject, { type: "outer-frame" }) && !isTechnical && (
            <ThicknessManipulatorHandles
              primary={{
                x: outerX + outerW / 2,
                y: innerRect.y,
                cursor: "ns-resize",
              onMouseDown: (event) => {
                event.preventDefault();
                event.stopPropagation();
                onCommandTargetChange({
                  type: "frame-thickness",
                  label: `Kasa Kalinligi - ${design.outerFrameThickness} mm`
                });
                setDragState({
                  type: "frame-thickness",
                  axis: "y",
                  startClient: event.clientY,
                  startThickness: design.outerFrameThickness,
                  scale
                });
              }
            }}
            secondary={{
              x: innerRect.x,
              y: outerY + outerH / 2,
              cursor: "ew-resize",
              onMouseDown: (event) => {
                event.preventDefault();
                event.stopPropagation();
                onCommandTargetChange({
                  type: "frame-thickness",
                  label: `Kasa Kalinligi - ${design.outerFrameThickness} mm`
                });
                setDragState({
                  type: "frame-thickness",
                  axis: "x",
                  startClient: event.clientX,
                  startThickness: design.outerFrameThickness,
                  scale
                });
              }
            }}
            label={`Kasa ${design.outerFrameThickness} mm`}
            tone="frame"
          />
        )}

        {isTechnical && visibleLayers.dimensions && (
          <>
            {renderPanelChainDimensions(canvasLayout, outerY)}
            {renderTransomChainDimensions(canvasLayout, outerX)}
            <text x={outerX + outerW / 2} y={outerY - 62} textAnchor="middle" className="technical-text-green small-text">
              DOGRAMA OLCUSU
            </text>
            <text x={outerX + outerW / 2} y={outerY - 82} textAnchor="middle" className="technical-text-red small-text">
              DUVAR OLCUSU
            </text>
          </>
        )}

        {visibleLayers.guides &&
          design.guides.map((guide) => {
            const isGuideSelected = isSameCanvasObject(selectedObject, {
              type: "guide",
              guideId: guide.id
            });
            const position =
              guide.orientation === "vertical"
                ? innerRect.x + guide.positionMm * scale
                : innerRect.y + guide.positionMm * scale;

            if (guide.orientation === "vertical") {
              return (
                <g key={guide.id}>
                  <line
                    x1={position}
                    y1={outerY - 44}
                    x2={position}
                    y2={outerY + outerH + 44}
                    className={`reference-guide-line ${guide.locked ? "locked" : ""} ${isGuideSelected ? "selected" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onObjectSelect({ type: "guide", guideId: guide.id });
                    }}
                  />
                  <GuideTag x={position} y={outerY - 56} text={guide.label} locked={guide.locked} selected={isGuideSelected} />
                  {!guide.locked && (
                    <circle
                      cx={position}
                      cy={outerY - 16}
                      r="10"
                      className="reference-guide-handle"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onObjectSelect({ type: "guide", guideId: guide.id });
                        setDragState({
                          type: "guide-vertical",
                          guideId: guide.id,
                          startClientX: event.clientX,
                          startPosition: guide.positionMm,
                          scale
                        });
                      }}
                    />
                  )}
                </g>
              );
            }

            return (
              <g key={guide.id}>
                <line
                  x1={outerX - 44}
                  y1={position}
                  x2={outerX + outerW + 44}
                  y2={position}
                  className={`reference-guide-line ${guide.locked ? "locked" : ""} ${isGuideSelected ? "selected" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onObjectSelect({ type: "guide", guideId: guide.id });
                  }}
                />
                <GuideTag x={outerX - 62} y={position} text={guide.label} locked={guide.locked} selected={isGuideSelected} vertical />
                {!guide.locked && (
                  <circle
                    cx={outerX - 16}
                    cy={position}
                    r="10"
                    className="reference-guide-handle"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onObjectSelect({ type: "guide", guideId: guide.id });
                      setDragState({
                        type: "guide-horizontal",
                        guideId: guide.id,
                        startClientY: event.clientY,
                        startPosition: guide.positionMm,
                        scale
                      });
                    }}
                  />
                )}
              </g>
            );
          })}

        {canvasLayout.rows.map((row) => {
          const transom = design.transoms[row.transomIndex];
          if (!transom) {
            return null;
          }

          return row.panels.map((panelSlot, panelIndex) => {
            const panel = transom.panels[panelSlot.panelIndex];
            if (!panel) {
              return null;
            }

            const widthPx = panelSlot.bounds.width;
            const heightPx = panelSlot.bounds.height;
            const panelX = panelSlot.bounds.x;
            const panelY = panelSlot.bounds.y;
            const isSelected =
              selected?.transomId === transom.id && selected.panelId === panel.id;
            const panelKey = `${transom.id}:${panel.id}`;
            const isMultiSelected = multiSelectionKeys.has(panelKey);
            const panelLayout = buildProfileLayout(design, panelX, panelY, widthPx, heightPx, scale, panel.openingType);
            const palette = getFramePalette(design.materials.frameColor, isPresentation);
            const isPanelObjectSelected = isSameCanvasObject(selectedObject, {
              type: "panel",
              transomId: transom.id,
              panelId: panel.id
            });
            const isSashObjectSelected = isSameCanvasObject(selectedObject, {
              type: "sash",
              transomId: transom.id,
              panelId: panel.id
            });
            const isGlassObjectSelected = isSameCanvasObject(selectedObject, {
              type: "glass",
              transomId: transom.id,
              panelId: panel.id
            });
            const selectedManipulatorBounds = isGlassObjectSelected
              ? panelLayout.glassRect
              : isSashObjectSelected && panelLayout.sashRect
                ? panelLayout.sashRect
                : isPanelObjectSelected
                  ? panelSlot.bounds
                  : null;
            const selectedManipulatorTone = isGlassObjectSelected
              ? "glass"
              : isSashObjectSelected
                ? "sash"
                : "panel";
            const selectedManipulatorLabel = isGlassObjectSelected
              ? "Cam"
              : isSashObjectSelected
                ? "Kanat"
                : "Panel";
            const verticalBar = row.mullions.find((item) => item.panelId === panel.id) ?? null;

            return (
              <g key={panel.id}>
                {isTechnical ? (
                  <>
                    <rect
                      x={panelX}
                      y={panelY}
                      width={widthPx}
                      height={heightPx}
                      rx="4"
                      fill="url(#technicalGlassFill)"
                      stroke={
                        isSelected
                          ? "#c18dfc"
                          : isMultiSelected
                            ? "#f6c84a"
                            : "#69b95c"
                      }
                      strokeWidth={isSelected ? "4.5" : isMultiSelected ? "3" : "1.4"}
                      opacity={visibleLayers.profiles || visibleLayers.glass || visibleLayers.notes ? 1 : 0.08}
                    />
                    {visibleLayers.profiles && (
                      <>
                        {panelLayout.frameDetailRects.map((detailRect, index) => (
                          <rect
                            key={`technical-frame-detail-${panel.id}-${index}`}
                            x={detailRect.x}
                            y={detailRect.y}
                            width={detailRect.width}
                            height={detailRect.height}
                            rx="3"
                            className="technical-profile-line"
                          />
                        ))}
                        {panelLayout.sashRect && (
                          <rect
                            x={panelLayout.sashRect.x}
                            y={panelLayout.sashRect.y}
                            width={panelLayout.sashRect.width}
                            height={panelLayout.sashRect.height}
                            rx="3"
                            className="technical-profile-line highlight"
                          />
                        )}
                        {panelLayout.sashDetailRects.map((detailRect, index) => (
                          <rect
                            key={`technical-sash-detail-${panel.id}-${index}`}
                            x={detailRect.x}
                            y={detailRect.y}
                            width={detailRect.width}
                            height={detailRect.height}
                            rx="3"
                            className="technical-profile-line soft"
                          />
                        ))}
                        {panelLayout.reinforcementLines.map((line, index) => (
                          <line
                            key={`technical-reinforcement-${panel.id}-${index}`}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            className="technical-profile-line soft"
                          />
                        ))}
                        {panelLayout.thermalChamberLines.map((line, index) => (
                          <line
                            key={`technical-thermal-${panel.id}-${index}`}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            className="technical-profile-line chamber"
                          />
                        ))}
                      </>
                    )}
                    {visibleLayers.glass && (
                      <>
                        <rect
                          x={panelLayout.glassRect.x}
                          y={panelLayout.glassRect.y}
                          width={panelLayout.glassRect.width}
                          height={panelLayout.glassRect.height}
                          rx="2"
                          className="technical-glass-contour"
                        />
                        <rect
                          x={panelLayout.beadRect.x}
                          y={panelLayout.beadRect.y}
                          width={panelLayout.beadRect.width}
                          height={panelLayout.beadRect.height}
                          rx="2"
                          className="technical-profile-line soft"
                        />
                      </>
                    )}
                    <rect
                      x={panelX}
                      y={panelY}
                      width={widthPx}
                      height={heightPx}
                      rx="4"
                      fill="transparent"
                      className="clickable-panel"
                      onClick={(event) => {
                        if (event.shiftKey && toolMode === "select") {
                          const exists = multiSelectionKeys.has(panelKey);
                          const nextSelection = exists
                            ? multiSelection.filter((item) => item.transomId !== transom.id || item.panelId !== panel.id)
                            : [...multiSelection, { transomId: transom.id, panelId: panel.id }];
                          onMultiSelectionChange(nextSelection);
                        } else {
                          onMultiSelectionChange([{ transomId: transom.id, panelId: panel.id }]);
                        }
                        onObjectSelect(
                          {
                            type: "panel",
                            transomId: transom.id,
                            panelId: panel.id
                          },
                          event.shiftKey && toolMode === "select" ? { preserveMultiSelection: true } : undefined
                        );
                      }}
                    />
                  </>
                ) : (
                  <>
                    <rect
                      x={panelLayout.frameRect.x}
                      y={panelLayout.frameRect.y}
                      width={panelLayout.frameRect.width}
                      height={panelLayout.frameRect.height}
                      rx="4"
                      fill={palette.frameFill}
                      stroke={palette.frameStroke}
                      strokeWidth="1.6"
                      opacity={visibleLayers.profiles ? 1 : 0}
                      filter="url(#panelShadow)"
                    />
                    {panelLayout.frameDetailRects.map((detailRect, index) => (
                      <rect
                        key={`frame-detail-${panel.id}-${index}`}
                        x={detailRect.x}
                        y={detailRect.y}
                        width={detailRect.width}
                        height={detailRect.height}
                        rx="3"
                        className={`profile-detail-rect ${isPresentation ? "presentation" : "studio"} frame`}
                        opacity={visibleLayers.profiles ? 1 : 0}
                      />
                    ))}
                    {panelLayout.sashRect && (
                      <>
                        <rect
                          x={panelLayout.sashRect.x}
                          y={panelLayout.sashRect.y}
                          width={panelLayout.sashRect.width}
                          height={panelLayout.sashRect.height}
                          rx="3"
                          fill={palette.sashFill}
                          stroke={palette.sashStroke}
                          strokeWidth="1.2"
                          opacity={visibleLayers.profiles ? 1 : 0}
                        />
                        {panelLayout.sashDetailRects.map((detailRect, index) => (
                          <rect
                            key={`sash-detail-${panel.id}-${index}`}
                            x={detailRect.x}
                            y={detailRect.y}
                            width={detailRect.width}
                            height={detailRect.height}
                            rx="3"
                            className={`profile-detail-rect ${isPresentation ? "presentation" : "studio"} sash`}
                            opacity={visibleLayers.profiles ? 1 : 0}
                          />
                        ))}
                      </>
                    )}
                    {panelLayout.reinforcementLines.map((line, index) => (
                      <line
                        key={`reinforcement-${panel.id}-${index}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        className={`profile-reinforcement ${isPresentation ? "presentation" : "studio"}`}
                        opacity={visibleLayers.profiles ? 1 : 0}
                      />
                    ))}
                    {panelLayout.thermalChamberLines.map((line, index) => (
                      <line
                        key={`thermal-${panel.id}-${index}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        className={`profile-chamber ${isPresentation ? "presentation" : "studio"}`}
                        opacity={visibleLayers.profiles ? 1 : 0}
                      />
                    ))}
                    <rect
                      x={panelLayout.glassRect.x}
                      y={panelLayout.glassRect.y}
                      width={panelLayout.glassRect.width}
                      height={panelLayout.glassRect.height}
                      rx="2"
                      fill="url(#glassFill)"
                      stroke={palette.glassStroke}
                      strokeWidth="1"
                      opacity={visibleLayers.glass ? 1 : 0}
                    />
                    <rect
                      x={panelLayout.beadRect.x}
                      y={panelLayout.beadRect.y}
                      width={panelLayout.beadRect.width}
                      height={panelLayout.beadRect.height}
                      rx="2"
                      className={`profile-bead ${isPresentation ? "presentation" : "studio"}`}
                      opacity={visibleLayers.profiles ? 1 : 0}
                    />
                    {panelLayout.gasketLines.map((line, index) => (
                      <line
                        key={`gasket-${panel.id}-${index}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        className={`profile-gasket ${isPresentation ? "presentation" : "studio"}`}
                        opacity={visibleLayers.profiles ? 1 : 0}
                      />
                    ))}
                    {panelLayout.drainageSlots.map((slot, index) => (
                      <rect
                        key={`drainage-${panel.id}-${index}`}
                        x={slot.x}
                        y={slot.y}
                        width={slot.width}
                        height={slot.height}
                        rx="2"
                        className={`profile-drainage ${isPresentation ? "presentation" : "studio"}`}
                        opacity={visibleLayers.profiles ? 1 : 0}
                      />
                    ))}
                    <line
                      x1={panelLayout.glassRect.x + 4}
                      y1={panelLayout.glassRect.y + 6}
                      x2={panelLayout.glassRect.x + panelLayout.glassRect.width - 4}
                      y2={panelLayout.glassRect.y + 6}
                      className="glass-sheen"
                      opacity={visibleLayers.glass ? 1 : 0}
                    />
                    {visibleLayers.hardware && panelLayout.sashRect && (
                      <HardwareOverlay
                        panel={panel}
                        sashRect={panelLayout.sashRect}
                        quality={design.materials.hardwareQuality}
                        technical={isTechnical || isPresentation}
                      />
                    )}
                    {isPanelObjectSelected && (
                      <rect
                        x={panelLayout.frameRect.x - 4}
                        y={panelLayout.frameRect.y - 4}
                        width={panelLayout.frameRect.width + 8}
                        height={panelLayout.frameRect.height + 8}
                        rx="8"
                        className="object-selection-outline panel"
                      />
                    )}
                    {panelLayout.sashRect && isSashObjectSelected && (
                      <rect
                        x={panelLayout.sashRect.x - 3}
                        y={panelLayout.sashRect.y - 3}
                        width={panelLayout.sashRect.width + 6}
                        height={panelLayout.sashRect.height + 6}
                        rx="6"
                        className="object-selection-outline sash"
                      />
                    )}
                    {isGlassObjectSelected && (
                      <rect
                        x={panelLayout.glassRect.x - 3}
                        y={panelLayout.glassRect.y - 3}
                        width={panelLayout.glassRect.width + 6}
                        height={panelLayout.glassRect.height + 6}
                        rx="6"
                        className="object-selection-outline glass"
                      />
                    )}
                    <rect
                      x={panelX}
                      y={panelY}
                      width={widthPx}
                      height={heightPx}
                      rx="4"
                      fill="transparent"
                      stroke={
                        isSelected
                          ? "#f08a18"
                          : isMultiSelected
                            ? "#2d6cdf"
                            : isPresentation
                              ? "#d2b377"
                              : "#748090"
                      }
                      strokeWidth={isSelected ? "4.5" : isMultiSelected ? "3" : "1.4"}
                      opacity={visibleLayers.profiles ? 1 : 0.08}
                    />
                    <rect
                      x={panelX}
                      y={panelY}
                      width={widthPx}
                      height={heightPx}
                      rx="4"
                      fill="transparent"
                      className="clickable-panel"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (event.shiftKey && toolMode === "select") {
                          const exists = multiSelectionKeys.has(panelKey);
                          const nextSelection = exists
                            ? multiSelection.filter((item) => item.transomId !== transom.id || item.panelId !== panel.id)
                            : [...multiSelection, { transomId: transom.id, panelId: panel.id }];
                          onMultiSelectionChange(nextSelection);
                        } else {
                          onMultiSelectionChange([{ transomId: transom.id, panelId: panel.id }]);
                        }
                        onObjectSelect(
                          {
                            type: "panel",
                            transomId: transom.id,
                            panelId: panel.id
                          },
                          event.shiftKey && toolMode === "select" ? { preserveMultiSelection: true } : undefined
                        );
                      }}
                    />
                    {panelLayout.sashRect && (
                      <rect
                        x={panelLayout.sashRect.x}
                        y={panelLayout.sashRect.y}
                        width={panelLayout.sashRect.width}
                        height={panelLayout.sashRect.height}
                        rx="4"
                        fill="transparent"
                        className="clickable-panel"
                        onClick={(event) => {
                          event.stopPropagation();
                          onObjectSelect({
                            type: "sash",
                            transomId: transom.id,
                            panelId: panel.id
                          });
                        }}
                      />
                    )}
                    <rect
                      x={panelLayout.glassRect.x}
                      y={panelLayout.glassRect.y}
                      width={panelLayout.glassRect.width}
                      height={panelLayout.glassRect.height}
                      rx="3"
                      fill="transparent"
                      className="clickable-panel"
                      onClick={(event) => {
                        event.stopPropagation();
                        onObjectSelect({
                          type: "glass",
                          transomId: transom.id,
                          panelId: panel.id
                        });
                      }}
                    />
                    {selectedManipulatorBounds && !isTechnical && (
                      <ObjectManipulatorHandles
                        bounds={selectedManipulatorBounds}
                        tone={selectedManipulatorTone}
                        title={`${selectedManipulatorLabel} ${Math.round(panel.width)} x ${Math.round(transom.height)}`}
                        onWidthMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onCommandTargetChange({
                            type: "panel-width",
                            transomId: transom.id,
                            panelId: panel.id,
                            label: `${selectedManipulatorLabel} Genisligi - ${panel.width} mm`
                          });
                          setDragState({
                            type: "object-width",
                            transomId: transom.id,
                            panelId: panel.id,
                            startClientX: event.clientX,
                            startWidth: panel.width,
                            scale,
                            sourceLabel: selectedManipulatorLabel
                          });
                        }}
                        onHeightMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onCommandTargetChange({
                            type: "transom-height",
                            transomId: transom.id,
                            label: `${selectedManipulatorLabel} Yuksekligi - ${transom.height} mm`
                          });
                          setDragState({
                            type: "object-height",
                            transomId: transom.id,
                            startClientY: event.clientY,
                            startHeight: transom.height,
                            scale,
                            sourceLabel: selectedManipulatorLabel
                          });
                        }}
                      />
                    )}
                    {!isTechnical &&
                      visibleLayers.hud &&
                      visibleLayers.hardware &&
                      panelLayout.sashRect &&
                      isSashObjectSelected && (
                        <>
                          <SelectionOverlayPalette
                            x={panelLayout.sashRect.x + panelLayout.sashRect.width / 2}
                            y={Math.max(outerY + 12, panelLayout.sashRect.y - 84)}
                            title="Kanat Aksiyonlari"
                            tone="sash"
                            activeValue={panel.openingType}
                            actions={sashOverlayActions}
                            onSelect={(value) => {
                              setSelectedOpeningType(value as OpeningType);
                            }}
                          />
                          <SelectionOverlayPalette
                            x={panelLayout.sashRect.x + panelLayout.sashRect.width / 2}
                            y={Math.max(outerY + 54, panelLayout.sashRect.y - 26)}
                            title="Donanim"
                            tone="hardware"
                            activeValue={design.materials.hardwareQuality}
                            actions={hardwareOptions.map((item) => ({
                              value: item.value,
                              label: item.label
                            }))}
                            compact
                            onSelect={(value) => {
                              setHardwareQuality(value as HardwareQuality);
                            }}
                          />
                        </>
                      )}
                    {!isTechnical &&
                      visibleLayers.hud &&
                      visibleLayers.glass &&
                      isGlassObjectSelected && (
                        <SelectionOverlayPalette
                          x={panelLayout.glassRect.x + panelLayout.glassRect.width / 2}
                          y={Math.max(outerY + 12, panelLayout.glassRect.y - 84)}
                          title="Cam Secimi"
                          tone="glass"
                          activeValue={design.materials.glassType}
                          actions={glassOverlayActions}
                          compact
                          onSelect={(value) => {
                            setGlassType(value as GlassType);
                          }}
                        />
                      )}
                  </>
                )}
                {toolMode !== "select" && (
                  <rect
                    x={panelX}
                    y={panelY}
                    width={widthPx}
                    height={heightPx}
                    rx="4"
                    fill="transparent"
                    className="clickable-panel panel-command-zone"
                    onClick={() => {
                      onMultiSelectionChange([{ transomId: transom.id, panelId: panel.id }]);
                      onObjectSelect({
                        type: "panel",
                        transomId: transom.id,
                        panelId: panel.id
                      });
                      if (toolMode === "split-vertical") {
                        onSplitVertical();
                        onToolModeChange("select");
                      } else if (toolMode === "split-horizontal") {
                        onSplitHorizontal();
                        onToolModeChange("select");
                      } else if (toolMode === "add-left") {
                        onInsertPanel("left");
                        onToolModeChange("select");
                      } else if (toolMode === "add-right") {
                        onInsertPanel("right");
                        onToolModeChange("select");
                      } else if (toolMode === "add-top") {
                        onInsertTransom("top");
                        onToolModeChange("select");
                      } else if (toolMode === "add-bottom") {
                        onInsertTransom("bottom");
                        onToolModeChange("select");
                      } else if (toolMode === "delete-panel") {
                        onDeletePanel();
                        onToolModeChange("select");
                      }
                    }}
                  />
                )}
                {visibleLayers.notes && (
                  <>
                    <text
                      x={panelX + widthPx / 2}
                      y={panelY + heightPx / 2 - 12}
                      textAnchor="middle"
                      className={isTechnical ? "svg-label technical-text-red" : `svg-label ${isPresentation ? "presentation-text" : ""}`}
                    >
                      {isTechnical
                        ? `${Math.round(panel.width / 10)}x${Math.round(transom.height / 10)}`
                        : panel.label}
                    </text>
                    <text
                      x={panelX + widthPx / 2}
                      y={panelY + heightPx / 2 + 18}
                      textAnchor="middle"
                      className={isTechnical ? "svg-sub-label technical-text-green" : `svg-sub-label ${isPresentation ? "presentation-sub-text" : ""}`}
                    >
                      {isTechnical ? `QTA: ${panel.width}` : `${panel.width} x ${transom.height}`}
                    </text>
                    {widthPx > 90 && heightPx > 84 && (
                      <text
                        x={panelLayout.glassRect.x + 10}
                        y={panelLayout.glassRect.y + panelLayout.glassRect.height - 10}
                        textAnchor="start"
                        className={isTechnical ? "technical-text-green small-text" : "glass-thickness-label"}
                      >
                        {glassCatalog[design.materials.glassType].thicknessLabel}
                      </text>
                    )}
                  </>
                )}
                {visibleLayers.hardware && (
                  <OpeningMarker
                    panel={panel}
                    x={panelX}
                    y={panelY}
                    width={widthPx}
                    height={heightPx}
                    technical={isTechnical || isPresentation}
                  />
                )}
                {visibleLayers.dimensions && (
                  <DimensionText
                    x={panelSlot.cellBounds.x + panelSlot.cellBounds.width / 2}
                    y={outerY + outerH + 52}
                    text={String(panel.width)}
                    technical={isTechnical}
                    editable
                    onClick={(event) =>
                      openInlineDimensionEditor(event, {
                        kind: "panel",
                        transomId: transom.id,
                        panelId: panel.id,
                        value: panel.width
                      })
                    }
                  />
                )}

                {isTechnical && visibleLayers.dimensions && (
                  <>
                    <TechnicalInnerDimension
                      x1={panelX + 12}
                      y1={panelY + heightPx - 18}
                      x2={panelX + widthPx - 12}
                      y2={panelY + heightPx - 18}
                      text={`QTA: ${panel.width}`}
                      horizontal
                    />
                    <TechnicalInnerDimension
                      x1={panelX + widthPx - 16}
                      y1={panelY + 12}
                      x2={panelX + widthPx - 16}
                      y2={panelY + heightPx - 12}
                      text={`QTA: ${transom.height}`}
                    />
                  </>
                )}

                {verticalBar && (
                  <g>
                    <rect
                      x={verticalBar.rect.x}
                      y={verticalBar.rect.y}
                      width={verticalBar.rect.width}
                      height={verticalBar.rect.height}
                      fill={isTechnical ? "none" : isPresentation ? "#1f3047" : "#dbdfe6"}
                      stroke={
                        isSameCanvasObject(selectedObject, {
                          type: "mullion",
                          transomId: transom.id,
                          panelId: panel.id
                        }) ||
                        (commandTarget?.type === "panel-width" &&
                        commandTarget.transomId === transom.id &&
                        commandTarget.panelId === panel.id)
                          ? "#ff8d2b"
                          : isTechnical
                            ? "#69b95c"
                            : isPresentation
                              ? "#d2b377"
                              : "#aab1bc"
                      }
                      strokeWidth={
                        isSameCanvasObject(selectedObject, {
                          type: "mullion",
                          transomId: transom.id,
                          panelId: panel.id
                        }) ||
                        (commandTarget?.type === "panel-width" &&
                        commandTarget.transomId === transom.id &&
                        commandTarget.panelId === panel.id)
                          ? "3"
                          : "1"
                      }
                      opacity={visibleLayers.profiles ? 1 : 0}
                      className="divider-select-zone"
                      onClick={(event) => {
                        event.stopPropagation();
                        onObjectSelect({
                          type: "mullion",
                          transomId: transom.id,
                          panelId: panel.id
                        });
                      }}
                    />
                    <rect
                      x={verticalBar.centerX - 10}
                      y={verticalBar.rect.y + verticalBar.rect.height / 2 - 36}
                      width="20"
                      height="72"
                      rx="10"
                      className="drag-handle"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onObjectSelect({
                          type: "mullion",
                          transomId: transom.id,
                          panelId: panel.id
                        });
                        onCommandTargetChange({
                          type: "panel-width",
                          transomId: transom.id,
                          panelId: panel.id,
                          label: `Dikey Kayit - ${panel.width} mm`
                        });
                        setDragState({
                          type: "vertical",
                          transomId: transom.id,
                          panelId: panel.id,
                          startClientX: event.clientX,
                          startWidth: panel.width,
                          scale
                        });
                      }}
                    />
                    {!isTechnical &&
                      isSameCanvasObject(selectedObject, {
                        type: "mullion",
                        transomId: transom.id,
                        panelId: panel.id
                      }) && (
                        <ThicknessManipulatorHandles
                          primary={{
                            x: verticalBar.rect.x + verticalBar.rect.width + 18,
                            y: verticalBar.rect.y + verticalBar.rect.height / 2,
                            cursor: "ew-resize",
                            onMouseDown: (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onCommandTargetChange({
                                type: "mullion-thickness",
                                label: `Kayit Kalinligi - ${design.mullionThickness} mm`
                              });
                              setDragState({
                                type: "mullion-thickness",
                                axis: "x",
                                startClient: event.clientX,
                                startThickness: design.mullionThickness,
                                scale
                              });
                            }
                          }}
                          label={`Dikey Kayit ${design.mullionThickness} mm`}
                          tone="mullion"
                        />
                      )}
                    {!isTechnical &&
                      visibleLayers.hud &&
                      isSameCanvasObject(selectedObject, {
                        type: "mullion",
                        transomId: transom.id,
                        panelId: panel.id
                      }) && (
                        <>
                          <SelectionOverlayPalette
                            x={verticalBar.centerX}
                            y={Math.max(outerY + 12, panelY - 84)}
                            title="Kayit Araclari"
                            tone="mullion"
                            activeValue=""
                            actions={[
                              { value: "nudge-left", label: "-50" },
                              { value: "nudge-right", label: "+50" },
                              { value: "ratio-50", label: "50/50" },
                              { value: "ratio-33", label: "33/67" },
                              { value: "ratio-67", label: "67/33" }
                            ]}
                            compact
                            onSelect={onApplySelectedMullionPreset}
                          />
                          <SelectionOverlayPalette
                            x={verticalBar.centerX}
                            y={Math.max(outerY + 70, panelY - 24)}
                            title="Kenar"
                            tone="mullion"
                            activeValue=""
                            actions={[
                              { value: "trim left 40", label: "Trim L" },
                              { value: "extend left 40", label: "Ext L" },
                              { value: "trim right 40", label: "Trim R" },
                              { value: "extend right 40", label: "Ext R" }
                            ]}
                            compact
                            onSelect={onRunCadCommand}
                          />
                        </>
                      )}
                    {visibleLayers.dimensions &&
                      isSameCanvasObject(selectedObject, {
                        type: "mullion",
                        transomId: transom.id,
                        panelId: panel.id
                      }) && (
                        <DimensionText
                          x={verticalBar.centerX}
                          y={verticalBar.rect.y - 12}
                          text={String(panel.width)}
                          technical={isTechnical}
                          editable
                          onClick={(event) =>
                            openInlineDimensionEditor(event, {
                              kind: "panel",
                              transomId: transom.id,
                              panelId: panel.id,
                              value: panel.width
                            })
                          }
                        />
                      )}
                  </g>
                )}
              </g>
            );
          });
        })}

        {canvasLayout.horizontalBars.map((bar) => {
          const aboveTransom = design.transoms[bar.transomIndex];
          const isActiveDivider =
            isSameCanvasObject(selectedObject, {
              type: "transom-bar",
              transomId: aboveTransom?.id ?? ""
            }) ||
            (commandTarget?.type === "transom-height" && commandTarget.transomId === aboveTransom?.id);

          return (
            <g key={bar.aboveTransomId}>
              <rect
                x={bar.rect.x}
                y={bar.rect.y}
                width={bar.rect.width}
                height={bar.rect.height}
                fill={isTechnical ? "none" : isPresentation ? "#1f3047" : "#dbdfe6"}
                stroke={isActiveDivider ? "#ff8d2b" : isTechnical ? "#69b95c" : isPresentation ? "#d2b377" : "#aab1bc"}
                strokeWidth={isActiveDivider ? "3" : "1"}
                opacity={visibleLayers.profiles ? 1 : 0}
                className="divider-select-zone"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!aboveTransom) {
                    return;
                  }
                  onObjectSelect({ type: "transom-bar", transomId: aboveTransom.id });
                }}
              />
              <rect
                x={bar.rect.x + bar.rect.width / 2 - 40}
                y={bar.centerY - 10}
                width="80"
                height="20"
                rx="10"
                className="drag-handle"
                onMouseDown={(event) => {
                  if (!aboveTransom) {
                    return;
                  }

                  event.preventDefault();
                  onObjectSelect({ type: "transom-bar", transomId: aboveTransom.id });
                  onCommandTargetChange({
                    type: "transom-height",
                    transomId: aboveTransom.id,
                    label: `Yatay Kayit - ${aboveTransom.height} mm`
                  });
                  setDragState({
                    type: "horizontal",
                    transomId: aboveTransom.id,
                    startClientY: event.clientY,
                    startHeight: aboveTransom.height,
                    scale
                  });
                }}
              />
              {!isTechnical &&
                isSameCanvasObject(selectedObject, {
                  type: "transom-bar",
                  transomId: aboveTransom?.id ?? ""
                }) && (
                  <ThicknessManipulatorHandles
                    primary={{
                      x: bar.rect.x + bar.rect.width / 2,
                      y: bar.rect.y + bar.rect.height + 18,
                      cursor: "ns-resize",
                      onMouseDown: (event) => {
                        if (!aboveTransom) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        onCommandTargetChange({
                          type: "mullion-thickness",
                          label: `Kayit Kalinligi - ${design.mullionThickness} mm`
                        });
                        setDragState({
                          type: "mullion-thickness",
                          axis: "y",
                          startClient: event.clientY,
                          startThickness: design.mullionThickness,
                          scale
                        });
                      }
                    }}
                    label={`Yatay Kayit ${design.mullionThickness} mm`}
                    tone="transom"
                  />
                )}
              {!isTechnical &&
                visibleLayers.hud &&
                isSameCanvasObject(selectedObject, {
                  type: "transom-bar",
                  transomId: aboveTransom?.id ?? ""
                }) && (
                  <>
                    <SelectionOverlayPalette
                      x={bar.rect.x + bar.rect.width / 2}
                      y={Math.max(outerY + 12, bar.rect.y - 92)}
                      title="Satir Araclari"
                      tone="transom"
                      activeValue=""
                      actions={[
                        { value: "nudge-up", label: "-50" },
                        { value: "nudge-down", label: "+50" },
                        { value: "ratio-50", label: "50/50" },
                        { value: "ratio-33", label: "33/67" },
                        { value: "ratio-67", label: "67/33" }
                      ]}
                      compact
                      onSelect={onApplySelectedTransomPreset}
                    />
                    <SelectionOverlayPalette
                      x={bar.rect.x + bar.rect.width / 2}
                      y={Math.max(outerY + 70, bar.rect.y - 32)}
                      title="Trim / Extend"
                      tone="transom"
                      activeValue=""
                      actions={[
                        { value: "trim top 40", label: "Trim T" },
                        { value: "extend top 40", label: "Ext T" },
                        { value: "trim bottom 40", label: "Trim B" },
                        { value: "extend bottom 40", label: "Ext B" }
                      ]}
                      compact
                      onSelect={onRunCadCommand}
                    />
                  </>
                )}
              {visibleLayers.dimensions &&
                isSameCanvasObject(selectedObject, {
                  type: "transom-bar",
                  transomId: aboveTransom?.id ?? ""
                }) &&
                aboveTransom && (
                  <DimensionText
                    x={bar.rect.x + bar.rect.width / 2}
                    y={bar.rect.y - 12}
                    text={String(aboveTransom.height)}
                    technical={isTechnical}
                    editable
                    onClick={(event) =>
                      openInlineDimensionEditor(event, {
                        kind: "row",
                        transomId: aboveTransom.id,
                        value: aboveTransom.height
                      })
                    }
                  />
                )}
            </g>
          );
        })}

        {visibleLayers.dimensions && (
          <>
            {canvasLayout.rows.map((row) => {
              const transom = design.transoms[row.transomIndex];
              if (!transom) {
                return null;
              }
              return (
                <DimensionText
                  key={`row-dimension-${transom.id}`}
                  x={outerX + outerW + 34}
                  y={row.cellBounds.y + row.cellBounds.height * 0.5}
                  text={String(transom.height)}
                  technical={isTechnical}
                  anchor="start"
                  editable
                  onClick={(event) =>
                    openInlineDimensionEditor(event, {
                      kind: "row",
                      transomId: transom.id,
                      value: transom.height
                    })
                  }
                />
              );
            })}
            <DimensionLine
              x1={outerX}
              y1={outerY + outerH + 88}
              x2={outerX + outerW}
              y2={outerY + outerH + 88}
              text={`${design.totalWidth} mm`}
              technical={isTechnical}
            />
            <DimensionLine
              x1={outerX + outerW + 82}
              y1={outerY}
              x2={outerX + outerW + 82}
              y2={outerY + outerH}
              text={`${design.totalHeight} mm`}
              vertical
              technical={isTechnical}
            />
            {isTechnical && (
              <>
                <DimensionLine
                  x1={outerX}
                  y1={outerY - 42}
                  x2={outerX + outerW}
                  y2={outerY - 42}
                  text={`DUVAR: ${design.totalWidth}`}
                  technical
                />
                <DimensionLine
                  x1={outerX - 38}
                  y1={outerY}
                  x2={outerX - 38}
                  y2={outerY + outerH}
                  text={`DUVAR: ${design.totalHeight}`}
                  vertical
                  technical
                />
              </>
            )}
          </>
        )}

        {commandPreview && (
          <CommandPreviewOverlay
            preview={commandPreview}
            selectedBounds={selectedBounds}
            selectedRowBounds={selectedRowBounds}
            blockSelectionPreview={blockSelectionPreview}
            panelShiftRange={panelShiftRange}
            transomShiftRange={transomShiftRange}
            activePanelBlockRefs={activePanelBlockRefs}
            selectedTransomId={selected?.transomId ?? null}
            activePanelCount={activePanelPreviewCount}
            activeRowCount={activeRowPreviewCount}
            panelCenterDelta={panelCenterDelta}
            transomCenterDelta={transomCenterDelta}
            commandTarget={commandTarget}
            selectedObject={selectedObject}
            rowPanels={selectedPanelData?.transom.panels ?? null}
            frameRect={{ x: outerX, y: outerY, width: outerW, height: outerH }}
            frameInset={frameInset}
            mullionSize={mullionSize}
            scale={scale}
            design={design}
          />
        )}
        {interactivePlacement && (
          <PlacementPreviewOverlay
            placement={interactivePlacement}
            target={interactiveCanvasTarget}
            cursorPoint={projectedWorldCursor ?? worldCursor}
            canvasLayout={canvasLayout}
            selectedBounds={selectedBounds}
            selectedRowBounds={selectedRowBounds}
            blockSelectionPreview={blockSelectionPreview}
            placementTelemetry={placementTelemetry}
            design={design}
            sourcePanelWidthMm={selectedPanelData?.panel.width ?? null}
            sourceRowHeightMm={selectedPanelData?.transom.height ?? null}
            mullionSize={mullionSize}
            scale={scale}
          />
        )}
        {placementTelemetry && (
          <PlacementTelemetryOverlay
            telemetry={placementTelemetry}
            point={placementTelemetry.point}
          />
        )}
        {osnapCandidate && (
          <OsnapOverlay
            candidate={osnapCandidate}
            orthoMode={orthoMode}
            polarMode={polarMode}
            polarAngle={polarAngle}
          />
        )}

        {showPanelCanvasActions && selectedBounds && (
          <>
            <SelectionHandles bounds={selectedBounds} />
            <CanvasActionButton
              x={selectedBounds.x - 22}
              y={selectedBounds.y + selectedBounds.height / 2}
              label="+"
              onClick={() => onInsertPanel("left")}
            />
            <CanvasActionButton
              x={selectedBounds.x + selectedBounds.width + 22}
              y={selectedBounds.y + selectedBounds.height / 2}
              label="+"
              onClick={() => onInsertPanel("right")}
            />
            <CanvasActionButton
              x={selectedBounds.x + selectedBounds.width / 2}
              y={selectedBounds.y - 22}
              label="+"
              onClick={() => onInsertTransom("top")}
            />
            <CanvasActionButton
              x={selectedBounds.x + selectedBounds.width / 2}
              y={selectedBounds.y + selectedBounds.height + 22}
              label="+"
              onClick={() => onInsertTransom("bottom")}
            />
          </>
        )}
        {multiSelection.map((item) => {
          const bounds = getSelectedBounds(canvasLayout, item);
          if (!bounds) {
            return null;
          }

          return <MultiSelectionOutline key={`${item.transomId}:${item.panelId}`} bounds={bounds} />;
        })}
        {blockSelectionPreview && (
          <BlockSelectionEnvelope
            bounds={blockSelectionPreview.bounds}
            label={`${blockSelectionPreview.panels.length} panel blok`}
          />
        )}
        {marquee && (
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.width}
            height={marquee.height}
            className="marquee-box"
          />
        )}
        {cursor && !panEnabled && (
          <g className="crosshair-group">
            <line x1={cursor.x} y1="0" x2={cursor.x} y2={svgHeight} className="crosshair-line" />
            <line x1="0" y1={cursor.y} x2={svgWidth} y2={cursor.y} className="crosshair-line" />
            <circle cx={cursor.x} cy={cursor.y} r="2.6" className="crosshair-dot" />
          </g>
        )}
        {dragPreview && cursor && (
          <g>
            <rect
              x={cursor.x + 16}
              y={cursor.y - 26}
              width={Math.max(88, dragPreview.length * 7.4 + 26)}
              height="24"
              rx="8"
              className="drag-preview-box"
            />
            <text
              x={cursor.x + 16 + Math.max(88, dragPreview.length * 7.4 + 26) / 2}
              y={cursor.y - 10}
              textAnchor="middle"
              className="drag-preview-text"
            >
              {dragPreview}
            </text>
          </g>
        )}
        {dragHint && cursor && (
          <g>
            <rect
              x={cursor.x + 16}
              y={cursor.y + 4}
              width={Math.max(138, dragHint.length * 6.6 + 28)}
              height="22"
              rx="8"
              className="drag-hint-box"
            />
            <text
              x={cursor.x + 16 + Math.max(138, dragHint.length * 6.6 + 28) / 2}
              y={cursor.y + 19}
              textAnchor="middle"
              className="drag-hint-text"
            >
              {dragHint}
            </text>
          </g>
        )}
        {activeVerticalGuide && (
          <g>
            <line
              x1={activeVerticalGuide.x}
              y1={activeVerticalGuide.y1 - 26}
              x2={activeVerticalGuide.x}
              y2={activeVerticalGuide.y2 + 26}
              className="active-guide-line"
            />
            <GuideLabel
              x={activeVerticalGuide.x - 24}
              y={(activeVerticalGuide.y1 + activeVerticalGuide.y2) / 2 - 16}
              text={activeVerticalGuide.leftLabel}
              align="end"
            />
            <GuideLabel
              x={activeVerticalGuide.x + 24}
              y={(activeVerticalGuide.y1 + activeVerticalGuide.y2) / 2 + 16}
              text={activeVerticalGuide.rightLabel}
              align="start"
            />
          </g>
        )}
        {activeHorizontalGuide && (
          <g>
            <line
              x1={activeHorizontalGuide.x1 - 26}
              y1={activeHorizontalGuide.y}
              x2={activeHorizontalGuide.x2 + 26}
              y2={activeHorizontalGuide.y}
              className="active-guide-line"
            />
            <GuideLabel
              x={(activeHorizontalGuide.x1 + activeHorizontalGuide.x2) / 2}
              y={activeHorizontalGuide.y - 18}
              text={activeHorizontalGuide.topLabel}
            />
            <GuideLabel
              x={(activeHorizontalGuide.x1 + activeHorizontalGuide.x2) / 2}
              y={activeHorizontalGuide.y + 38}
              text={activeHorizontalGuide.bottomLabel}
            />
          </g>
        )}
        {isTechnical && visibleLayers.notes && (
          <TechnicalPageFrame
            x={24}
            y={56}
            width={svgWidth - 48}
            height={svgHeight - 116}
          />
        )}
        {isTechnical && visibleLayers.notes && (
          <TechnicalReferenceOverlay references={technicalReferences} />
        )}
        {visibleLayers.hud && selectedHud && (
          <SelectedPanelHud
            x={selectedHud.x}
            y={selectedHud.y}
            title={selectedHud.title}
            subtitle={selectedHud.subtitle}
            detail={selectedHud.detail}
            tone={viewMode}
          />
        )}
        {showCadActionOverlays &&
          selectedBounds &&
          activePanelPreviewCount <= 1 &&
          (!selectedObject || selectedObject.type === "panel" || selectedObject.type === "sash" || selectedObject.type === "glass") && (
            <>
              <SelectionOverlayPalette
                x={selectedBounds.x + selectedBounds.width / 2}
                y={Math.max(outerY + 12, selectedBounds.y - 86)}
                title="Panel Komutlari"
                tone="sash"
                activeValue=""
                actions={[
                  { value: "sv", label: "SV" },
                  { value: "sh", label: "SH" },
                  { value: "copy", label: "Copy" },
                  { value: "move", label: "Move" },
                  { value: "array 3", label: "Array3" }
                ]}
                compact
                onSelect={onRunCadCommand}
              />
              <SelectionOverlayPalette
                x={selectedBounds.x + selectedBounds.width / 2}
                y={Math.max(outerY + 54, selectedBounds.y - 28)}
                title="Panel Uret"
                tone="glass"
                activeValue=""
                actions={[
                  { value: "add left", label: "Add L" },
                  { value: "add right", label: "Add R" },
                  { value: "offset panel 300 2", label: "Off 2" },
                  { value: "grid 3 2 25 50", label: "Grid" },
                  { value: "lib triple", label: "Triple" }
                ]}
                compact
                onSelect={onRunCadCommand}
              />
              {design.guides.some((guide) => guide.orientation === "vertical") && (
                <SelectionOverlayPalette
                  x={selectedBounds.x + selectedBounds.width / 2}
                  y={Math.max(outerY + 96, selectedBounds.y + 30)}
                  title="Guide Align"
                  tone="mullion"
                  activeValue=""
                  actions={[
                    { value: "align guide left", label: "Guide L" },
                    { value: "align guide center", label: "Guide C" },
                    { value: "align guide right", label: "Guide R" }
                  ]}
                  compact
                  onSelect={onRunCadCommand}
                />
              )}
            </>
          )}
        {showCadActionOverlays && blockSelectionPreview && activePanelPreviewCount > 1 && (
          <>
            <SelectionOverlayPalette
              x={blockSelectionPreview.bounds.x + blockSelectionPreview.bounds.width / 2}
              y={Math.max(outerY + 12, blockSelectionPreview.bounds.y - 92)}
              title="Blok Hizalama"
              tone="mullion"
              activeValue=""
              actions={[
                { value: "align left", label: "Align L" },
                { value: "align right", label: "Align R" },
                { value: "center", label: "Center" },
                { value: "distribute", label: "Dist" },
                { value: "match width", label: "Match" }
              ]}
              compact
              onSelect={onRunCadCommand}
            />
            <SelectionOverlayPalette
              x={blockSelectionPreview.bounds.x + blockSelectionPreview.bounds.width / 2}
              y={Math.max(outerY + 54, blockSelectionPreview.bounds.y - 34)}
              title="Blok Operasyon"
              tone="transom"
              activeValue=""
              actions={[
                { value: "trim left 80", label: "Trim L" },
                { value: "trim right 80", label: "Trim R" },
                { value: "extend left 80", label: "Ext L" },
                { value: "extend right 80", label: "Ext R" },
                { value: "copy", label: "Copy" },
                { value: "move", label: "Move" }
              ]}
              compact
              onSelect={onRunCadCommand}
            />
            {design.guides.some((guide) => guide.orientation === "vertical") && (
              <SelectionOverlayPalette
                x={blockSelectionPreview.bounds.x + blockSelectionPreview.bounds.width / 2}
                y={Math.max(outerY + 96, blockSelectionPreview.bounds.y + 34)}
                title="Block Guide"
                tone="glass"
                activeValue=""
                actions={[
                  { value: "align guide left", label: "Guide L" },
                  { value: "align guide center", label: "Guide C" },
                  { value: "align guide right", label: "Guide R" }
                ]}
                compact
                onSelect={onRunCadCommand}
              />
            )}
          </>
        )}
        {showCadActionOverlays && selectedObject?.type === "transom-bar" && selectedRowBounds && (
          <>
            <SelectionOverlayPalette
              x={selectedRowBounds.x + selectedRowBounds.width / 2}
              y={Math.max(outerY + 12, selectedRowBounds.y - 128)}
              title="Satir Komutlari"
              tone="transom"
              activeValue=""
              actions={[
                { value: "align top", label: "Align T" },
                { value: "align bottom", label: "Align B" },
                { value: "center row", label: "Center" },
                { value: "distribute rows", label: "Rows" },
                { value: "match height", label: "Match H" }
              ]}
              compact
              onSelect={onRunCadCommand}
            />
            <SelectionOverlayPalette
              x={selectedRowBounds.x + selectedRowBounds.width / 2}
              y={Math.max(outerY + 54, selectedRowBounds.y - 70)}
              title="Satir Operasyon"
              tone="mullion"
              activeValue=""
              actions={[
                { value: "copy row 3 50", label: "Copy3" },
                { value: "move", label: "Move" },
                { value: "array row 3 50", label: "Array" },
                { value: "mirror h", label: "Mirror" },
                { value: "offset row 400 2", label: "Offset" }
              ]}
                compact
                onSelect={onRunCadCommand}
              />
              {design.guides.some((guide) => guide.orientation === "horizontal") && (
                <SelectionOverlayPalette
                  x={selectedRowBounds.x + selectedRowBounds.width / 2}
                  y={Math.max(outerY + 96, selectedRowBounds.y - 12)}
                  title="Row Guide"
                  tone="glass"
                  activeValue=""
                  actions={[
                    { value: "align guide top", label: "Guide T" },
                    { value: "align guide middle", label: "Guide M" },
                    { value: "align guide bottom", label: "Guide B" }
                  ]}
                  compact
                  onSelect={onRunCadCommand}
                />
              )}
            </>
          )}
        {isTechnical && visibleLayers.notes && (
          <TechnicalSectionMarkers
            frameRect={{ x: outerX, y: outerY, width: outerW, height: outerH }}
          />
        )}
        {isTechnical && visibleLayers.notes && (
          <TechnicalTitleBlock
            x={svgWidth - 276}
            y={svgHeight - 152}
            design={design}
            revisionTag={technicalManufacturingSummary.revisionTag}
            issueStatus={technicalManufacturingSummary.issueStatus}
            checker={technicalManufacturingSummary.checker}
          />
        )}
        {isTechnical && visibleLayers.notes && (
          <TechnicalReferenceSchedule
            x={svgWidth - 276}
            y={74}
            references={technicalReferences}
          />
        )}
        {isTechnical && visibleLayers.notes && (
          <TechnicalProjectLegend
            x={svgWidth - 276}
            y={Math.min(svgHeight - 404, 74 + technicalScheduleHeight + 16)}
            data={technicalBoardData}
            summaryRows={technicalManufacturingSummary.grouped}
          />
        )}
        {isTechnical && visibleLayers.notes && selectedBounds && selectedPanelData && selectedTechnicalPanel && (
          <TechnicalDetailCallouts
            bounds={selectedBounds}
            panelLabel={selectedPanelData.panel.label}
            openingLabel={formatOpeningLabel(selectedPanelData.panel.openingType)}
            engineering={selectedTechnicalPanel}
            profileLabel={profileSeriesCatalog[design.materials.profileSeries].label}
            glassLabel={glassCatalog[design.materials.glassType].label}
          />
        )}
        {isTechnical && visibleLayers.notes && selectedTechnicalPanel && (
          <TechnicalMiniSection
            x={svgWidth - 276}
            y={Math.min(svgHeight - 184, 74 + technicalScheduleHeight + 268)}
            design={design}
            engineering={selectedTechnicalPanel}
          />
        )}
        {isTechnical && visibleLayers.notes && technicalDetailRows.length > 0 && (
          <TechnicalDetailSchedule
            x={svgWidth - 276}
            y={Math.min(svgHeight - 322, 74 + technicalScheduleHeight + 118)}
            rows={technicalDetailRows}
          />
        )}
        {isTechnical && visibleLayers.notes && selectedPanelData && selectedTechnicalPanel && technicalDetailRows.length > 0 && (
          <TechnicalDetailSheet
            x={52}
            y={outerY + outerH + 24}
            width={Math.min(svgWidth - 360, 680)}
            height={156}
            panelLabel={selectedPanelData.panel.label}
            openingLabel={formatOpeningLabel(selectedPanelData.panel.openingType)}
            engineering={selectedTechnicalPanel}
            detailRows={technicalDetailRows}
            summary={technicalManufacturingSummary}
          />
        )}
        </g>
      </svg>
      <div className={`canvas-status-bar ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}>
        <span><strong>Imlec</strong> {cursorMeasure ? `${cursorMeasure.xMm}, ${cursorMeasure.yMm} mm` : "--"}</span>
        <span><strong>Secim</strong> {selectedObject ? getCanvasObjectLabel(selectedObject) : selectedPanelData ? `${selectedPanelData.panel.label} / ${selectedPanelData.panel.width} x ${selectedPanelData.transom.height}` : "Yok"}</span>
        <span><strong>Snap</strong> {snapMm} mm</span>
        <span><strong>OSNAP</strong> {osnapEnabled ? `Acik / ${[
          osnapModes.endpoint ? "END" : null,
          osnapModes.midpoint ? "MID" : null,
          osnapModes.center ? "CEN" : null,
          osnapModes.intersection ? "INT" : null
        ].filter(Boolean).join(" ")}` : "Kapali"}</span>
        <span><strong>ORTHO</strong> {orthoMode ? "Acik" : "Kapali"}</span>
        <span><strong>POLAR</strong> {polarMode ? `${polarAngle}°` : "Kapali"}</span>
        <span><strong>Zoom</strong> %{Math.round(zoom * 100)}</span>
        <span><strong>Komut</strong> {toolMode}</span>
        <span><strong>Placement</strong> {placementTelemetry ? `DX ${placementTelemetry.dxMm} / DY ${placementTelemetry.dyMm} / ${placementTelemetry.distanceMm} mm / ${placementTelemetry.trackingMode.toUpperCase()}` : "Pasif"}</span>
        <span><strong>Gorunum</strong> {isTechnical ? "Teknik" : isPresentation ? "Sunum" : "Studyo"}</span>
      </div>
    </div>
  );
}

function GuideLabel({
  x,
  y,
  text,
  align = "middle"
}: {
  x: number;
  y: number;
  text: string;
  align?: "start" | "middle" | "end";
}) {
  const width = Math.max(82, text.length * 7 + 24);
  const offsetX = align === "end" ? -width : align === "middle" ? -width / 2 : 0;

  return (
    <g transform={`translate(${x + offsetX} ${y})`}>
      <rect width={width} height="24" rx="10" className="guide-label-box" />
      <text x={width / 2} y="16" textAnchor="middle" className="guide-label-text">
        {text}
      </text>
    </g>
  );
}

function GuideTag({
  x,
  y,
  text,
  locked,
  selected,
  vertical = false
}: {
  x: number;
  y: number;
  text: string;
  locked: boolean;
  selected: boolean;
  vertical?: boolean;
}) {
  const width = Math.max(86, text.length * 7 + 30);

  if (vertical) {
    return (
      <g transform={`translate(${x - 14} ${y + width / 2}) rotate(-90)`}>
        <rect
          x={-width / 2}
          y={-13}
          width={width}
          height="26"
          rx="11"
          className={`guide-tag-box ${locked ? "locked" : ""} ${selected ? "selected" : ""}`}
        />
        <text x="0" y="5" textAnchor="middle" className="guide-tag-text">
          {text}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x - width / 2} ${y - 14})`}>
      <rect
        width={width}
        height="28"
        rx="12"
        className={`guide-tag-box ${locked ? "locked" : ""} ${selected ? "selected" : ""}`}
      />
      <text x={width / 2} y="18" textAnchor="middle" className="guide-tag-text">
        {text}
      </text>
    </g>
  );
}

function SelectedPanelHud({
  x,
  y,
  title,
  subtitle,
  detail,
  tone
}: {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  detail: string;
  tone: "studio" | "technical" | "presentation";
}) {
  const width = 228;
  const height = 62;

  return (
    <g transform={`translate(${x - width / 2} ${y - height})`}>
      <rect
        width={width}
        height={height}
        rx="18"
        className={`panel-hud-shell ${tone}`}
      />
      <text x="18" y="22" className={`panel-hud-title ${tone}`}>
        {title}
      </text>
      <text x="18" y="40" className={`panel-hud-subtitle ${tone}`}>
        {subtitle}
      </text>
      <text x="18" y="55" className={`panel-hud-detail ${tone}`}>
        {detail}
      </text>
    </g>
  );
}

function PlacementTelemetryOverlay({
  telemetry,
  point
}: {
  telemetry: PlacementTelemetry;
  point: { x: number; y: number };
}) {
  const width = 184;
  const height = 56;
  const originX = point.x + 18;
  const originY = point.y - 64;

  return (
    <g transform={`translate(${originX} ${originY})`}>
      <rect width={width} height={height} rx="14" className="placement-telemetry-shell" />
      <text x="12" y="18" className="placement-telemetry-title">
        DX {telemetry.dxMm} / DY {telemetry.dyMm}
      </text>
      <text x="12" y="34" className="placement-telemetry-row">
        Dist {telemetry.distanceMm} mm / {telemetry.angleDeg} deg
      </text>
      <text x="12" y="48" className="placement-telemetry-row muted">
        {telemetry.axisLock
          ? `${telemetry.axisLock.toUpperCase()} kilit`
          : telemetry.trackingMode === "vector"
            ? `VECTOR ${telemetry.lockedVectorMm?.dxMm ?? 0},${telemetry.lockedVectorMm?.dyMm ?? 0}`
          : telemetry.trackingMode === "ortho"
            ? "ORTHO"
            : telemetry.trackingMode === "polar"
              ? "POLAR"
              : "Serbest"}
        {telemetry.lockedDistanceMm ? ` / ${telemetry.lockedDistanceMm} mm lock` : ""}
        {telemetry.osnapLabel ? ` / ${telemetry.osnapLabel}` : ""}
      </text>
    </g>
  );
}

function OsnapOverlay({
  candidate,
  orthoMode,
  polarMode,
  polarAngle
}: {
  candidate: OsnapCandidate;
  orthoMode: boolean;
  polarMode: boolean;
  polarAngle: number;
}) {
  const x = candidate.point.x;
  const y = candidate.point.y;
  const modeLabel = orthoMode ? "ORTHO" : polarMode ? `POLAR ${polarAngle}` : "TRACK";

  return (
    <g className="osnap-overlay">
      <circle cx={x} cy={y} r="10" className="osnap-ring" />
      <path d={`M ${x - 12} ${y} L ${x + 12} ${y} M ${x} ${y - 12} L ${x} ${y + 12}`} className="osnap-cross" />
      <rect x={x + 14} y={y - 28} width={116} height="24" rx="12" className="osnap-label-shell" />
      <text x={x + 24} y={y - 12} className="osnap-label-text">
        {candidate.label} / {candidate.detail} / {modeLabel}
      </text>
    </g>
  );
}

function PlacementReferenceGuides({
  basePoint,
  telemetry
}: {
  basePoint: { x: number; y: number };
  telemetry: PlacementTelemetry;
}) {
  const cornerPoint = {
    x: telemetry.axisLock === "y" ? basePoint.x : telemetry.point.x,
    y: telemetry.axisLock === "x" ? basePoint.y : telemetry.point.y
  };

  return (
    <g>
      <line
        x1={basePoint.x}
        y1={basePoint.y}
        x2={telemetry.point.x}
        y2={telemetry.point.y}
        className={`command-preview-reference-line ${telemetry.trackingMode}`}
      />
      {telemetry.axisLock !== "y" && telemetry.dxMm !== 0 && (
        <>
          <line
            x1={basePoint.x}
            y1={basePoint.y}
            x2={cornerPoint.x}
            y2={basePoint.y}
            className="command-preview-reference-line"
          />
          <PreviewBadge
            x={(basePoint.x + cornerPoint.x) / 2}
            y={basePoint.y - 20}
            text={`X ${telemetry.dxMm > 0 ? "+" : ""}${telemetry.dxMm}`}
          />
        </>
      )}
      {telemetry.axisLock !== "x" && telemetry.dyMm !== 0 && (
        <>
          <line
            x1={cornerPoint.x}
            y1={basePoint.y}
            x2={telemetry.point.x}
            y2={telemetry.point.y}
            className="command-preview-reference-line"
          />
          <PreviewBadge
            x={telemetry.point.x + 28}
            y={(basePoint.y + telemetry.point.y) / 2}
            text={`Y ${telemetry.dyMm > 0 ? "+" : ""}${telemetry.dyMm}`}
          />
        </>
      )}
    </g>
  );
}

function TechnicalTitleBlock({
  x,
  y,
  design,
  revisionTag,
  issueStatus,
  checker
}: {
  x: number;
  y: number;
  design: PvcDesign;
  revisionTag: string;
  issueStatus: string;
  checker: string;
}) {
  const today = new Date().toLocaleDateString("tr-TR");
  const profileLabel = profileSeriesCatalog[design.materials.profileSeries].label;
  const materialLabel = materialSystemCatalog[design.materials.materialSystem].label;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="248" height="160" rx="12" className="technical-title-block" />
      <text x="16" y="22" className="technical-title-head">
        PVC DESIGNER / TEKNIK PAFTA
      </text>
      <rect x="176" y="14" width="56" height="18" rx="9" className="technical-title-chip" />
      <text x="204" y="27" textAnchor="middle" className="technical-title-chip-text">
        SAYFA 01
      </text>
      <text x="16" y="42" className="technical-title-meta">
        Proje: {design.name}
      </text>
      <text x="16" y="58" className="technical-title-meta">
        Musteri: {design.customer.customerName || "Tanimsiz"}
      </text>
      <text x="16" y="74" className="technical-title-meta">
        Seri: {profileLabel}
      </text>
      <text x="16" y="90" className="technical-title-meta">
        Sistem: {materialLabel}
      </text>
      <text x="16" y="106" className="technical-title-meta">
        Olcu: {design.totalWidth} x {design.totalHeight} mm
      </text>
      <text x="16" y="122" className="technical-title-meta">
        Tarih: {today}
      </text>
      <line x1="14" y1="130" x2="234" y2="130" className="technical-info-divider" />
      <text x="16" y="146" className="technical-title-meta">
        Rev: {revisionTag}
      </text>
      <text x="96" y="146" className="technical-title-meta">
        Durum: {truncateText(issueStatus, 14)}
      </text>
      <text x="16" y="160" className="technical-title-meta">
        Kontrol: {truncateText(checker, 20)}
      </text>
    </g>
  );
}

function TechnicalSectionMarkers({
  frameRect
}: {
  frameRect: { x: number; y: number; width: number; height: number };
}) {
  const markers = [
    {
      label: "A-A",
      x: frameRect.x + frameRect.width / 2,
      y: frameRect.y - 20,
      line: {
        x1: frameRect.x + frameRect.width / 2,
        y1: frameRect.y - 6,
        x2: frameRect.x + frameRect.width / 2,
        y2: frameRect.y + 24
      }
    },
    {
      label: "A-A",
      x: frameRect.x + frameRect.width / 2,
      y: frameRect.y + frameRect.height + 20,
      line: {
        x1: frameRect.x + frameRect.width / 2,
        y1: frameRect.y + frameRect.height - 24,
        x2: frameRect.x + frameRect.width / 2,
        y2: frameRect.y + frameRect.height + 6
      }
    },
    {
      label: "B-B",
      x: frameRect.x - 22,
      y: frameRect.y + frameRect.height / 2,
      line: {
        x1: frameRect.x - 6,
        y1: frameRect.y + frameRect.height / 2,
        x2: frameRect.x + 24,
        y2: frameRect.y + frameRect.height / 2
      }
    },
    {
      label: "B-B",
      x: frameRect.x + frameRect.width + 22,
      y: frameRect.y + frameRect.height / 2,
      line: {
        x1: frameRect.x + frameRect.width - 24,
        y1: frameRect.y + frameRect.height / 2,
        x2: frameRect.x + frameRect.width + 6,
        y2: frameRect.y + frameRect.height / 2
      }
    }
  ];

  return (
    <g>
      {markers.map((marker) => (
        <g key={`${marker.label}-${marker.x}-${marker.y}`}>
          <line
            x1={marker.line.x1}
            y1={marker.line.y1}
            x2={marker.line.x2}
            y2={marker.line.y2}
            className="technical-section-line"
          />
          <circle cx={marker.x} cy={marker.y} r="11" className="technical-section-circle" />
          <text x={marker.x} y={marker.y + 4} textAnchor="middle" className="technical-section-text">
            {marker.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function TechnicalReferenceOverlay({
  references
}: {
  references: Array<{
    refId: string;
    label: string;
    opening: string;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    badgeX: number;
    badgeY: number;
  }>;
}) {
  return (
    <g>
      {references.map((reference) => (
        <g key={reference.refId}>
          <line
            x1={reference.centerX}
            y1={reference.centerY}
            x2={reference.badgeX}
            y2={reference.badgeY}
            className="technical-reference-line"
          />
          <circle cx={reference.badgeX} cy={reference.badgeY} r="12" className="technical-reference-badge" />
          <text
            x={reference.badgeX}
            y={reference.badgeY + 4}
            textAnchor="middle"
            className="technical-reference-text"
          >
            {reference.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function TechnicalReferenceSchedule({
  x,
  y,
  references
}: {
  x: number;
  y: number;
  references: Array<{
    refId: string;
    label: string;
    opening: string;
    width: number;
    height: number;
  }>;
}) {
  const visibleRows = references.slice(0, 10);
  const hiddenCount = Math.max(0, references.length - visibleRows.length);
  const width = 260;
  const rowHeight = 22;
  const height = getTechnicalScheduleHeight(references.length);

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="16" className="technical-schedule-shell" />
      <text x="16" y="20" className="technical-schedule-title">
        Panel Referans Listesi
      </text>
      <text x="16" y="38" className="technical-schedule-head">
        Ref / Tip / Olcu
      </text>
      {visibleRows.map((reference, index) => (
        <g key={reference.refId} transform={`translate(0 ${46 + index * rowHeight})`}>
          <line x1="12" y1="0" x2={width - 12} y2="0" className="technical-schedule-divider" />
          <text x="16" y="15" className="technical-schedule-row">
            {reference.label}
          </text>
          <text x="62" y="15" className="technical-schedule-row muted">
            {reference.opening}
          </text>
          <text x={width - 16} y="15" textAnchor="end" className="technical-schedule-row">
            {reference.width}x{reference.height}
          </text>
        </g>
      ))}
      {hiddenCount > 0 && (
        <text x="16" y={height - 8} className="technical-schedule-row muted">
          +{hiddenCount} ek panel
        </text>
      )}
    </g>
  );
}

function SelectionHandles({
  bounds
}: {
  bounds: { x: number; y: number; width: number; height: number };
}) {
  const points = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width / 2, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height / 2 },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
  ];

  return (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        className="selection-outline"
      />
      {points.map((point, index) => (
        <rect
          key={index}
          x={point.x - 5}
          y={point.y - 5}
          width="10"
          height="10"
          rx="2"
          className="selection-handle"
        />
      ))}
    </g>
  );
}

function MultiSelectionOutline({
  bounds
}: {
  bounds: { x: number; y: number; width: number; height: number };
}) {
  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      rx="6"
      className="multi-selection-outline"
    />
  );
}

function BlockSelectionEnvelope({
  bounds,
  label
}: {
  bounds: { x: number; y: number; width: number; height: number };
  label: string;
}) {
  return (
    <g>
      <rect
        x={bounds.x - 8}
        y={bounds.y - 8}
        width={bounds.width + 16}
        height={bounds.height + 16}
        rx="10"
        className="multi-selection-envelope"
      />
      <PreviewBadge
        x={bounds.x + bounds.width / 2}
        y={bounds.y - 22}
        text={label}
      />
    </g>
  );
}

function PreviewBlockGhost({
  x,
  y,
  width,
  height,
  panels,
  tone,
  gap = 0
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  panels: Array<{
    panelId: string;
    label: string;
    widthMm: number;
    openingType: OpeningType;
  }>;
  tone: "copy" | "move";
  gap?: number;
}) {
  const totalWidth = panels.reduce((sum, panel) => sum + panel.widthMm, 0) || 1;
  const safeGap = Math.max(0, gap);
  const availableWidth = Math.max(24, width - safeGap * Math.max(0, panels.length - 1));
  let cursor = x;

  return (
    <g>
      {panels.map((panel, index) => {
        const rawWidth = (panel.widthMm / totalWidth) * availableWidth;
        const segmentWidth =
          index === panels.length - 1 ? x + width - cursor : Math.max(18, rawWidth);
        const segmentX = cursor;
        cursor += segmentWidth;

        return (
          <g key={`${panel.panelId}-${index}`}>
            <rect
              x={segmentX}
              y={y}
              width={segmentWidth}
              height={height}
              className={`command-preview-tile ${tone}`}
            />
            <text
              x={segmentX + segmentWidth / 2}
              y={y + Math.min(18, height / 2)}
              textAnchor="middle"
              className="command-preview-text"
            >
              {panel.label}
            </text>
            {index < panels.length - 1 && safeGap > 0 && (
              <rect
                x={segmentX + segmentWidth}
                y={y}
                width={safeGap}
                height={height}
                className={`command-preview-tile ${tone}`}
                opacity="0.48"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function buildPreviewAxisSlices(
  start: number,
  span: number,
  count: number,
  gap: number
) {
  const safeCount = Math.max(1, count);
  const safeGap = Math.max(0, gap);
  const usableSpan = Math.max(24, span - safeGap * Math.max(0, safeCount - 1));
  const slices: Array<{ start: number; span: number }> = [];
  const bars: Array<{ start: number; span: number }> = [];
  let cursor = start;

  for (let index = 0; index < safeCount; index += 1) {
    const nextSpan =
      index === safeCount - 1
        ? start + span - cursor
        : Math.max(18, usableSpan / safeCount);
    slices.push({ start: cursor, span: nextSpan });
    cursor += nextSpan;
    if (index < safeCount - 1 && safeGap > 0) {
      bars.push({ start: cursor, span: safeGap });
      cursor += safeGap;
    }
  }

  return { slices, bars };
}

function renderHorizontalPreviewTiles(
  bounds: { x: number; y: number; width: number; height: number },
  count: number,
  gap: number,
  tone: string,
  labelPrefix?: string
) {
  const layout = buildPreviewAxisSlices(bounds.x, bounds.width, count, gap);
  return (
    <>
      {layout.slices.map((slice, index) => (
        <g key={`${tone}-panel-${index}`}>
          <rect x={slice.start} y={bounds.y} width={slice.span} height={bounds.height} className={`command-preview-tile ${tone}`} />
          {labelPrefix && (
            <text
              x={slice.start + slice.span / 2}
              y={bounds.y + Math.min(18, bounds.height / 2)}
              textAnchor="middle"
              className="command-preview-text"
            >
              {`${labelPrefix}${index + 1}`}
            </text>
          )}
        </g>
      ))}
      {layout.bars.map((bar, index) => (
        <rect
          key={`${tone}-bar-${index}`}
          x={bar.start}
          y={bounds.y}
          width={bar.span}
          height={bounds.height}
          className={`command-preview-tile ${tone}`}
          opacity="0.48"
        />
      ))}
    </>
  );
}

function renderVerticalPreviewTiles(
  bounds: { x: number; y: number; width: number; height: number },
  count: number,
  gap: number,
  tone: string,
  labelPrefix?: string
) {
  const layout = buildPreviewAxisSlices(bounds.y, bounds.height, count, gap);
  return (
    <>
      {layout.slices.map((slice, index) => (
        <g key={`${tone}-row-${index}`}>
          <rect x={bounds.x} y={slice.start} width={bounds.width} height={slice.span} className={`command-preview-tile ${tone}`} />
          {labelPrefix && (
            <text
              x={bounds.x + bounds.width / 2}
              y={slice.start + Math.min(18, slice.span / 2)}
              textAnchor="middle"
              className="command-preview-text"
            >
              {`${labelPrefix}${index + 1}`}
            </text>
          )}
        </g>
      ))}
      {layout.bars.map((bar, index) => (
        <rect
          key={`${tone}-hbar-${index}`}
          x={bounds.x}
          y={bar.start}
          width={bounds.width}
          height={bar.span}
          className={`command-preview-tile ${tone}`}
          opacity="0.48"
        />
      ))}
    </>
  );
}

function TechnicalInnerDimension({
  x1,
  y1,
  x2,
  y2,
  text,
  horizontal = false
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  horizontal?: boolean;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="svg-dimension technical-green-line" />
      {horizontal ? (
        <text x={(x1 + x2) / 2} y={y1 - 6} textAnchor="middle" className="technical-text-green small-text">
          {text}
        </text>
      ) : (
        <text
          x={x1 - 6}
          y={(y1 + y2) / 2}
          transform={`rotate(90 ${x1 - 6} ${(y1 + y2) / 2})`}
          className="technical-text-green small-text"
        >
          {text}
        </text>
      )}
    </g>
  );
}

function CanvasActionButton({
  x,
  y,
  label,
  onClick
}: {
  x: number;
  y: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <g className="canvas-action-group" onClick={onClick}>
      <circle cx={x} cy={y} r="16" className="canvas-action-button" />
      <text x={x} y={y + 5} textAnchor="middle" className="canvas-action-text">
        {label}
      </text>
    </g>
  );
}

function TechnicalProjectLegend({
  x,
  y,
  data,
  summaryRows
}: {
  x: number;
  y: number;
  data: {
    customerName: string;
    projectCode: string;
    address: string;
    notes: string;
    frameColorLabel: string;
    profileLabel: string;
    glassLabel: string;
    hardwareLabel: string;
    hingeCount: number;
    profileMeters: string;
    glassAreaM2: string;
    openingCount: number;
    panelCount: number;
  };
  summaryRows: Array<{
    key: string;
    label: string;
    quantity: number;
    lengthMeters: number;
    areaM2: number;
  }>;
}) {
  const width = 260;
  const rows = [
    {
      left: `Musteri: ${truncateText(data.customerName, 14)}`,
      right: `Proje: ${truncateText(data.projectCode, 10)}`
    },
    {
      left: `Seri: ${truncateText(data.profileLabel, 12)}`,
      right: `Cam: ${truncateText(data.glassLabel, 12)}`
    },
    {
      left: `Donanim: ${truncateText(data.hardwareLabel, 11)}`,
      right: `Renk: ${truncateText(data.frameColorLabel, 9)}`
    },
    {
      left: `Panel: ${data.panelCount}`,
      right: `Kanat: ${data.openingCount}`
    },
    {
      left: `Profil: ${data.profileMeters} m`,
      right: `Cam: ${data.glassAreaM2} m2`
    },
    {
      left: `Mentese: ${data.hingeCount}`,
      right: "Olcek: 1/10"
    }
  ];
  const legendRows = ["Sab = Sabit", "Sag = Sag acilim", "Sol = Sol acilim", "Vas = Vasistas", "Sur = Surme"];
  const height = 302;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="16" className="technical-info-shell" />
      <text x="16" y="20" className="technical-info-title">
        Teknik Bilgi Panosu
      </text>
      {rows.map((row, index) => (
        <g key={`${row.left}-${row.right}`}>
          <text x="16" y={42 + index * 15} className="technical-info-row">
            {row.left}
          </text>
          <text x="138" y={42 + index * 15} className="technical-info-row muted">
            {row.right}
          </text>
        </g>
      ))}
      <line x1="14" y1="138" x2={width - 14} y2="138" className="technical-info-divider" />
      <text x="16" y="156" className="technical-info-head">
        Legend
      </text>
      {legendRows.map((row, index) => (
        <text key={row} x="16" y={172 + index * 12} className="technical-info-row muted">
          {row}
        </text>
      ))}
      <line x1="14" y1="232" x2={width - 14} y2="232" className="technical-info-divider" />
      <text x="16" y="248" className="technical-info-head">
        Uretim Ozeti
      </text>
      {summaryRows.slice(0, 4).map((row, index) => (
        <g key={row.key}>
          <text x="16" y={264 + index * 12} className="technical-info-row">
            {row.label}: {row.quantity}
          </text>
          <text x={width - 16} y={264 + index * 12} textAnchor="end" className="technical-info-row muted">
            {row.lengthMeters > 0 ? `${row.lengthMeters.toFixed(1)} m` : row.areaM2 > 0 ? `${row.areaM2.toFixed(2)} m2` : "adet"}
          </text>
        </g>
      ))}
      <text x="16" y="122" className="technical-info-row muted">
        Adres: {truncateText(data.address, 32)}
      </text>
      <text x="16" y="136" className="technical-info-row muted">
        Not: {truncateText(data.notes, 34)}
      </text>
    </g>
  );
}

function buildTechnicalDetailCalloutData(
  bounds: { x: number; y: number; width: number; height: number },
  panelLabel: string,
  openingLabel: string,
  engineering: ReturnType<typeof buildPanelEngineering>,
  profileLabel: string,
  glassLabel: string
) {
  const cardWidth = 158;
  return [
    {
      id: "D1",
      key: "panel",
      title: "PANEL",
      value: `${truncateText(panelLabel, 12)} / ${truncateText(openingLabel, 10)}`,
      anchor: { x: bounds.x + bounds.width / 2, y: bounds.y + 8 },
      card: { x: bounds.x + bounds.width + 28, y: bounds.y - 34 },
      cardWidth
    },
    {
      id: "D2",
      key: "sash",
      title: "KANAT",
      value: `${Math.round(engineering.approxSashWidthMm)} x ${Math.round(engineering.approxSashHeightMm)} mm`,
      anchor: { x: bounds.x + 12, y: bounds.y + bounds.height / 2 },
      card: { x: Math.max(22, bounds.x - cardWidth - 30), y: bounds.y + bounds.height / 2 - 16 },
      cardWidth
    },
    {
      id: "D3",
      key: "glass",
      title: "CAM",
      value: `${Math.round(engineering.approxGlassWidthMm)} x ${Math.round(engineering.approxGlassHeightMm)} / ${truncateText(glassLabel, 12)}`,
      anchor: { x: bounds.x + bounds.width - 12, y: bounds.y + bounds.height / 2 + 18 },
      card: { x: bounds.x + bounds.width + 28, y: bounds.y + bounds.height / 2 + 2 },
      cardWidth
    },
    {
      id: "D4",
      key: "series",
      title: "SERI",
      value: `${truncateText(profileLabel, 15)} / ${engineering.approxSashWeightKg.toFixed(1)} kg`,
      anchor: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height - 8 },
      card: { x: bounds.x + bounds.width / 2 - cardWidth / 2, y: bounds.y + bounds.height + 26 },
      cardWidth
    }
  ];
}

function TechnicalDetailCallouts({
  bounds,
  panelLabel,
  openingLabel,
  engineering,
  profileLabel,
  glassLabel
}: {
  bounds: { x: number; y: number; width: number; height: number };
  panelLabel: string;
  openingLabel: string;
  engineering: ReturnType<typeof buildPanelEngineering>;
  profileLabel: string;
  glassLabel: string;
}) {
  const callouts = buildTechnicalDetailCalloutData(bounds, panelLabel, openingLabel, engineering, profileLabel, glassLabel);

  return (
    <g>
      {callouts.map((item) => (
        <g key={item.key}>
          <line
            x1={item.anchor.x}
            y1={item.anchor.y}
            x2={item.card.x + item.cardWidth / 2}
            y2={item.card.y + 14}
            className="technical-detail-line"
          />
          <rect
            x={item.card.x}
            y={item.card.y}
            width={item.cardWidth}
            height="28"
            rx="10"
            className="technical-detail-card"
          />
          <text x={item.card.x + 10} y={item.card.y + 12} className="technical-detail-title">
            {item.id} / {item.title}
          </text>
          <text x={item.card.x + 10} y={item.card.y + 22} className="technical-detail-value">
            {item.value}
          </text>
        </g>
      ))}
    </g>
  );
}

function TechnicalMiniSection({
  x,
  y,
  design,
  engineering
}: {
  x: number;
  y: number;
  design: PvcDesign;
  engineering: ReturnType<typeof buildPanelEngineering>;
}) {
  const width = 260;
  const height = 178;
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const geometrySpec = profileGeometryCatalog[design.materials.profileSeries];
  const glassSpec = glassCatalog[design.materials.glassType];
  const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];
  const frameDepth = clamp(Math.round(design.outerFrameThickness * 0.58), 34, 68);
  const sashDepth = clamp(Math.round(design.mullionThickness * 0.64), 26, 54);
  const glassDepth = clamp(Math.round(sashDepth * 0.44), 10, 22);
  const sectionX = 18;
  const sectionY = 24;
  const sectionWidth = 102;
  const sectionHeight = 86;
  const frameInset = frameDepth * 0.24;
  const sashInset = frameInset + sashDepth * 0.34;
  const glassInset = sashInset + glassDepth;
  const frameInnerInset = clamp(Math.round(frameDepth * 0.12), 5, 10);
  const sashInnerInset = clamp(Math.round(sashDepth * 0.18), 4, 8);
  const drainageY = sectionY + sectionHeight - frameInset - 7;
  const frameRect = { x: sectionX, y: sectionY, width: sectionWidth, height: sectionHeight };
  const sashRect = {
    x: sectionX + frameInset,
    y: sectionY + frameInset,
    width: sectionWidth - frameInset * 2,
    height: sectionHeight - frameInset * 2
  };
  const glassRect = {
    x: sectionX + glassInset,
    y: sectionY + glassInset,
    width: sectionWidth - glassInset * 2,
    height: sectionHeight - glassInset * 2
  };

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="16" className="technical-section-shell" />
      <text x="16" y="20" className="technical-section-title">
        Mini Kesit / Profil Detayi
      </text>
      <rect x="176" y="10" width="68" height="18" rx="9" className="technical-section-chip" />
      <text x="210" y="23" textAnchor="middle" className="technical-section-chip-text">
        {geometrySpec.detailRefs[0] ?? "A-A"} KESIT
      </text>
      <rect x="186" y="32" width="58" height="16" rx="8" className="technical-section-chip secondary" />
      <text x="215" y="43" textAnchor="middle" className="technical-section-chip-text secondary">
        {geometrySpec.detailRefs[1] ?? "B-B"} CAM
      </text>
      <rect x={frameRect.x} y={frameRect.y} width={frameRect.width} height={frameRect.height} className="technical-section-frame" />
      <rect
        x={sectionX + frameInnerInset}
        y={sectionY + frameInnerInset}
        width={sectionWidth - frameInnerInset * 2}
        height={sectionHeight - frameInnerInset * 2}
        className="technical-section-frame inner"
      />
      <rect x={sashRect.x} y={sashRect.y} width={sashRect.width} height={sashRect.height} className="technical-section-sash" />
      <rect
        x={sectionX + sashInset - sashInnerInset}
        y={sectionY + sashInset - sashInnerInset}
        width={sectionWidth - (sashInset - sashInnerInset) * 2}
        height={sectionHeight - (sashInset - sashInnerInset) * 2}
        className="technical-section-sash inner"
      />
      <rect x={glassRect.x} y={glassRect.y} width={glassRect.width} height={glassRect.height} className="technical-section-glass" />
      <rect
        x={glassRect.x + 3}
        y={glassRect.y + 3}
        width={glassRect.width - 6}
        height={glassRect.height - 6}
        className="technical-section-bead"
      />
      {geometrySpec.frameLines.map((ratio, index) => (
        <line
          key={`frame-line-${index}`}
          x1={frameRect.x + frameRect.width * ratio}
          y1={frameRect.y + 7}
          x2={frameRect.x + frameRect.width * ratio}
          y2={frameRect.y + frameRect.height - 7}
          className="technical-section-chamber"
        />
      ))}
      {geometrySpec.sashLines.map((ratio, index) => (
        <line
          key={`sash-line-${index}`}
          x1={sashRect.x + sashRect.width * ratio}
          y1={sashRect.y + 6}
          x2={sashRect.x + sashRect.width * ratio}
          y2={sashRect.y + sashRect.height - 6}
          className="technical-section-chamber inner"
        />
      ))}
      <line
        x1={glassRect.x + glassDepth}
        y1={glassRect.y}
        x2={glassRect.x + glassDepth}
        y2={glassRect.y + glassRect.height}
        className="technical-section-divider"
      />
      {geometrySpec.drainageSlots.map((ratio, index) => (
        <line
          key={`drain-${index}`}
          x1={sectionX + sectionWidth * ratio - 8}
          y1={drainageY}
          x2={sectionX + sectionWidth * ratio + 8}
          y2={drainageY}
          className="technical-section-drain"
        />
      ))}
      {geometrySpec.thermalBands.map((ratio, index) => (
        <line
          key={`thermal-${index}`}
          x1={sectionX + sectionWidth * ratio}
          y1={sectionY + 10}
          x2={sectionX + sectionWidth * ratio}
          y2={sectionY + sectionHeight - 10}
          className="technical-section-thermal"
        />
      ))}
      <text x={sectionX + 4} y={sectionY + sectionHeight + 15} className="technical-section-scale">
        {geometrySpec.sectionScaleLabel}
      </text>
      <line x1="136" y1="50" x2="244" y2="50" className="technical-info-divider" />
      <text x="136" y="66" className="technical-section-meta">
        Seri: {truncateText(`${profileSpec.label} / ${geometrySpec.officialCode}`, 18)}
      </text>
      <text x="136" y="82" className="technical-section-meta">
        Cam: {truncateText(glassSpec.label, 18)}
      </text>
      <text x="136" y="98" className="technical-section-meta">
        Kanat: {Math.round(engineering.approxSashWidthMm)} x {Math.round(engineering.approxSashHeightMm)}
      </text>
      <text x="136" y="114" className="technical-section-meta">
        Net Cam: {Math.round(engineering.approxGlassWidthMm)} x {Math.round(engineering.approxGlassHeightMm)}
      </text>
      <text x="136" y="130" className="technical-section-meta">
        Agirlik: {engineering.approxSashWeightKg.toFixed(1)} kg
      </text>
      <text x="136" y="146" className="technical-section-meta muted">
        Kasa {design.outerFrameThickness} / Kayit {design.mullionThickness} / Cita {profileSpec.beadAllowanceMm}
      </text>
      <text x="136" y="158" className="technical-section-meta muted">
        Derinlik {profileSpec.depthMm} mm / Cam {glassSpec.thicknessLabel} / {geometrySpec.chamberLabel}
      </text>
      <text x="136" y="170" className="technical-section-meta muted">
        Donanim {hardwareSpec.label} / Max {hardwareSpec.maxSashWeightKg} kg / {truncateText(geometrySpec.note, 20)}
      </text>
    </g>
  );
}

function TechnicalDetailSchedule({
  x,
  y,
  rows
}: {
  x: number;
  y: number;
  rows: Array<{ id: string; title: string; value: string }>;
}) {
  const width = 260;
  const rowHeight = 22;
  const height = 42 + rows.length * rowHeight;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="14" className="technical-detail-schedule-shell" />
      <text x="16" y="20" className="technical-detail-schedule-title">
        Detay Listesi
      </text>
      {rows.map((row, index) => (
        <g key={row.id} transform={`translate(0 ${32 + index * rowHeight})`}>
          <line x1="12" y1="0" x2={width - 12} y2="0" className="technical-schedule-divider" />
          <text x="16" y="14" className="technical-detail-schedule-id">
            {row.id}
          </text>
          <text x="52" y="14" className="technical-detail-schedule-label">
            {truncateText(row.title, 14)}
          </text>
          <text x={width - 16} y="14" textAnchor="end" className="technical-detail-schedule-value">
            {truncateText(row.value, 24)}
          </text>
        </g>
      ))}
    </g>
  );
}

function TechnicalPageFrame({
  x,
  y,
  width,
  height
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="22" className="technical-page-frame" />
      <rect x="18" y="18" width={width - 36} height={height - 36} rx="18" className="technical-page-frame inner" />
      <text x="24" y="26" className="technical-page-label">
        SHEET / 01
      </text>
      <text x={width - 24} y={26} textAnchor="end" className="technical-page-label">
        LOGICAL STYLE PVC CAD LAYOUT
      </text>
    </g>
  );
}

function TechnicalDetailSheet({
  x,
  y,
  width,
  height,
  panelLabel,
  openingLabel,
  engineering,
  detailRows,
  summary
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  panelLabel: string;
  openingLabel: string;
  engineering: ReturnType<typeof buildPanelEngineering>;
  detailRows: Array<{ id: string; title: string; value: string }>;
  summary: {
    revisionTag: string;
    issueStatus: string;
    checker: string;
    totalCuts: number;
    grouped: Array<{
      key: string;
      label: string;
      quantity: number;
      lengthMeters: number;
      areaM2: number;
    }>;
  };
}) {
  const sketchX = 22;
  const sketchY = 28;
  const sketchWidth = 176;
  const sketchHeight = height - 48;
  const frameInset = 16;
  const sashInset = 34;
  const glassInset = 52;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="18" className="technical-detail-sheet" />
      <text x="20" y="22" className="technical-detail-sheet-title">
        DETAY LEVHASI / SAYFA 02
      </text>
      <text x={width - 20} y="22" textAnchor="end" className="technical-detail-sheet-meta">
        {truncateText(panelLabel, 14)} / {truncateText(openingLabel, 14)}
      </text>
      <text x={width - 20} y="38" textAnchor="end" className="technical-detail-sheet-note muted">
        {summary.revisionTag} / {truncateText(summary.issueStatus, 18)}
      </text>
      <rect x={sketchX} y={sketchY} width={sketchWidth} height={sketchHeight} rx="12" className="technical-detail-sheet-sketch" />
      <rect
        x={sketchX + frameInset}
        y={sketchY + frameInset}
        width={sketchWidth - frameInset * 2}
        height={sketchHeight - frameInset * 2}
        className="technical-detail-sheet-sash"
      />
      <rect
        x={sketchX + glassInset}
        y={sketchY + glassInset}
        width={sketchWidth - glassInset * 2}
        height={sketchHeight - glassInset * 2}
        className="technical-detail-sheet-glass"
      />
      <line
        x1={sketchX + sketchWidth / 2}
        y1={sketchY + 10}
        x2={sketchX + sketchWidth / 2}
        y2={sketchY + sketchHeight - 10}
        className="technical-detail-sheet-axis"
      />
      <line
        x1={sketchX + 10}
        y1={sketchY + sketchHeight / 2}
        x2={sketchX + sketchWidth - 10}
        y2={sketchY + sketchHeight / 2}
        className="technical-detail-sheet-axis"
      />
      <text x={sketchX + 12} y={sketchY + sketchHeight + 18} className="technical-detail-sheet-note">
        Net Kanat: {Math.round(engineering.approxSashWidthMm)} x {Math.round(engineering.approxSashHeightMm)} mm
      </text>
      <text x={sketchX + 12} y={sketchY + sketchHeight + 34} className="technical-detail-sheet-note muted">
        Net Cam: {Math.round(engineering.approxGlassWidthMm)} x {Math.round(engineering.approxGlassHeightMm)} mm
      </text>

      <line x1="220" y1="32" x2={width - 20} y2="32" className="technical-info-divider" />
      {detailRows.slice(0, 4).map((row, index) => (
        <g key={row.id} transform={`translate(220 ${46 + index * 18})`}>
          <rect width={width - 240} height="16" rx="8" className="technical-detail-sheet-row" />
          <text x="10" y="12" className="technical-detail-sheet-row-id">
            {row.id}
          </text>
          <text x="38" y="12" className="technical-detail-sheet-row-text">
            {truncateText(`${row.title}: ${row.value}`, 52)}
          </text>
        </g>
      ))}
      <line x1="220" y1={height - 62} x2={width - 20} y2={height - 62} className="technical-info-divider" />
      <text x="220" y={height - 46} className="technical-detail-sheet-note">
        Kesim: {summary.totalCuts} satir / Kontrol: {truncateText(summary.checker, 18)}
      </text>
      {summary.grouped.slice(0, 2).map((row, index) => (
        <text key={row.key} x="220" y={height - 30 + index * 12} className="technical-detail-sheet-note muted">
          {row.label}: {row.quantity} / {row.lengthMeters > 0 ? `${row.lengthMeters.toFixed(1)} m` : row.areaM2 > 0 ? `${row.areaM2.toFixed(2)} m2` : "adet"}
        </text>
      ))}
      <text x="220" y={height - 18} className="technical-detail-sheet-note muted">
        Referans: montaj, kesit ve cam yerlesimi kontrol ediniz.
      </text>
    </g>
  );
}

function ObjectManipulatorHandles({
  bounds,
  tone,
  title,
  onWidthMouseDown,
  onHeightMouseDown
}: {
  bounds: { x: number; y: number; width: number; height: number };
  tone: "panel" | "sash" | "glass";
  title: string;
  onWidthMouseDown: (event: ReactMouseEvent<SVGCircleElement>) => void;
  onHeightMouseDown: (event: ReactMouseEvent<SVGCircleElement>) => void;
}) {
  return (
    <g>
      <line
        x1={bounds.x + bounds.width}
        y1={bounds.y + bounds.height / 2}
        x2={bounds.x + bounds.width + 24}
        y2={bounds.y + bounds.height / 2}
        className={`object-manipulator-line ${tone}`}
      />
      <line
        x1={bounds.x + bounds.width / 2}
        y1={bounds.y + bounds.height}
        x2={bounds.x + bounds.width / 2}
        y2={bounds.y + bounds.height + 24}
        className={`object-manipulator-line ${tone}`}
      />
      <circle
        cx={bounds.x + bounds.width + 24}
        cy={bounds.y + bounds.height / 2}
        r="8"
        className={`object-manipulator-handle ${tone}`}
        onMouseDown={onWidthMouseDown}
      />
      <circle
        cx={bounds.x + bounds.width / 2}
        cy={bounds.y + bounds.height + 24}
        r="8"
        className={`object-manipulator-handle ${tone}`}
        onMouseDown={onHeightMouseDown}
      />
      <g transform={`translate(${bounds.x + bounds.width / 2 - 64} ${bounds.y - 34})`}>
        <rect width="128" height="24" rx="10" className={`object-manipulator-badge ${tone}`} />
        <text x="64" y="16" textAnchor="middle" className="object-manipulator-text">
          {title}
        </text>
      </g>
    </g>
  );
}

function ThicknessManipulatorHandles({
  primary,
  secondary,
  label,
  tone
}: {
  primary: {
    x: number;
    y: number;
    cursor: string;
    onMouseDown: (event: ReactMouseEvent<SVGCircleElement>) => void;
  };
  secondary?: {
    x: number;
    y: number;
    cursor: string;
    onMouseDown: (event: ReactMouseEvent<SVGCircleElement>) => void;
  };
  label: string;
  tone: "frame" | "mullion" | "transom";
}) {
  const labelX = secondary ? (primary.x + secondary.x) / 2 : primary.x;
  const labelY = secondary ? (primary.y + secondary.y) / 2 - 22 : primary.y - 24;

  return (
    <g>
      {secondary && (
        <line
          x1={primary.x}
          y1={primary.y}
          x2={secondary.x}
          y2={secondary.y}
          className={`thickness-manipulator-line ${tone}`}
        />
      )}
      <circle
        cx={primary.x}
        cy={primary.y}
        r="8.5"
        className={`thickness-manipulator-handle ${tone}`}
        style={{ cursor: primary.cursor }}
        onMouseDown={primary.onMouseDown}
      />
      {secondary && (
        <circle
          cx={secondary.x}
          cy={secondary.y}
          r="8.5"
          className={`thickness-manipulator-handle ${tone}`}
          style={{ cursor: secondary.cursor }}
          onMouseDown={secondary.onMouseDown}
        />
      )}
      <g transform={`translate(${labelX - 70} ${labelY - 14})`}>
        <rect width="140" height="28" rx="12" className={`thickness-manipulator-badge ${tone}`} />
        <text x="70" y="18" textAnchor="middle" className="thickness-manipulator-text">
          {label}
        </text>
      </g>
    </g>
  );
}

function SelectionOverlayPalette({
  x,
  y,
  title,
  tone,
  activeValue,
  actions,
  compact = false,
  onSelect
}: {
  x: number;
  y: number;
  title: string;
  tone: "sash" | "glass" | "hardware" | "mullion" | "transom";
  activeValue: string;
  actions: Array<{ value: string; label: string }>;
  compact?: boolean;
  onSelect: (value: string) => void;
}) {
  const chipWidth = compact ? 56 : 68;
  const gap = 8;
  const width = actions.length * chipWidth + Math.max(0, actions.length - 1) * gap + 20;
  const height = 54;

  return (
    <g transform={`translate(${x - width / 2} ${y})`}>
      <rect width={width} height={height} rx="18" className={`overlay-palette-shell ${tone}`} />
      <text x="12" y="17" className="overlay-palette-title">
        {title}
      </text>
      {actions.map((action, index) => {
        const chipX = 10 + index * (chipWidth + gap);
        const isActive = action.value === activeValue;
        return (
          <g
            key={action.value}
            transform={`translate(${chipX} 24)`}
            className="overlay-chip-group"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelect(action.value);
            }}
          >
            <rect
              width={chipWidth}
              height="20"
              rx="10"
              className={`overlay-chip ${tone} ${isActive ? "active" : ""}`}
            />
            <text x={chipWidth / 2} y="14" textAnchor="middle" className="overlay-chip-text">
              {action.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function CommandPreviewOverlay({
  preview,
  selectedBounds,
  selectedRowBounds,
  blockSelectionPreview,
  panelShiftRange,
  transomShiftRange,
  activePanelBlockRefs,
  selectedTransomId,
  activePanelCount,
  activeRowCount,
  panelCenterDelta,
  transomCenterDelta,
  commandTarget,
  selectedObject,
  rowPanels,
  frameRect,
  frameInset,
  mullionSize,
  scale,
  design
}: {
  preview: CommandPreview;
  selectedBounds: { x: number; y: number; width: number; height: number } | null;
  selectedRowBounds: { x: number; y: number; width: number; height: number } | null;
  blockSelectionPreview: BlockSelectionPreview | null;
  panelShiftRange: { min: number; max: number } | null;
  transomShiftRange: { min: number; max: number } | null;
  activePanelBlockRefs: PanelRef[];
  selectedTransomId: string | null;
  activePanelCount: number;
  activeRowCount: number;
  panelCenterDelta: number | null;
  transomCenterDelta: number | null;
  commandTarget: CommandTarget | null;
  selectedObject: CanvasObjectSelection | null;
  rowPanels: PanelDefinition[] | null;
  frameRect: { x: number; y: number; width: number; height: number };
  frameInset: number;
  mullionSize: number;
  scale: number;
  design: PvcDesign;
}) {
  const previewCanvasLayout = buildCanvasLayout(design, frameRect, scale);

  if (preview.type === "mirror" && preview.axis === "horizontal") {
    const mirroredRows = [...previewCanvasLayout.rows].reverse();

    return (
      <g>
        <rect
          x={previewCanvasLayout.innerRect.x}
          y={previewCanvasLayout.innerRect.y}
          width={previewCanvasLayout.innerRect.width}
          height={previewCanvasLayout.innerRect.height}
          className="command-preview-shell"
        />
        {mirroredRows.map((row, rowIndex) => {
          return (
            <g key={`mirror-stack-${row.transomId}-${rowIndex}`}>
              <rect
                x={row.bounds.x}
                y={row.bounds.y}
                width={row.bounds.width}
                height={row.bounds.height}
                className="command-preview-tile mirror"
              />
              {row.panels.map((panel, panelIndex) => {
                const sourcePanel = design.transoms[row.transomIndex]?.panels[panel.panelIndex];
                if (!sourcePanel) {
                  return null;
                }
                return (
                  <g key={`mirror-stack-panel-${panel.panelId}-${panelIndex}`}>
                    <rect
                      x={panel.bounds.x}
                      y={row.bounds.y}
                      width={panel.bounds.width}
                      height={row.bounds.height}
                      className="command-preview-tile"
                    />
                    <text
                      x={panel.centerX}
                      y={row.bounds.y + Math.min(18, row.bounds.height / 2)}
                      textAnchor="middle"
                      className="command-preview-text"
                    >
                      {sourcePanel.label}
                    </text>
                  </g>
                );
              })}
              {row.mullions.map((bar) => (
                <rect
                  key={`mirror-stack-bar-${bar.transomId}-${bar.panelId}`}
                  x={bar.rect.x}
                  y={bar.rect.y}
                  width={bar.rect.width}
                  height={bar.rect.height}
                  className="command-preview-tile mirror"
                />
              ))}
              <PreviewBadge
                x={row.bounds.x + row.bounds.width - 58}
                y={row.bounds.y + 18}
                text={`Satir ${rowIndex + 1}`}
              />
            </g>
          );
        })}
        {previewCanvasLayout.horizontalBars.map((bar) => (
          <rect
            key={`mirror-stack-h-${bar.aboveTransomId}`}
            x={bar.rect.x}
            y={bar.rect.y}
            width={bar.rect.width}
            height={bar.rect.height}
            className="command-preview-tile mirror"
          />
        ))}
        <PreviewBadge
          x={previewCanvasLayout.innerRect.x + previewCanvasLayout.innerRect.width / 2}
          y={previewCanvasLayout.innerRect.y - 18}
          text="Mirror Yatay Preview"
        />
      </g>
    );
  }

  if (preview.type === "mirror" && preview.axis === "pick") {
    const verticalLine =
      selectedRowBounds && {
        x1: selectedRowBounds.x + selectedRowBounds.width / 2,
        y1: selectedRowBounds.y - 18,
        x2: selectedRowBounds.x + selectedRowBounds.width / 2,
        y2: selectedRowBounds.y + selectedRowBounds.height + 18
      };
    const horizontalLine = {
      x1: frameRect.x - 18,
      y1: frameRect.y + frameRect.height / 2,
      x2: frameRect.x + frameRect.width + 18,
      y2: frameRect.y + frameRect.height / 2
    };

    return (
      <g>
        {verticalLine && (
          <line
            x1={verticalLine.x1}
            y1={verticalLine.y1}
            x2={verticalLine.x2}
            y2={verticalLine.y2}
            className="command-preview-target-line"
          />
        )}
        <line
          x1={horizontalLine.x1}
          y1={horizontalLine.y1}
          x2={horizontalLine.x2}
          y2={horizontalLine.y2}
          className="command-preview-target-line"
        />
        <PreviewBadge
          x={frameRect.x + frameRect.width / 2}
          y={frameRect.y - 18}
          text="Mirror eksenini sec"
        />
      </g>
    );
  }

  if (preview.type === "guide-align") {
    const bounds = preview.mode === "row" ? selectedRowBounds : blockSelectionPreview?.bounds ?? selectedBounds;
    if (!bounds) {
      return null;
    }

    if (preview.mode === "panel") {
      const metrics = getPanelBlockMetrics(design, activePanelBlockRefs);
      if (!metrics) {
        return null;
      }
      const targetMm =
        preview.position === "start"
          ? metrics.startMm
          : preview.position === "end"
            ? metrics.endMm
            : metrics.centerMm;
      const nearestGuide = getNearestGuide(design.guides, "vertical", targetMm);
      if (!nearestGuide) {
        return null;
      }
      const requestedDeltaMm = Math.round(nearestGuide.positionMm - targetMm);
      const nextDeltaMm = clamp(
        requestedDeltaMm,
        panelShiftRange?.min ?? requestedDeltaMm,
        panelShiftRange?.max ?? requestedDeltaMm
      );
      const unreachable = requestedDeltaMm !== 0 && nextDeltaMm === 0;
      const limited = !unreachable && Math.abs(nextDeltaMm) < Math.abs(requestedDeltaMm);
      const alternative = limited || unreachable
        ? getReachableGuideAlternative(design.guides, "vertical", targetMm, panelShiftRange, nearestGuide.id)
        : null;
      const guideX = frameRect.x + frameInset + nearestGuide.positionMm * scale;
      const deltaPx = nextDeltaMm * scale;
      const shifted = {
        x: bounds.x + deltaPx,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
      return (
        <g>
          <line
            x1={guideX}
            y1={frameRect.y - 18}
            x2={guideX}
            y2={frameRect.y + frameRect.height + 18}
            className={`command-preview-guide-line ${unreachable ? "error" : limited ? "warning" : ""}`}
          />
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            className={`command-preview-shell target ${unreachable ? "invalid" : ""}`}
          />
          <rect
            x={shifted.x}
            y={shifted.y}
            width={shifted.width}
            height={shifted.height}
            className={`command-preview-tile guide ${unreachable ? "error" : limited ? "warning" : ""}`}
          />
          <PreviewBadge
            x={guideX}
            y={bounds.y - 18}
            text={`Guide ${nearestGuide.label} / ${
              preview.position === "start" ? "Left" : preview.position === "end" ? "Right" : "Center"
            }${
              requestedDeltaMm === 0
                ? " / Hazir"
                : limited || unreachable
                  ? ` / Max ${nextDeltaMm > 0 ? "+" : ""}${nextDeltaMm}`
                  : ` / ${nextDeltaMm > 0 ? "+" : ""}${nextDeltaMm}`
            }`}
            tone={unreachable ? "error" : limited ? "warning" : requestedDeltaMm === 0 ? "success" : "default"}
          />
          {(limited || unreachable) && (
            <PreviewBadge
              x={guideX}
              y={bounds.y + bounds.height + 18}
              text={
                alternative
                  ? `Oneri: Guide ${alternative.guide.label} (${alternative.deltaMm > 0 ? "+" : ""}${alternative.deltaMm})`
                  : `Oneri: en fazla ${nextDeltaMm > 0 ? "+" : ""}${nextDeltaMm} mm`
              }
              tone={unreachable ? "error" : "warning"}
            />
          )}
        </g>
      );
    }

    const metrics = getSelectedTransomMetrics(design, selectedTransomId);
    if (!metrics) {
      return null;
    }
    const targetMm =
      preview.position === "start"
        ? metrics.startMm
        : preview.position === "end"
          ? metrics.endMm
          : metrics.centerMm;
    const nearestGuide = getNearestGuide(design.guides, "horizontal", targetMm);
    if (!nearestGuide) {
      return null;
    }
    const requestedDeltaMm = Math.round(nearestGuide.positionMm - targetMm);
    const nextDeltaMm = clamp(
      requestedDeltaMm,
      transomShiftRange?.min ?? requestedDeltaMm,
      transomShiftRange?.max ?? requestedDeltaMm
    );
    const unreachable = requestedDeltaMm !== 0 && nextDeltaMm === 0;
    const limited = !unreachable && Math.abs(nextDeltaMm) < Math.abs(requestedDeltaMm);
    const alternative = limited || unreachable
      ? getReachableGuideAlternative(design.guides, "horizontal", targetMm, transomShiftRange, nearestGuide.id)
      : null;
    const guideY = frameRect.y + frameInset + nearestGuide.positionMm * scale;
    const deltaPx = nextDeltaMm * scale;
    const shifted = {
      x: bounds.x,
      y: bounds.y + deltaPx,
      width: bounds.width,
      height: bounds.height
    };
    return (
      <g>
        <line
          x1={frameRect.x - 18}
          y1={guideY}
          x2={frameRect.x + frameRect.width + 18}
          y2={guideY}
          className={`command-preview-guide-line ${unreachable ? "error" : limited ? "warning" : ""}`}
        />
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          className={`command-preview-shell target ${unreachable ? "invalid" : ""}`}
        />
        <rect
          x={shifted.x}
          y={shifted.y}
          width={shifted.width}
          height={shifted.height}
          className={`command-preview-tile guide ${unreachable ? "error" : limited ? "warning" : ""}`}
        />
        <PreviewBadge
          x={bounds.x + bounds.width / 2}
          y={guideY - 18}
          text={`Guide ${nearestGuide.label} / ${
            preview.position === "start" ? "Top" : preview.position === "end" ? "Bottom" : "Middle"
          }${
            requestedDeltaMm === 0
              ? " / Hazir"
              : limited || unreachable
                ? ` / Max ${nextDeltaMm > 0 ? "+" : ""}${nextDeltaMm}`
                : ` / ${nextDeltaMm > 0 ? "+" : ""}${nextDeltaMm}`
          }`}
          tone={unreachable ? "error" : limited ? "warning" : requestedDeltaMm === 0 ? "success" : "default"}
        />
        {(limited || unreachable) && (
          <PreviewBadge
            x={bounds.x + bounds.width / 2}
            y={guideY + 18}
            text={
              alternative
                ? `Oneri: Guide ${alternative.guide.label} (${alternative.deltaMm > 0 ? "+" : ""}${alternative.deltaMm})`
                : `Oneri: en fazla ${nextDeltaMm > 0 ? "+" : ""}${nextDeltaMm} mm`
            }
            tone={unreachable ? "error" : "warning"}
          />
        )}
      </g>
    );
  }

  if (preview.type === "align") {
    const bounds = preview.mode === "row" ? selectedRowBounds : blockSelectionPreview?.bounds ?? selectedBounds;
    const deltaMm =
      preview.mode === "row"
        ? preview.position === "start"
          ? transomShiftRange?.min ?? null
          : transomShiftRange?.max ?? null
        : preview.position === "start"
          ? panelShiftRange?.min ?? null
          : panelShiftRange?.max ?? null;

    if (!bounds || deltaMm === null) {
      return null;
    }

    const isAlreadyAligned = deltaMm === 0;

    const shifted =
      preview.mode === "row"
        ? { x: bounds.x, y: bounds.y + deltaMm * scale, width: bounds.width, height: bounds.height }
        : { x: bounds.x + deltaMm * scale, y: bounds.y, width: bounds.width, height: bounds.height };

    return (
      <g>
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} className="command-preview-shell target" />
        <rect x={shifted.x} y={shifted.y} width={shifted.width} height={shifted.height} className="command-preview-tile align" />
        <line
          x1={bounds.x + bounds.width / 2}
          y1={bounds.y + bounds.height / 2}
          x2={shifted.x + shifted.width / 2}
          y2={shifted.y + shifted.height / 2}
          className="command-preview-target-line"
        />
        <PreviewBadge
          x={shifted.x + shifted.width / 2}
          y={shifted.y - 18}
          text={`Align ${
            preview.mode === "row"
              ? preview.position === "start"
                ? "Top"
                : "Bottom"
              : preview.position === "start"
                ? "Left"
                : "Right"
          }${isAlreadyAligned ? " / Hazir" : ` ${deltaMm > 0 ? "+" : ""}${deltaMm}`}`}
          tone={isAlreadyAligned ? "success" : "default"}
        />
      </g>
    );
  }

  if (preview.type === "distribute") {
    if (preview.mode === "panel") {
      const bounds = blockSelectionPreview?.bounds ?? selectedBounds;
      const count = Math.max(0, activePanelCount);
      if (!bounds || count < 2) {
        return null;
      }
      return (
        <g>
          <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} className="command-preview-shell" />
          {renderHorizontalPreviewTiles(bounds, count, mullionSize, "distribute", "P")}
          <PreviewBadge x={bounds.x + bounds.width / 2} y={bounds.y - 18} text={`${preview.label} Panels x${count}`} />
        </g>
      );
    }

    const count = Math.max(0, activeRowCount);
    const innerBounds = {
      x: frameRect.x + frameInset,
      y: frameRect.y + frameInset,
      width: frameRect.width - frameInset * 2,
      height: frameRect.height - frameInset * 2
    };
    if (count < 2 || innerBounds.height <= 0) {
      return null;
    }
    return (
      <g>
        <rect x={innerBounds.x} y={innerBounds.y} width={innerBounds.width} height={innerBounds.height} className="command-preview-shell" />
        {renderVerticalPreviewTiles(innerBounds, count, mullionSize, "distribute", "R")}
        <PreviewBadge x={innerBounds.x + innerBounds.width / 2} y={innerBounds.y - 18} text={`${preview.label} Rows x${count}`} />
      </g>
    );
  }

  if (preview.type === "array" && preview.mode === "panel" && selectedBounds) {
    return (
      <g>
        <rect
          x={selectedBounds.x}
          y={selectedBounds.y}
          width={selectedBounds.width}
          height={selectedBounds.height}
          className="command-preview-shell"
        />
        {renderHorizontalPreviewTiles(selectedBounds, preview.count, mullionSize, "copy", "P")}
        <PreviewBadge
          x={selectedBounds.x + selectedBounds.width / 2}
          y={selectedBounds.y - 18}
          text={preview.stepMm ? `Array ${preview.count} / Step ${preview.stepMm}` : `Array ${preview.count}`}
        />
      </g>
    );
  }

  if (preview.type === "array" && preview.mode === "row" && selectedRowBounds) {
    return (
      <g>
        <rect
          x={selectedRowBounds.x}
          y={selectedRowBounds.y}
          width={selectedRowBounds.width}
          height={selectedRowBounds.height}
          className="command-preview-shell"
        />
        {renderVerticalPreviewTiles(selectedRowBounds, preview.count, mullionSize, "copy", "R")}
        <PreviewBadge
          x={selectedRowBounds.x + selectedRowBounds.width / 2}
          y={selectedRowBounds.y - 18}
          text={preview.stepMm ? `Array Row ${preview.count} / Step ${preview.stepMm}` : `Array Row ${preview.count}`}
        />
      </g>
    );
  }

  if (preview.type === "grid-array" && selectedBounds && selectedRowBounds) {
    const rowSlices = buildPreviewAxisSlices(selectedRowBounds.y, selectedRowBounds.height, preview.rows, mullionSize);
    const columnSlices = buildPreviewAxisSlices(selectedBounds.x, selectedBounds.width, preview.columns, mullionSize);
    return (
      <g>
        <rect
          x={selectedRowBounds.x}
          y={selectedRowBounds.y}
          width={selectedRowBounds.width}
          height={selectedRowBounds.height}
          className="command-preview-shell"
        />
        {rowSlices.slices.map((rowSlice, rowIndex) => {
          return (
            <g key={`grid-row-preview-${rowIndex}`}>
              <rect
                x={selectedRowBounds.x}
                y={rowSlice.start}
                width={selectedRowBounds.width}
                height={rowSlice.span}
                className="command-preview-tile grid-row"
              />
              {columnSlices.slices.map((columnSlice, columnIndex) => {
                return (
                  <g key={`grid-cell-preview-${rowIndex}-${columnIndex}`}>
                    <rect
                      x={columnSlice.start}
                      y={rowSlice.start}
                      width={columnSlice.span}
                      height={rowSlice.span}
                      className="command-preview-tile grid-cell"
                    />
                    <text
                      x={columnSlice.start + columnSlice.span / 2}
                      y={rowSlice.start + Math.min(18, rowSlice.span / 2)}
                      textAnchor="middle"
                      className="command-preview-text"
                    >
                      {rowIndex + 1}.{columnIndex + 1}
                    </text>
                  </g>
                );
              })}
              {columnSlices.bars.map((bar, columnIndex) => (
                <rect
                  key={`grid-vbar-${rowIndex}-${columnIndex}`}
                  x={bar.start}
                  y={rowSlice.start}
                  width={bar.span}
                  height={rowSlice.span}
                  className="command-preview-tile grid-row"
                  opacity="0.48"
                />
              ))}
            </g>
          );
        })}
        {rowSlices.bars.map((bar, rowIndex) => (
          <rect
            key={`grid-hbar-${rowIndex}`}
            x={selectedRowBounds.x}
            y={bar.start}
            width={selectedRowBounds.width}
            height={bar.span}
            className="command-preview-tile grid-row"
            opacity="0.48"
          />
        ))}
        <PreviewBadge
          x={selectedRowBounds.x + selectedRowBounds.width / 2}
          y={selectedRowBounds.y - 18}
          text={`Grid ${preview.columns}x${preview.rows}`}
        />
      </g>
    );
  }

  if (preview.type === "offset-pattern") {
    const bounds = preview.mode === "row" ? selectedRowBounds : blockSelectionPreview?.bounds ?? selectedBounds;
    if (!bounds) {
      return null;
    }

    const stepPx = Math.abs(preview.delta) * scale;
    const anchorPositive = preview.delta > 0;
    const axisSpan = preview.mode === "row" ? bounds.height : bounds.width;
    const cuts: number[] = [];

    for (let index = 1; index <= preview.count; index += 1) {
      const position = stepPx * index;
      if (axisSpan - position < (preview.mode === "row" ? 150 : 100) * scale) {
        break;
      }
      cuts.push(position);
    }

    if (!cuts.length) {
      return null;
    }

    const positions = anchorPositive ? cuts : cuts.map((value) => axisSpan - value);

    return (
      <g>
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          className="command-preview-shell"
        />
        {positions.map((position, index) =>
          preview.mode === "row" ? (
            <line
              key={`offset-row-pattern-${index}`}
              x1={bounds.x - 10}
              y1={bounds.y + position}
              x2={bounds.x + bounds.width + 10}
              y2={bounds.y + position}
              className="command-preview-line"
            />
          ) : (
            <line
              key={`offset-panel-pattern-${index}`}
              x1={bounds.x + position}
              y1={bounds.y - 10}
              x2={bounds.x + position}
              y2={bounds.y + bounds.height + 10}
              className="command-preview-line"
            />
          )
        )}
        <PreviewBadge
          x={bounds.x + bounds.width / 2}
          y={bounds.y - 18}
          text={`Offset ${preview.mode === "row" ? "Row" : blockSelectionPreview ? "Block" : "Panel"} ${preview.delta > 0 ? "+" : ""}${preview.delta} / ${cuts.length}`}
        />
      </g>
    );
  }

  if (preview.type === "move-displace") {
    const bounds =
      preview.mode === "row"
        ? selectedRowBounds
        : blockSelectionPreview?.bounds ?? selectedBounds;
    if (!bounds) {
      return null;
    }

    const nextDeltaMm =
      preview.mode === "row"
        ? clamp(preview.delta, transomShiftRange?.min ?? preview.delta, transomShiftRange?.max ?? preview.delta)
        : clamp(preview.delta, panelShiftRange?.min ?? preview.delta, panelShiftRange?.max ?? preview.delta);
    const deltaPx = nextDeltaMm * scale;
    const ghostBounds =
      preview.mode === "row"
        ? { ...bounds, y: bounds.y + deltaPx }
        : { ...bounds, x: bounds.x + deltaPx };
    const isClamped = nextDeltaMm !== preview.delta;

    return (
      <g>
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          className="command-preview-shell target"
        />
        {preview.mode === "panel" && blockSelectionPreview ? (
          <PreviewBlockGhost
            x={ghostBounds.x}
            y={ghostBounds.y}
            width={ghostBounds.width}
            height={ghostBounds.height}
            panels={blockSelectionPreview.panels}
            tone="move"
            gap={mullionSize}
          />
        ) : (
          <rect
            x={ghostBounds.x}
            y={ghostBounds.y}
            width={ghostBounds.width}
            height={ghostBounds.height}
            className="command-preview-tile move"
          />
        )}
        <line
          x1={bounds.x + bounds.width / 2}
          y1={bounds.y + bounds.height / 2}
          x2={ghostBounds.x + ghostBounds.width / 2}
          y2={ghostBounds.y + ghostBounds.height / 2}
          className="command-preview-target-line"
        />
        <PreviewBadge
          x={ghostBounds.x + ghostBounds.width / 2}
          y={ghostBounds.y - 18}
          text={`${preview.mode === "row" ? "Move Row" : blockSelectionPreview ? `Move Blok ${blockSelectionPreview.panels.length}` : "Move Panel"} ${nextDeltaMm > 0 ? "+" : ""}${nextDeltaMm}${isClamped ? " limit" : ""}`}
        />
      </g>
    );
  }

  if (preview.type === "copy-series") {
    const bounds = preview.mode === "row" ? selectedRowBounds : blockSelectionPreview?.bounds ?? selectedBounds;
    if (!bounds) {
      return null;
    }

    const nextCount = Math.max(2, preview.count);

    return (
      <g>
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          className="command-preview-shell"
        />
        {preview.mode === "row"
          ? renderVerticalPreviewTiles(bounds, nextCount, mullionSize, "copy")
          : renderHorizontalPreviewTiles(bounds, nextCount, mullionSize, "copy")}
        <PreviewBadge
          x={bounds.x + bounds.width / 2}
          y={bounds.y - 18}
          text={
            preview.stepMm
              ? `Copy ${preview.mode === "row" ? "Row" : "Panel"} x${preview.count} / ${preview.stepMm}`
              : `Copy ${preview.mode === "row" ? "Row" : "Panel"} x${preview.count}`
          }
        />
      </g>
    );
  }

  if (preview.type === "mirror" && selectedRowBounds && rowPanels?.length) {
    const selectedRow = previewCanvasLayout.rows.find(
      (row) =>
        Math.abs(row.bounds.x - selectedRowBounds.x) < 0.1 &&
        Math.abs(row.bounds.y - selectedRowBounds.y) < 0.1 &&
        Math.abs(row.bounds.width - selectedRowBounds.width) < 0.1 &&
        Math.abs(row.bounds.height - selectedRowBounds.height) < 0.1
    );
    const mirroredPanels = selectedRow ? [...selectedRow.panels].reverse() : null;
    return (
      <g>
        <rect
          x={selectedRowBounds.x}
          y={selectedRowBounds.y}
          width={selectedRowBounds.width}
          height={selectedRowBounds.height}
          className="command-preview-shell"
        />
        {(mirroredPanels ?? []).map((panel, index) => {
          const sourcePanel = design.transoms[selectedRow?.transomIndex ?? -1]?.panels[panel.panelIndex];
          if (!sourcePanel) {
            return null;
          }
          return (
            <g key={`mirror-preview-${panel.panelId}-${index}`}>
              <rect
                x={panel.bounds.x}
                y={selectedRowBounds.y}
                width={panel.bounds.width}
                height={selectedRowBounds.height}
                className="command-preview-tile mirror"
              />
              <text
                x={panel.centerX}
                y={selectedRowBounds.y + 18}
                textAnchor="middle"
                className="command-preview-text"
              >
                {sourcePanel.label}
              </text>
            </g>
          );
        })}
        {selectedRow?.mullions.map((bar) => (
          <rect
            key={`mirror-preview-bar-${bar.transomId}-${bar.panelId}`}
            x={bar.rect.x}
            y={bar.rect.y}
            width={bar.rect.width}
            height={bar.rect.height}
            className="command-preview-tile mirror"
          />
        ))}
        <PreviewBadge
          x={selectedRowBounds.x + selectedRowBounds.width / 2}
          y={selectedRowBounds.y - 18}
          text="Mirror Preview"
        />
      </g>
    );
  }

  if (preview.type === "edge-adjust") {
    const bounds = preview.mode === "row" ? selectedRowBounds : blockSelectionPreview?.bounds ?? selectedBounds;
    if (!bounds) {
      return null;
    }

    const capacity =
      preview.mode === "row"
        ? getTransomEdgeCapacity(design, selectedTransomId, preview.edge as "top" | "bottom")
        : getPanelBlockEdgeCapacity(design, activePanelBlockRefs, preview.edge as "left" | "right");
    const requestedMm = Math.abs(Math.round(preview.delta));
    const maxAmount = capacity
      ? preview.operation === "trim"
        ? capacity.trimMaxMm
        : capacity.extendMaxMm
      : 0;
    const blocked = !capacity || maxAmount <= 0;
    const currentEdgeMm =
      preview.mode === "row"
        ? (() => {
            const metrics = getSelectedTransomMetrics(design, selectedTransomId);
            if (!metrics) {
              return null;
            }
            return preview.edge === "top" ? metrics.startMm : metrics.endMm;
          })()
        : (() => {
            const metrics = getPanelBlockMetrics(design, activePanelBlockRefs);
            if (!metrics) {
              return null;
            }
            return preview.edge === "left" ? metrics.startMm : metrics.endMm;
          })();
    const guideLock =
      blocked || currentEdgeMm === null
        ? null
        : getGuideLockedEdgeAdjustment(
            design.guides,
            preview.mode === "row" ? "horizontal" : "vertical",
            currentEdgeMm,
            requestedMm,
            maxAmount,
            preview.edge === "left" || preview.edge === "top"
              ? preview.operation === "trim"
                ? 1
                : -1
              : preview.operation === "trim"
                ? -1
                : 1
          );
    const appliedMm = blocked ? 0 : guideLock?.appliedMm ?? Math.min(requestedMm, maxAmount);
    const limited = !blocked && !guideLock && appliedMm < requestedMm;
    const extending = preview.operation === "extend";
    const axisCap =
      preview.edge === "left" || preview.edge === "right" ? bounds.width * 0.42 : bounds.height * 0.42;
    const requestedThickness = Math.min(axisCap, Math.max(14, requestedMm * scale));
    const appliedThickness = appliedMm > 0 ? Math.min(axisCap, Math.max(14, appliedMm * scale)) : 0;

    const buildEdgeRect = (thickness: number) =>
      preview.edge === "left"
        ? { x: extending ? bounds.x - thickness : bounds.x, y: bounds.y, width: thickness, height: bounds.height }
        : preview.edge === "right"
          ? {
              x: extending ? bounds.x + bounds.width : bounds.x + bounds.width - thickness,
              y: bounds.y,
              width: thickness,
              height: bounds.height
            }
          : preview.edge === "top"
            ? { x: bounds.x, y: extending ? bounds.y - thickness : bounds.y, width: bounds.width, height: thickness }
            : {
                x: bounds.x,
                y: extending ? bounds.y + bounds.height : bounds.y + bounds.height - thickness,
                width: bounds.width,
                height: thickness
              };

    const requestedRect = buildEdgeRect(requestedThickness);
    const appliedRect = appliedThickness > 0 ? buildEdgeRect(appliedThickness) : null;
    const guideLinePosition =
      guideLock && preview.mode === "row"
        ? frameRect.y + frameInset + guideLock.targetMm * scale
        : guideLock
          ? frameRect.x + frameInset + guideLock.targetMm * scale
          : null;

    return (
      <g>
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} className="command-preview-shell" />
        {guideLock && guideLinePosition !== null && (
          <line
            x1={preview.mode === "row" ? frameRect.x - 18 : guideLinePosition}
            y1={preview.mode === "row" ? guideLinePosition : frameRect.y - 18}
            x2={preview.mode === "row" ? frameRect.x + frameRect.width + 18 : guideLinePosition}
            y2={preview.mode === "row" ? guideLinePosition : frameRect.y + frameRect.height + 18}
            className="command-preview-guide-line success"
          />
        )}
        {(blocked || limited) && (
          <rect
            x={requestedRect.x}
            y={requestedRect.y}
            width={requestedRect.width}
            height={requestedRect.height}
            className="command-preview-slot invalid"
          />
        )}
        {appliedRect && (
          <rect
            x={appliedRect.x}
            y={appliedRect.y}
            width={appliedRect.width}
            height={appliedRect.height}
            className={`command-preview-tile ${blocked ? "error" : limited ? "warning" : guideLock ? "guide" : extending ? "copy" : "target"}`}
          />
        )}
        <PreviewBadge
          x={bounds.x + bounds.width / 2}
          y={bounds.y - 18}
          text={`${preview.operation === "trim" ? "Trim" : "Extend"} ${preview.edge} ${
            blocked
              ? " / Limit"
              : limited
                ? ` ${appliedMm} / ${requestedMm}`
                : guideLock
                  ? ` ${appliedMm} / Guide ${guideLock.guide.label}`
                  : ` ${requestedMm}`
          }`}
          tone={blocked ? "error" : limited ? "warning" : guideLock ? "success" : "default"}
        />
        {(blocked || limited || guideLock) && (
          <PreviewBadge
            x={bounds.x + bounds.width / 2}
            y={bounds.y + bounds.height + 18}
            text={
              guideLock
                ? `Guide kilit: ${guideLock.guide.label} / ${guideLock.deltaMm > 0 ? "+" : ""}${guideLock.deltaMm} mm`
                : blocked
                ? capacity?.blockedBy === "border"
                  ? "Oneri: dis sinir nedeniyle uygulanamaz"
                  : "Oneri: komsu elemanda pay yok"
                : `Oneri: max ${maxAmount} mm / ${capacity?.blockedBy === "border" ? "sinir" : "komsu"}`
            }
            tone={guideLock ? "success" : blocked ? "error" : "warning"}
          />
        )}
      </g>
    );
  }

  if (preview.type === "center") {
    const bounds = preview.mode === "row" ? selectedRowBounds : blockSelectionPreview?.bounds ?? selectedBounds;
    const deltaMm = preview.mode === "row" ? transomCenterDelta : panelCenterDelta;
    if (!bounds || deltaMm === null) {
      return null;
    }

    const shifted =
      preview.mode === "row"
        ? { x: bounds.x, y: bounds.y + deltaMm * scale, width: bounds.width, height: bounds.height }
        : { x: bounds.x + deltaMm * scale, y: bounds.y, width: bounds.width, height: bounds.height };

    return (
      <g>
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} className="command-preview-shell" />
        <rect x={shifted.x} y={shifted.y} width={shifted.width} height={shifted.height} className="command-preview-tile mirror" />
        <PreviewBadge
          x={shifted.x + shifted.width / 2}
          y={shifted.y - 18}
          text={`${preview.mode === "row" ? "Center Row" : "Center Block"} ${deltaMm > 0 ? "+" : ""}${deltaMm}`}
        />
      </g>
    );
  }

  if (preview.type === "copy-panel" && selectedBounds) {
    const segments = buildPreviewAxisSlices(selectedBounds.x, selectedBounds.width, 2, mullionSize);
    return (
      <g>
        <rect
          x={selectedBounds.x}
          y={selectedBounds.y}
          width={selectedBounds.width}
          height={selectedBounds.height}
          className="command-preview-shell"
        />
        {segments.slices.map((slice, index) => (
          <rect
            key={`copy-panel-slice-${index}`}
            x={slice.start}
            y={selectedBounds.y}
            width={slice.span}
            height={selectedBounds.height}
            className={`command-preview-tile ${((preview.side === "left" && index === 0) || (preview.side === "right" && index === 1)) ? "copy" : ""}`}
          />
        ))}
        {segments.bars.map((bar, index) => (
          <rect
            key={`copy-panel-bar-${index}`}
            x={bar.start}
            y={selectedBounds.y}
            width={bar.span}
            height={selectedBounds.height}
            className="command-preview-tile copy"
            opacity="0.48"
          />
        ))}
        <PreviewBadge
          x={selectedBounds.x + selectedBounds.width / 2}
          y={selectedBounds.y - 18}
          text={`Copy ${preview.side === "left" ? "Sol" : "Sag"}`}
        />
      </g>
    );
  }

  if (preview.type === "copy-row" && selectedRowBounds) {
    const segments = buildPreviewAxisSlices(selectedRowBounds.y, selectedRowBounds.height, 2, mullionSize);
    return (
      <g>
        <rect
          x={selectedRowBounds.x}
          y={selectedRowBounds.y}
          width={selectedRowBounds.width}
          height={selectedRowBounds.height}
          className="command-preview-shell"
        />
        {segments.slices.map((slice, index) => (
          <rect
            key={`copy-row-slice-${index}`}
            x={selectedRowBounds.x}
            y={slice.start}
            width={selectedRowBounds.width}
            height={slice.span}
            className={`command-preview-tile ${((preview.side === "top" && index === 0) || (preview.side === "bottom" && index === 1)) ? "copy" : ""}`}
          />
        ))}
        {segments.bars.map((bar, index) => (
          <rect
            key={`copy-row-bar-${index}`}
            x={selectedRowBounds.x}
            y={bar.start}
            width={selectedRowBounds.width}
            height={bar.span}
            className="command-preview-tile copy"
            opacity="0.48"
          />
        ))}
        <PreviewBadge
          x={selectedRowBounds.x + selectedRowBounds.width / 2}
          y={selectedRowBounds.y - 18}
          text={`Copy ${preview.side === "top" ? "Ust" : "Alt"}`}
        />
      </g>
    );
  }

  if (preview.type === "move") {
    const bounds =
      preview.mode === "row"
        ? selectedRowBounds
        : blockSelectionPreview?.bounds ?? selectedBounds;
    if (!bounds) {
      return null;
    }

    return (
      <g>
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          className="command-preview-shell target"
        />
        <PreviewBadge
          x={bounds.x + bounds.width / 2}
          y={bounds.y - 18}
          text={
            preview.mode === "row"
              ? "Move Satir"
              : blockSelectionPreview
                ? `Move Blok ${blockSelectionPreview.panels.length}`
                : "Move Panel"
          }
        />
      </g>
    );
  }

  if (preview.type === "offset-chain" && commandTarget) {
    if (commandTarget.type === "panel-width" && selectedBounds) {
      return (
        <g>
          {Array.from({ length: preview.count }, (_, index) => {
            const nextWidthPx = clamp(
              selectedBounds.width + preview.delta * scale * (index + 1),
              100 * scale,
              selectedRowBounds?.width ?? design.totalWidth * scale
            );
            const x = selectedBounds.x + nextWidthPx;
            return (
              <line
                key={`offset-chain-panel-${index}`}
                x1={x}
                y1={selectedBounds.y - 18}
                x2={x}
                y2={selectedBounds.y + selectedBounds.height + 18}
                className="command-preview-line"
              />
            );
          })}
          <PreviewBadge
            x={selectedBounds.x + selectedBounds.width / 2}
            y={selectedBounds.y - 18}
            text={`Offset ${preview.delta > 0 ? "+" : ""}${preview.delta} / ${preview.count}`}
          />
        </g>
      );
    }

    if (commandTarget.type === "transom-height" && selectedRowBounds) {
      return (
        <g>
          {Array.from({ length: preview.count }, (_, index) => {
            const nextHeightPx = clamp(
              selectedRowBounds.height + preview.delta * scale * (index + 1),
              150 * scale,
              design.totalHeight * scale
            );
            const y = selectedRowBounds.y + nextHeightPx;
            return (
              <line
                key={`offset-chain-row-${index}`}
                x1={selectedRowBounds.x - 18}
                y1={y}
                x2={selectedRowBounds.x + selectedRowBounds.width + 18}
                y2={y}
                className="command-preview-line"
              />
            );
          })}
          <PreviewBadge
            x={selectedRowBounds.x + selectedRowBounds.width / 2}
            y={selectedRowBounds.y - 18}
            text={`Offset ${preview.delta > 0 ? "+" : ""}${preview.delta} / ${preview.count}`}
          />
        </g>
      );
    }
  }

  if (preview.type === "offset" && commandTarget) {
    if (commandTarget.type === "panel-width" && selectedBounds) {
      const nextWidthPx = clamp(selectedBounds.width + preview.delta * scale, 100 * scale, selectedRowBounds?.width ?? design.totalWidth * scale);
      const x = selectedBounds.x + nextWidthPx;
      return (
        <g>
          <line
            x1={x}
            y1={selectedBounds.y - 18}
            x2={x}
            y2={selectedBounds.y + selectedBounds.height + 18}
            className="command-preview-line"
          />
          <PreviewBadge
            x={x}
            y={selectedBounds.y - 18}
            text={`Offset ${preview.delta > 0 ? "+" : ""}${preview.delta}`}
          />
        </g>
      );
    }

    if (commandTarget.type === "transom-height" && selectedRowBounds) {
      const nextHeightPx = clamp(selectedRowBounds.height + preview.delta * scale, 150 * scale, design.totalHeight * scale);
      const y = selectedRowBounds.y + nextHeightPx;
      return (
        <g>
          <line
            x1={selectedRowBounds.x - 18}
            y1={y}
            x2={selectedRowBounds.x + selectedRowBounds.width + 18}
            y2={y}
            className="command-preview-line"
          />
          <PreviewBadge
            x={selectedRowBounds.x + selectedRowBounds.width / 2}
            y={y - 18}
            text={`Offset ${preview.delta > 0 ? "+" : ""}${preview.delta}`}
          />
        </g>
      );
    }

    if (commandTarget.type === "frame-thickness") {
      const nextInset = clamp(frameInset + preview.delta * scale, 14, Math.min(frameRect.width, frameRect.height) / 4);
      return (
        <g>
          <rect
            x={frameRect.x + nextInset}
            y={frameRect.y + nextInset}
            width={Math.max(24, frameRect.width - nextInset * 2)}
            height={Math.max(24, frameRect.height - nextInset * 2)}
            className="command-preview-shell frame"
          />
          <PreviewBadge
            x={frameRect.x + frameRect.width / 2}
            y={frameRect.y + nextInset - 16}
            text={`Kasa Offset ${preview.delta > 0 ? "+" : ""}${preview.delta}`}
          />
        </g>
      );
    }

    if (commandTarget.type === "mullion-thickness" && selectedObject) {
      if (selectedObject.type === "mullion" && selectedBounds) {
        const x = selectedBounds.x + selectedBounds.width + mullionSize / 2;
        const nextWidth = clamp(mullionSize + preview.delta * scale, 10, 64);
        return (
          <g>
            <rect
              x={x - nextWidth / 2}
              y={selectedBounds.y}
              width={nextWidth}
              height={selectedBounds.height}
              className="command-preview-shell mullion"
            />
            <PreviewBadge x={x} y={selectedBounds.y - 18} text={`Kayit ${preview.delta > 0 ? "+" : ""}${preview.delta}`} />
          </g>
        );
      }
      if (selectedObject.type === "transom-bar" && selectedRowBounds) {
        const y = selectedRowBounds.y + selectedRowBounds.height + mullionSize / 2;
        const nextHeight = clamp(mullionSize + preview.delta * scale, 10, 64);
        return (
          <g>
            <rect
              x={selectedRowBounds.x}
              y={y - nextHeight / 2}
              width={selectedRowBounds.width}
              height={nextHeight}
              className="command-preview-shell mullion"
            />
            <PreviewBadge
              x={selectedRowBounds.x + selectedRowBounds.width / 2}
              y={y - 18}
              text={`Kayit ${preview.delta > 0 ? "+" : ""}${preview.delta}`}
            />
          </g>
        );
      }
    }
  }

  return null;
}

function resolvePlacementRepeatedSpan(
  sourceSpanMm: number,
  availableSpanMm: number,
  count: number,
  minimumSpanMm: number,
  stepMm?: number
) {
  const nextCount = Math.max(1, Math.round(count));
  const maxPerCopy = Math.floor(availableSpanMm / nextCount);
  if (maxPerCopy < minimumSpanMm) {
    return null;
  }

  const normalizedStep = stepMm && stepMm > 1 ? Math.round(stepMm) : null;
  let perCopy = Math.min(sourceSpanMm, maxPerCopy);
  if (normalizedStep) {
    perCopy = Math.floor(perCopy / normalizedStep) * normalizedStep;
  }

  perCopy = Math.max(minimumSpanMm, perCopy);
  while (perCopy * nextCount > availableSpanMm && perCopy > minimumSpanMm) {
    perCopy -= normalizedStep ?? 1;
  }

  if (perCopy < minimumSpanMm || perCopy * nextCount > availableSpanMm) {
    return null;
  }

  return perCopy;
}

type PlacementFitAnalysis = {
  availableSpanMm: number;
  insertedSpanMm: number;
  totalInsertedSpanMm: number;
  scaled: boolean;
  fitRatio: number;
};

function analyzePanelPlacementFit(
  design: PvcDesign,
  targetTransomId: string,
  targetPanelId: string,
  sourceSpanMm: number,
  repeatCount: number,
  minimumSpanMm: number,
  stepMm?: number
): PlacementFitAnalysis | null {
  const transom = design.transoms.find((item) => item.id === targetTransomId);
  const targetPanel = transom?.panels.find((item) => item.id === targetPanelId);
  if (!targetPanel) {
    return null;
  }

  const availableSpanMm = Math.max(0, targetPanel.width - 100);
  if (availableSpanMm < minimumSpanMm) {
    return null;
  }

  if (repeatCount <= 1) {
    const insertedSpanMm = Math.max(minimumSpanMm, Math.min(sourceSpanMm, availableSpanMm));
    return {
      availableSpanMm,
      insertedSpanMm,
      totalInsertedSpanMm: insertedSpanMm,
      scaled: insertedSpanMm + 0.5 < sourceSpanMm,
      fitRatio: sourceSpanMm > 0 ? insertedSpanMm / sourceSpanMm : 1
    };
  }

  const perCopySpanMm = resolvePlacementRepeatedSpan(sourceSpanMm, availableSpanMm, repeatCount, minimumSpanMm, stepMm);
  if (!perCopySpanMm) {
    return null;
  }

  return {
    availableSpanMm,
    insertedSpanMm: perCopySpanMm,
    totalInsertedSpanMm: perCopySpanMm * repeatCount,
    scaled: perCopySpanMm + 0.5 < sourceSpanMm,
    fitRatio: sourceSpanMm > 0 ? perCopySpanMm / sourceSpanMm : 1
  };
}

function analyzeRowPlacementFit(
  design: PvcDesign,
  targetTransomId: string,
  sourceSpanMm: number,
  repeatCount: number,
  stepMm?: number
): PlacementFitAnalysis | null {
  const targetTransom = design.transoms.find((item) => item.id === targetTransomId);
  if (!targetTransom) {
    return null;
  }

  const availableSpanMm = Math.max(0, targetTransom.height - 150);
  if (availableSpanMm < 150) {
    return null;
  }

  if (repeatCount <= 1) {
    const insertedSpanMm = Math.max(150, Math.min(sourceSpanMm, availableSpanMm));
    return {
      availableSpanMm,
      insertedSpanMm,
      totalInsertedSpanMm: insertedSpanMm,
      scaled: insertedSpanMm + 0.5 < sourceSpanMm,
      fitRatio: sourceSpanMm > 0 ? insertedSpanMm / sourceSpanMm : 1
    };
  }

  const perCopySpanMm = resolvePlacementRepeatedSpan(sourceSpanMm, availableSpanMm, repeatCount, 150, stepMm);
  if (!perCopySpanMm) {
    return null;
  }

  return {
    availableSpanMm,
    insertedSpanMm: perCopySpanMm,
    totalInsertedSpanMm: perCopySpanMm * repeatCount,
    scaled: perCopySpanMm + 0.5 < sourceSpanMm,
    fitRatio: sourceSpanMm > 0 ? perCopySpanMm / sourceSpanMm : 1
  };
}

function findAlternativePanelPlacement(
  design: PvcDesign,
  sourceSpanMm: number,
  repeatCount: number,
  minimumSpanMm: number,
  stepMm: number | undefined,
  excludeKey?: string
): { label: string; fitRatio: number; scaled: boolean; transomId: string; panelId: string } | null {
  let best: { label: string; fitRatio: number; scaled: boolean; transomId: string; panelId: string } | null = null;

  design.transoms.forEach((transom, rowIndex) => {
    transom.panels.forEach((panel, panelIndex) => {
      const key = `${transom.id}:${panel.id}`;
      if (key === excludeKey) {
        return;
      }

      const fit = analyzePanelPlacementFit(design, transom.id, panel.id, sourceSpanMm, repeatCount, minimumSpanMm, stepMm);
      if (!fit) {
        return;
      }

      const candidate = {
        label: `${rowIndex + 1}.${panelIndex + 1}${fit.scaled ? ` / %${Math.round(fit.fitRatio * 100)} fit` : " / tam"}`,
        fitRatio: fit.fitRatio,
        scaled: fit.scaled,
        transomId: transom.id,
        panelId: panel.id
      };

      if (!best || (best.scaled && !candidate.scaled) || (best.scaled === candidate.scaled && candidate.fitRatio > best.fitRatio)) {
        best = candidate;
      }
    });
  });

  return best;
}

function findAlternativeRowPlacement(
  design: PvcDesign,
  sourceSpanMm: number,
  repeatCount: number,
  stepMm: number | undefined,
  excludeTransomId?: string
): { label: string; fitRatio: number; scaled: boolean; transomId: string } | null {
  let best: { label: string; fitRatio: number; scaled: boolean; transomId: string } | null = null;

  design.transoms.forEach((transom, rowIndex) => {
    if (transom.id === excludeTransomId) {
      return;
    }

    const fit = analyzeRowPlacementFit(design, transom.id, sourceSpanMm, repeatCount, stepMm);
    if (!fit) {
      return;
    }

    const candidate = {
      label: `Satir ${rowIndex + 1}${fit.scaled ? ` / %${Math.round(fit.fitRatio * 100)} fit` : " / tam"}`,
      fitRatio: fit.fitRatio,
      scaled: fit.scaled,
      transomId: transom.id
    };

    if (!best || (best.scaled && !candidate.scaled) || (best.scaled === candidate.scaled && candidate.fitRatio > best.fitRatio)) {
      best = candidate;
    }
  });

  return best;
}

function PlacementPreviewOverlay({
  placement,
  target,
  cursorPoint,
  canvasLayout,
  selectedBounds,
  selectedRowBounds,
  blockSelectionPreview,
  placementTelemetry,
  design,
  sourcePanelWidthMm,
  sourceRowHeightMm,
  mullionSize,
  scale
}: {
  placement: InteractivePlacement;
  target: InteractiveCanvasTarget | null;
  cursorPoint: { x: number; y: number } | null;
  canvasLayout: CanvasLayout;
  selectedBounds: { x: number; y: number; width: number; height: number } | null;
  selectedRowBounds: { x: number; y: number; width: number; height: number } | null;
  blockSelectionPreview: BlockSelectionPreview | null;
  placementTelemetry: PlacementTelemetry | null;
  design: PvcDesign;
  sourcePanelWidthMm: number | null;
  sourceRowHeightMm: number | null;
  mullionSize: number;
  scale: number;
}) {
  if (!placement) {
    return null;
  }

  if ((placement.type === "copy" || placement.type === "move") && placement.phase === "base") {
    const anchorSource =
      placement.mode === "panel"
        ? blockSelectionPreview?.bounds ?? selectedBounds
        : selectedRowBounds;
    if (!anchorSource) {
      return null;
    }

    return (
      <g>
        <rect
          x={anchorSource.x}
          y={anchorSource.y}
          width={anchorSource.width}
          height={anchorSource.height}
          className="command-preview-shell target"
        />
        <PreviewBadge
          x={anchorSource.x + anchorSource.width / 2}
          y={anchorSource.y - 18}
          text={placement.type === "copy" ? "Kaynak noktayi sec" : "Tasinacak referansi sec"}
        />
        {cursorPoint && (
          <circle cx={cursorPoint.x} cy={cursorPoint.y} r="5.5" className="command-preview-anchor" />
        )}
      </g>
    );
  }

  if ((placement.type === "copy" || placement.type === "move") && placement.mode === "panel" && selectedBounds) {
    const previewTarget = target?.kind === "panel" ? target : null;
    const previewSide = previewTarget?.side ?? null;
    const targetBounds = previewTarget?.bounds ?? selectedBounds;
    const repeatCount = placement.type === "copy" ? Math.max(1, placement.repeatCount ?? 1) : 1;
    const previewGap = Math.max(0, mullionSize);
    const sourceSpanMm = blockSelectionPreview?.totalWidthMm ?? sourcePanelWidthMm ?? 0;
    const minimumSpanMm = blockSelectionPreview ? blockSelectionPreview.panels.length * 100 : 100;
    const fit = previewTarget
      ? analyzePanelPlacementFit(
          design,
          previewTarget.transomId,
          previewTarget.panelId,
          sourceSpanMm,
          repeatCount,
          minimumSpanMm,
          placement.stepMm
        )
      : null;
    const activeTotalWidth = fit ? Math.max(24, fit.totalInsertedSpanMm * scale) : targetBounds.width / 2;
    const activeWidth = Math.max(
      24,
      repeatCount > 0 ? (activeTotalWidth - previewGap * Math.max(0, repeatCount - 1)) / repeatCount : activeTotalWidth
    );
    const activeX =
      previewSide === "right"
        ? targetBounds.x + targetBounds.width - activeTotalWidth
        : targetBounds.x;
    const didScale = fit?.scaled ?? false;
    const fitFailed = Boolean(previewTarget && !fit && sourceSpanMm > 0);
    const alternative =
      (didScale || fitFailed) && previewTarget
        ? findAlternativePanelPlacement(
            design,
            sourceSpanMm,
            repeatCount,
            minimumSpanMm,
            placement.stepMm,
            `${previewTarget.transomId}:${previewTarget.panelId}`
          )
        : null;
    const alternativeBounds = alternative
      ? getCanvasPanelLayout(canvasLayout, alternative.transomId, alternative.panelId)?.bounds ?? null
      : null;

    return (
      <g>
        <rect
          x={targetBounds.x}
          y={targetBounds.y}
          width={targetBounds.width}
          height={targetBounds.height}
          className="command-preview-shell target"
        />
        {previewSide && (
          <>
            <rect
              x={previewSide === "right" ? targetBounds.x + targetBounds.width - Math.max(14, targetBounds.width * 0.08) : targetBounds.x}
              y={targetBounds.y}
              width={Math.max(14, targetBounds.width * 0.08)}
              height={targetBounds.height}
              className="command-preview-slot"
            />
            {blockSelectionPreview
              ? Array.from({ length: repeatCount }, (_, index) => {
                  const instanceX =
                    previewSide === "right"
                      ? activeX + (activeWidth + previewGap) * index
                      : activeX + (activeWidth + previewGap) * index;
                  return (
                    <PreviewBlockGhost
                      key={`placement-block-${index}`}
                      x={instanceX}
                      y={targetBounds.y}
                      width={activeWidth}
                      height={targetBounds.height}
                      panels={blockSelectionPreview.panels}
                      tone={placement.type === "copy" ? "copy" : "move"}
                      gap={previewGap}
                    />
                  );
                })
              : renderHorizontalPreviewTiles(
                  {
                    x: activeX,
                    y: targetBounds.y,
                    width: activeTotalWidth,
                    height: targetBounds.height
                  },
                  repeatCount,
                  previewGap,
                  placement.type === "copy" ? "copy" : "move"
                )}
            <PreviewBadge
              x={targetBounds.x + targetBounds.width / 2}
              y={targetBounds.y - 18}
              text={`${placement.type === "copy" ? "Copy" : "Move"} ${blockSelectionPreview ? "Blok" : "Hedef"} ${repeatCount > 1 ? `x${repeatCount} ` : ""}${previewSide === "left" ? "Sol" : "Sag"}${fitFailed ? " / Limit" : didScale ? ` / Fit %${Math.round((fit?.fitRatio ?? 1) * 100)}` : ""}${placementTelemetry?.axisLock ? ` / ${placementTelemetry.axisLock.toUpperCase()} kilit` : ""}`}
            />
            {(didScale || fitFailed) && (
              <PreviewBadge
                x={targetBounds.x + targetBounds.width / 2}
                y={targetBounds.y + targetBounds.height + 18}
                text={alternative ? `Oneri: ${alternative.label}` : "Oneri: daha genis hedef panel sec"}
                tone="warning"
              />
            )}
            {alternative && alternativeBounds && (
              <>
                <rect
                  x={alternativeBounds.x}
                  y={alternativeBounds.y}
                  width={alternativeBounds.width}
                  height={alternativeBounds.height}
                  className="command-preview-shell suggestion"
                />
                <PreviewBadge
                  x={alternativeBounds.x + alternativeBounds.width / 2}
                  y={alternativeBounds.y - 18}
                  text={`Auto Slot: ${alternative.label}`}
                  tone="success"
                />
              </>
            )}
          </>
        )}
        {!previewSide && (
          <PreviewBadge
            x={(blockSelectionPreview?.bounds ?? selectedBounds).x + (blockSelectionPreview?.bounds ?? selectedBounds).width / 2}
            y={(blockSelectionPreview?.bounds ?? selectedBounds).y - 18}
            text={placement.type === "copy" ? "Hedef panel uzerine git" : "Ayni satirda hedef panel sec"}
          />
        )}
        {cursorPoint && placement.basePoint && (
          <>
            {placementTelemetry && (
              <PlacementReferenceGuides
                basePoint={placement.basePoint}
                telemetry={placementTelemetry}
              />
            )}
            <line
              x1={placement.basePoint.x}
              y1={placement.basePoint.y}
              x2={cursorPoint.x}
              y2={cursorPoint.y}
              className="command-preview-target-line"
            />
            <circle cx={cursorPoint.x} cy={cursorPoint.y} r="5.5" className="command-preview-anchor" />
          </>
        )}
      </g>
    );
  }

  if ((placement.type === "copy" || placement.type === "move") && placement.mode === "row" && selectedRowBounds) {
    const previewTarget = target?.kind === "row" ? target : null;
    const previewSide = previewTarget?.side ?? null;
    const targetBounds = previewTarget?.bounds ?? selectedRowBounds;
    const repeatCount = placement.type === "copy" ? Math.max(1, placement.repeatCount ?? 1) : 1;
    const previewGap = Math.max(0, mullionSize);
    const sourceSpanMm = sourceRowHeightMm ?? 0;
    const fit = previewTarget
      ? analyzeRowPlacementFit(design, previewTarget.transomId, sourceSpanMm, repeatCount, placement.stepMm)
      : null;
    const activeTotalHeight = fit ? Math.max(32, fit.totalInsertedSpanMm * scale) : targetBounds.height / 2;
    const activeHeight = Math.max(
      32,
      repeatCount > 0 ? (activeTotalHeight - previewGap * Math.max(0, repeatCount - 1)) / repeatCount : activeTotalHeight
    );
    const activeY = previewSide === "bottom" ? targetBounds.y + targetBounds.height - activeTotalHeight : targetBounds.y;
    const didScale = fit?.scaled ?? false;
    const fitFailed = Boolean(previewTarget && !fit && sourceSpanMm > 0);
    const alternative =
      (didScale || fitFailed) && previewTarget
        ? findAlternativeRowPlacement(design, sourceSpanMm, repeatCount, placement.stepMm, previewTarget.transomId)
        : null;
    const alternativeBounds = alternative
      ? getCanvasRowLayout(canvasLayout, alternative.transomId)?.bounds ?? null
      : null;

    return (
      <g>
        <rect
          x={targetBounds.x}
          y={targetBounds.y}
          width={targetBounds.width}
          height={targetBounds.height}
          className="command-preview-shell target"
        />
        {previewSide && (
          <>
            <rect
              x={targetBounds.x}
              y={previewSide === "bottom" ? targetBounds.y + targetBounds.height - Math.max(14, targetBounds.height * 0.18) : targetBounds.y}
              width={targetBounds.width}
              height={Math.max(14, targetBounds.height * 0.18)}
              className="command-preview-slot"
            />
            {renderVerticalPreviewTiles(
              {
                x: targetBounds.x,
                y: activeY,
                width: targetBounds.width,
                height: activeTotalHeight
              },
              repeatCount,
              previewGap,
              placement.type === "copy" ? "copy" : "move"
            )}
            <PreviewBadge
              x={targetBounds.x + targetBounds.width / 2}
              y={targetBounds.y - 18}
              text={`${placement.type === "copy" ? "Copy" : "Move"} ${repeatCount > 1 ? `x${repeatCount} ` : ""}${previewSide === "top" ? "Ust" : "Alt"}${fitFailed ? " / Limit" : didScale ? ` / Fit %${Math.round((fit?.fitRatio ?? 1) * 100)}` : ""}${placementTelemetry?.axisLock ? ` / ${placementTelemetry.axisLock.toUpperCase()} kilit` : ""}`}
            />
            {(didScale || fitFailed) && (
              <PreviewBadge
                x={targetBounds.x + targetBounds.width / 2}
                y={targetBounds.y + targetBounds.height + 18}
                text={alternative ? `Oneri: ${alternative.label}` : "Oneri: daha yuksek hedef satir sec"}
                tone="warning"
              />
            )}
            {alternative && alternativeBounds && (
              <>
                <rect
                  x={alternativeBounds.x}
                  y={alternativeBounds.y}
                  width={alternativeBounds.width}
                  height={alternativeBounds.height}
                  className="command-preview-shell suggestion"
                />
                <PreviewBadge
                  x={alternativeBounds.x + alternativeBounds.width / 2}
                  y={alternativeBounds.y - 18}
                  text={`Auto Slot: ${alternative.label}`}
                  tone="success"
                />
              </>
            )}
          </>
        )}
        {!previewSide && (
          <PreviewBadge
            x={selectedRowBounds.x + selectedRowBounds.width / 2}
            y={selectedRowBounds.y - 18}
            text={placement.type === "copy" ? "Hedef satir uzerine git" : "Hedef satiri sec"}
          />
        )}
        {cursorPoint && placement.basePoint && (
          <>
            {placementTelemetry && (
              <PlacementReferenceGuides
                basePoint={placement.basePoint}
                telemetry={placementTelemetry}
              />
            )}
            <line
              x1={placement.basePoint.x}
              y1={placement.basePoint.y}
              x2={cursorPoint.x}
              y2={cursorPoint.y}
              className="command-preview-target-line"
            />
            <circle cx={cursorPoint.x} cy={cursorPoint.y} r="5.5" className="command-preview-anchor" />
          </>
        )}
      </g>
    );
  }

  if (placement.type === "mirror" && target?.kind === "mirror-axis") {
    return (
      <g>
        <line
          x1={target.line.x1}
          y1={target.line.y1}
          x2={target.line.x2}
          y2={target.line.y2}
          className="command-preview-target-line"
        />
        <PreviewBadge
          x={(target.line.x1 + target.line.x2) / 2}
          y={(target.line.y1 + target.line.y2) / 2 - 18}
          text={`Mirror ${target.axis === "vertical" ? "Dikey" : "Yatay"} Eksen`}
        />
      </g>
    );
  }

  if (placement.type === "offset" && target?.kind === "offset-target") {
    const isVertical = Math.abs(target.line.x1 - target.line.x2) < 0.01;
    const lineCount = Math.max(1, placement.count ?? 1);
    const limitMm = isVertical ? design.totalWidth : design.totalHeight;
    const guideBaseMm = target.guideMeta?.positionMm ?? 0;
    const validCount = Array.from({ length: lineCount }, (_, index) => guideBaseMm + placement.delta * (index + 1)).filter(
      (value) => value >= 0 && value <= limitMm
    ).length;

    return (
      <g>
        <line
          x1={target.line.x1}
          y1={target.line.y1}
          x2={target.line.x2}
          y2={target.line.y2}
          className="command-preview-target-line"
        />
        {Array.from({ length: lineCount }, (_, index) => {
          const deltaPx = placement.delta * scale * (index + 1);
          const ghostLine = isVertical
            ? {
                x1: target.line.x1 + deltaPx,
                y1: target.line.y1,
                x2: target.line.x2 + deltaPx,
                y2: target.line.y2
              }
            : {
                x1: target.line.x1,
                y1: target.line.y1 + deltaPx,
                x2: target.line.x2,
                y2: target.line.y2 + deltaPx
              };
          return (
            <line
              key={`offset-preview-${index}`}
              x1={ghostLine.x1}
              y1={ghostLine.y1}
              x2={ghostLine.x2}
              y2={ghostLine.y2}
              className="command-preview-line"
            />
          );
        })}
        <PreviewBadge
          x={(target.line.x1 + target.line.x2) / 2}
          y={(target.line.y1 + target.line.y2) / 2 - 18}
          text={`Offset Hedef ${placement.delta > 0 ? "+" : ""}${placement.delta}${lineCount > 1 ? ` x${lineCount}` : ""}${validCount < lineCount ? ` / ${validCount} gecerli` : ""}`}
        />
        {validCount < lineCount && (
          <PreviewBadge
            x={(target.line.x1 + target.line.x2) / 2}
            y={(target.line.y1 + target.line.y2) / 2 + 18}
            text="Oneri: delta veya adet azalt"
          />
        )}
      </g>
    );
  }

  return null;
}

function PreviewBadge({
  x,
  y,
  text,
  tone = "default"
}: {
  x: number;
  y: number;
  text: string;
  tone?: "default" | "warning" | "error" | "success";
}) {
  const width = Math.max(118, text.length * 6.8 + 26);

  return (
    <g transform={`translate(${x - width / 2} ${y - 14})`}>
      <rect
        width={width}
        height="24"
        rx="10"
        className={`command-preview-badge ${tone !== "default" ? tone : ""}`}
      />
      <text
        x={width / 2}
        y="16"
        textAnchor="middle"
        className={`command-preview-badge-text ${tone !== "default" ? tone : ""}`}
      >
        {text}
      </text>
    </g>
  );
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed || "--";
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 3))}...`;
}

function HardwareOverlay({
  panel,
  sashRect,
  quality,
  technical = false
}: {
  panel: PanelDefinition;
  sashRect: { x: number; y: number; width: number; height: number };
  quality: HardwareQuality;
  technical?: boolean;
}) {
  if (panel.openingType === "fixed") {
    return null;
  }

  const hingeCount = hardwareCatalog[quality].hingeCount;
  const toneClass = technical ? "technical" : "studio";
  const handleSide =
    panel.openingType === "turn-right" || panel.openingType === "tilt-turn-right"
      ? "right"
      : panel.openingType === "turn-left"
        ? "left"
        : "center";
  const hingeSide = handleSide === "right" ? "left" : handleSide === "left" ? "right" : "left";
  const handleX =
    handleSide === "right"
      ? sashRect.x + sashRect.width - 8
      : handleSide === "left"
        ? sashRect.x + 8
        : sashRect.x + sashRect.width / 2;
  const handleY = sashRect.y + sashRect.height / 2;
  const hingeX = hingeSide === "left" ? sashRect.x + 6 : sashRect.x + sashRect.width - 6;
  const hingeSpacing = sashRect.height / (hingeCount + 1);

  return (
    <g>
      {Array.from({ length: hingeCount }, (_, index) => (
        <circle
          key={`hinge-${index}`}
          cx={hingeX}
          cy={sashRect.y + hingeSpacing * (index + 1)}
          r="3.5"
          className={`hardware-hinge ${toneClass}`}
        />
      ))}
      {panel.openingType === "sliding" ? (
        <>
          <rect
            x={sashRect.x + sashRect.width / 2 - 6}
            y={sashRect.y + sashRect.height / 2 - 16}
            width="12"
            height="32"
            rx="4"
            className={`hardware-handle ${toneClass}`}
          />
          <line
            x1={sashRect.x + 12}
            y1={sashRect.y + sashRect.height - 10}
            x2={sashRect.x + sashRect.width - 12}
            y2={sashRect.y + sashRect.height - 10}
            className={`hardware-rail ${toneClass}`}
          />
        </>
      ) : (
        <>
          <rect
            x={handleX - 3}
            y={handleY - 14}
            width="6"
            height="28"
            rx="3"
            className={`hardware-handle ${toneClass}`}
          />
          <rect
            x={(handleSide === "right" ? handleX - 8 : handleX + 2)}
            y={handleY - 9}
            width="6"
            height="18"
            rx="2"
            className={`hardware-lock ${toneClass}`}
          />
        </>
      )}
      {panel.openingType === "tilt-turn-right" && (
        <path
          d={`M ${sashRect.x + 18} ${sashRect.y + 10} L ${sashRect.x + sashRect.width - 18} ${
            sashRect.y + 10
          } L ${sashRect.x + sashRect.width / 2} ${sashRect.y + 2} Z`}
          className={`hardware-tilt-mark ${toneClass}`}
        />
      )}
    </g>
  );
}

function getSelectedBounds(
  canvasLayout: CanvasLayout,
  selected: { transomId: string; panelId: string } | null,
) {
  if (!selected) {
    return null;
  }

  return getCanvasPanelLayout(canvasLayout, selected.transomId, selected.panelId)?.bounds ?? null;
}

function resolveInteractiveCanvasTarget(
  placement: InteractivePlacement,
  worldPoint: { x: number; y: number },
  design: PvcDesign,
  canvasLayout: CanvasLayout,
  scale: number,
  selectedBounds: { x: number; y: number; width: number; height: number } | null,
  selectedRowBounds: { x: number; y: number; width: number; height: number } | null
): InteractiveCanvasTarget | null {
  if (!placement) {
    return null;
  }

  if (placement.type === "copy" || placement.type === "move") {
    if (placement.phase === "base") {
      return null;
    }

    if (placement.mode === "panel") {
      const preferredSide =
        placement.basePoint && Math.abs(worldPoint.x - placement.basePoint.x) > 0.01
          ? worldPoint.x >= placement.basePoint.x
            ? "right"
            : "left"
          : null;
      const panelHit = findPanelPlacementTargetAtPoint(canvasLayout, worldPoint, preferredSide);
      if (!panelHit) {
        return null;
      }

      return {
        kind: "panel",
        transomId: panelHit.transomId,
        panelId: panelHit.panelId,
        side: panelHit.side,
        bounds: panelHit.bounds
      };
    }

    const preferredSide =
      placement.basePoint && Math.abs(worldPoint.y - placement.basePoint.y) > 0.01
        ? worldPoint.y >= placement.basePoint.y
          ? "bottom"
          : "top"
        : null;
    const rowHit = findRowPlacementTargetAtPoint(canvasLayout, worldPoint, preferredSide);
    if (!rowHit) {
      return null;
    }

    return {
      kind: "row",
      transomId: rowHit.transomId,
      side: rowHit.side,
      bounds: rowHit.bounds
    };
  }

  if (placement.type === "mirror") {
    const { outerRect } = canvasLayout;
    const verticalLine =
      selectedRowBounds && {
        x1: selectedRowBounds.x + selectedRowBounds.width / 2,
        y1: selectedRowBounds.y - 18,
        x2: selectedRowBounds.x + selectedRowBounds.width / 2,
        y2: selectedRowBounds.y + selectedRowBounds.height + 18
      };
    const horizontalLine = {
      x1: outerRect.x - 18,
      y1: outerRect.y + outerRect.height / 2,
      x2: outerRect.x + outerRect.width + 18,
      y2: outerRect.y + outerRect.height / 2
    };

    const candidates = [
      verticalLine && {
        axis: "vertical" as const,
        line: verticalLine,
        distance: Math.abs(worldPoint.x - verticalLine.x1)
      },
      {
        axis: "horizontal" as const,
        line: horizontalLine,
        distance: Math.abs(worldPoint.y - horizontalLine.y1)
      }
    ].filter(Boolean) as Array<{
      axis: "vertical" | "horizontal";
      line: { x1: number; y1: number; x2: number; y2: number };
      distance: number;
    }>;

    const target = candidates.sort((a, b) => a.distance - b.distance)[0];
    return target
      ? {
          kind: "mirror-axis",
          axis: target.axis,
          line: target.line
        }
      : null;
  }

  if (placement.type === "offset") {
    const reference = findOffsetReferenceAtPoint(design, worldPoint, canvasLayout, scale);

    if (!reference) {
      return null;
    }

    return {
      kind: "offset-target",
      target: reference.target,
      line: reference.line,
      guideMeta: reference.guideMeta
    };
  }

  return null;
}

function findPanelPlacementTargetAtPoint(
  canvasLayout: CanvasLayout,
  worldPoint: { x: number; y: number },
  preferredSide: "left" | "right" | null
) {
  const slotWidth = Math.max(24, canvasLayout.mullionSize * 0.72);
  const candidates: Array<{
    transomId: string;
    panelId: string;
    side: "left" | "right";
    bounds: { x: number; y: number; width: number; height: number };
    distance: number;
  }> = [];

  for (const row of canvasLayout.rows) {
    for (const panel of row.panels) {
      const bounds = panel.bounds;
      const leftSlot = { x: bounds.x - slotWidth, y: bounds.y - 6, width: slotWidth, height: bounds.height + 12 };
      const rightSlot = { x: bounds.x + bounds.width, y: bounds.y - 6, width: slotWidth, height: bounds.height + 12 };

      if (pointInRect(worldPoint, bounds)) {
        candidates.push({
          transomId: panel.transomId,
          panelId: panel.panelId,
          side: preferredSide ?? (worldPoint.x <= bounds.x + bounds.width / 2 ? "left" : "right"),
          bounds,
          distance: 0
        });
      } else {
        if (pointInRect(worldPoint, leftSlot)) {
          candidates.push({
            transomId: panel.transomId,
            panelId: panel.panelId,
            side: "left",
            bounds,
            distance: Math.abs(worldPoint.x - (leftSlot.x + leftSlot.width / 2))
          });
        }
        if (pointInRect(worldPoint, rightSlot)) {
          candidates.push({
            transomId: panel.transomId,
            panelId: panel.panelId,
            side: "right",
            bounds,
            distance: Math.abs(worldPoint.x - (rightSlot.x + rightSlot.width / 2))
          });
        }
      }
    }
  }

  return candidates.sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function findRowPlacementTargetAtPoint(
  canvasLayout: CanvasLayout,
  worldPoint: { x: number; y: number },
  preferredSide: "top" | "bottom" | null
) {
  const slotHeight = Math.max(24, canvasLayout.mullionSize * 0.72);
  const candidates: Array<{
    transomId: string;
    side: "top" | "bottom";
    bounds: { x: number; y: number; width: number; height: number };
    distance: number;
  }> = [];

  for (const row of canvasLayout.rows) {
    const bounds = {
      x: row.bounds.x - 6,
      y: row.bounds.y,
      width: row.bounds.width + 12,
      height: row.bounds.height
    };
    const topSlot = { x: bounds.x, y: bounds.y - slotHeight, width: bounds.width, height: slotHeight };
    const bottomSlot = { x: bounds.x, y: bounds.y + bounds.height, width: bounds.width, height: slotHeight };

    if (pointInRect(worldPoint, bounds)) {
      candidates.push({
        transomId: row.transomId,
        side: preferredSide ?? (worldPoint.y <= bounds.y + bounds.height / 2 ? "top" : "bottom"),
        bounds,
        distance: 0
      });
    } else {
      if (pointInRect(worldPoint, topSlot)) {
        candidates.push({
          transomId: row.transomId,
          side: "top",
          bounds,
          distance: Math.abs(worldPoint.y - (topSlot.y + topSlot.height / 2))
        });
      }
      if (pointInRect(worldPoint, bottomSlot)) {
        candidates.push({
          transomId: row.transomId,
          side: "bottom",
          bounds,
          distance: Math.abs(worldPoint.y - (bottomSlot.y + bottomSlot.height / 2))
        });
      }
    }
  }

  return candidates.sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function findPanelAtPoint(
  canvasLayout: CanvasLayout,
  worldPoint: { x: number; y: number }
) {
  for (const row of canvasLayout.rows) {
    for (const panel of row.panels) {
      if (pointInRect(worldPoint, panel.bounds)) {
        return {
          transomId: panel.transomId,
          panelId: panel.panelId,
          bounds: panel.bounds
        };
      }
    }
  }

  return null;
}

function findTransomAtPoint(
  canvasLayout: CanvasLayout,
  worldPoint: { x: number; y: number }
) {
  for (const row of canvasLayout.rows) {
    if (pointInRect(worldPoint, row.bounds)) {
      return {
        transomId: row.transomId,
        bounds: row.bounds
      };
    }
  }

  return null;
}

function findOffsetReferenceAtPoint(
  design: PvcDesign,
  worldPoint: { x: number; y: number },
  canvasLayout: CanvasLayout,
  scale: number
) {
  const threshold = 16;
  const candidates: Array<{
    target: CommandTarget;
    line: { x1: number; y1: number; x2: number; y2: number };
    distance: number;
    guideMeta?: { orientation: GuideOrientation; positionMm: number };
  }> = [];

  const { outerRect, innerRect, frameInset } = canvasLayout;

  design.guides.forEach((guide) => {
    if (guide.orientation === "vertical") {
      const x = innerRect.x + guide.positionMm * scale;
      candidates.push({
        target: {
          type: "guide-position",
          guideId: guide.id,
          orientation: guide.orientation,
          label: `Dikey Guide - ${guide.positionMm} mm`
        },
        line: { x1: x, y1: outerRect.y - 44, x2: x, y2: outerRect.y + outerRect.height + 44 },
        distance: Math.abs(worldPoint.x - x),
        guideMeta: { orientation: "vertical", positionMm: guide.positionMm }
      });
    } else {
      const y = innerRect.y + guide.positionMm * scale;
      candidates.push({
        target: {
          type: "guide-position",
          guideId: guide.id,
          orientation: guide.orientation,
          label: `Yatay Guide - ${guide.positionMm} mm`
        },
        line: { x1: outerRect.x - 44, y1: y, x2: outerRect.x + outerRect.width + 44, y2: y },
        distance: Math.abs(worldPoint.y - y),
        guideMeta: { orientation: "horizontal", positionMm: guide.positionMm }
      });
    }
  });

  canvasLayout.verticalBars.forEach((bar) => {
    const row = canvasLayout.rows[bar.transomIndex];
    const panel = design.transoms[bar.transomIndex]?.panels[bar.panelIndex];
    if (!row || !panel) {
      return;
    }
    candidates.push({
      target: {
        type: "panel-width",
        transomId: row.transomId,
        panelId: panel.id,
        label: `Dikey Kayit - ${panel.width} mm`
      },
      line: { x1: bar.centerX, y1: bar.rect.y, x2: bar.centerX, y2: bar.rect.y + bar.rect.height },
      distance: Math.abs(worldPoint.x - bar.centerX),
      guideMeta: {
        orientation: "vertical",
        positionMm: Math.round((bar.centerX - innerRect.x) / scale)
      }
    });
  });

  canvasLayout.horizontalBars.forEach((bar) => {
    const transom = design.transoms[bar.transomIndex];
    if (!transom) {
      return;
    }
    candidates.push({
      target: {
        type: "transom-height",
        transomId: transom.id,
        label: `Yatay Kayit - ${transom.height} mm`
      },
      line: {
        x1: bar.rect.x,
        y1: bar.centerY,
        x2: bar.rect.x + bar.rect.width,
        y2: bar.centerY
      },
      distance: Math.abs(worldPoint.y - bar.centerY),
      guideMeta: {
        orientation: "horizontal",
        positionMm: Math.round((bar.centerY - innerRect.y) / scale)
      }
    });
  });

  const frameInnerLeft = innerRect.x;
  const frameInnerTop = innerRect.y;
  const frameInnerRight = innerRect.x + innerRect.width;
  const frameInnerBottom = innerRect.y + innerRect.height;
  candidates.push({
    target: {
      type: "frame-thickness",
      label: `Kasa Kalinligi - ${Math.round(frameInset / scale)} mm`
    },
    line: { x1: frameInnerLeft, y1: outerRect.y, x2: frameInnerLeft, y2: outerRect.y + outerRect.height },
    distance: Math.abs(worldPoint.x - frameInnerLeft),
    guideMeta: { orientation: "vertical", positionMm: 0 }
  });
  candidates.push({
    target: {
      type: "frame-thickness",
      label: `Kasa Kalinligi - ${Math.round(frameInset / scale)} mm`
    },
    line: { x1: outerRect.x, y1: frameInnerTop, x2: outerRect.x + outerRect.width, y2: frameInnerTop },
    distance: Math.abs(worldPoint.y - frameInnerTop),
    guideMeta: { orientation: "horizontal", positionMm: 0 }
  });
  candidates.push({
    target: {
      type: "frame-thickness",
      label: `Kasa Kalinligi - ${Math.round(frameInset / scale)} mm`
    },
    line: { x1: frameInnerRight, y1: outerRect.y, x2: frameInnerRight, y2: outerRect.y + outerRect.height },
    distance: Math.abs(worldPoint.x - frameInnerRight),
    guideMeta: { orientation: "vertical", positionMm: design.totalWidth }
  });
  candidates.push({
    target: {
      type: "frame-thickness",
      label: `Kasa Kalinligi - ${Math.round(frameInset / scale)} mm`
    },
    line: { x1: outerRect.x, y1: frameInnerBottom, x2: outerRect.x + outerRect.width, y2: frameInnerBottom },
    distance: Math.abs(worldPoint.y - frameInnerBottom),
    guideMeta: { orientation: "horizontal", positionMm: design.totalHeight }
  });

  const nearest = candidates
    .filter((candidate) => candidate.distance <= threshold)
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest ?? null;
}

function pointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function buildTechnicalPanelReferences(
  design: PvcDesign,
  canvasLayout: CanvasLayout
) {
  const references: Array<{
    refId: string;
    label: string;
    opening: string;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    badgeX: number;
    badgeY: number;
  }> = [];
  let refIndex = 1;

  canvasLayout.rows.forEach((row) => {
    row.panels.forEach((panel) => {
      const sourcePanel = design.transoms[row.transomIndex]?.panels[panel.panelIndex];
      if (!sourcePanel) {
        return;
      }
      const label = `P${String(refIndex).padStart(2, "0")}`;
      const badgeX = panel.bounds.x + (panel.panelIndex % 2 === 0 ? 24 : Math.max(24, panel.bounds.width - 24));
      const badgeY = panel.bounds.y + 22;

      references.push({
        refId: `${row.transomId}:${panel.panelId}`,
        label,
        opening: getOpeningShortLabel(sourcePanel.openingType),
        width: panel.widthMm,
        height: panel.heightMm,
        centerX: panel.centerX,
        centerY: panel.centerY,
        badgeX,
        badgeY
      });

      refIndex += 1;
    });
  });

  return references;
}

function getTechnicalScheduleHeight(referenceCount: number) {
  const visibleRows = Math.min(10, referenceCount);
  const hiddenCount = Math.max(0, referenceCount - visibleRows);
  return 46 + visibleRows * 22 + (hiddenCount ? 22 : 0);
}

function buildBlockSelectionPreview(
  canvasLayout: CanvasLayout,
  design: PvcDesign,
  multiSelection: PanelRef[],
): BlockSelectionPreview | null {
  if (multiSelection.length < 2) {
    return null;
  }

  const transomIds = [...new Set(multiSelection.map((item) => item.transomId))];
  if (transomIds.length !== 1) {
    return null;
  }

  const row = getCanvasRowLayout(canvasLayout, transomIds[0]);
  const transomIndex = design.transoms.findIndex((item) => item.id === transomIds[0]);
  if (!row || transomIndex === -1) {
    return null;
  }

  const transom = design.transoms[transomIndex];
  const indexes = multiSelection
    .map((item) => transom.panels.findIndex((panel) => panel.id === item.panelId))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  if (!indexes.length) {
    return null;
  }

  const startIndex = indexes[0];
  const endIndex = indexes[indexes.length - 1];
  if (endIndex - startIndex + 1 !== indexes.length) {
    return null;
  }

  const panels = transom.panels.slice(startIndex, endIndex + 1);
  const rowPanels = row.panels.slice(startIndex, endIndex + 1);
  const firstPanel = rowPanels[0];
  const lastPanel = rowPanels[rowPanels.length - 1];
  const totalWidthMm = panels.reduce((sum, panel) => sum + panel.width, 0);
  const x = firstPanel.bounds.x;
  const y = row.bounds.y;
  const width = lastPanel.bounds.x + lastPanel.bounds.width - firstPanel.bounds.x;
  const height = row.bounds.height;

  return {
    transomId: transom.id,
    totalWidthMm,
    bounds: { x, y, width, height },
    rowBounds: {
      x: row.bounds.x,
      y: row.bounds.y,
      width: row.bounds.width,
      height: row.bounds.height
    },
    panels: panels.map((panel) => ({
      panelId: panel.id,
      label: panel.label,
      widthMm: panel.width,
      openingType: panel.openingType
    }))
  };
}

function getOpeningShortLabel(openingType: OpeningType) {
  switch (openingType) {
    case "turn-right":
      return "Sag";
    case "turn-left":
      return "Sol";
    case "tilt-turn-right":
      return "Vas";
    case "sliding":
      return "Sur";
    default:
      return "Sab";
  }
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  };
}

function collectPanelsInRect(
  canvasLayout: CanvasLayout,
  rect: { x: number; y: number; width: number; height: number },
) {
  const selections: PanelRef[] = [];

  canvasLayout.rows.forEach((row) => {
    row.panels.forEach((panel) => {
      if (rectsIntersect(rect, panel.bounds)) {
        selections.push({ transomId: row.transomId, panelId: panel.panelId });
      }
    });
  });

  return selections;
}

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

function renderPanelChainDimensions(
  canvasLayout: CanvasLayout,
  outerY: number,
) {
  const firstRow = canvasLayout.rows[0];
  if (!firstRow) {
    return null;
  }

  const y = outerY - 18;

  return firstRow.panels.map((panel) => {
    const x1 = panel.cellBounds.x;
    const x2 = panel.cellBounds.x + panel.cellBounds.width;
    return (
      <g key={`chain-top-${panel.panelId}`}>
        <line x1={x1} y1={y} x2={x2} y2={y} className="svg-dimension technical-green-line" />
        <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} className="svg-dimension technical-green-line" />
        <line x1={x2} y1={y - 8} x2={x2} y2={y + 8} className="svg-dimension technical-green-line" />
        <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" className="technical-text-green small-text">
          {panel.widthMm}
        </text>
      </g>
    );
  });
}

function renderTransomChainDimensions(
  canvasLayout: CanvasLayout,
  outerX: number,
) {
  const x = outerX - 18;

  return canvasLayout.rows.map((row) => {
    const y1 = row.cellBounds.y;
    const y2 = row.cellBounds.y + row.cellBounds.height;
    return (
      <g key={`chain-left-${row.transomId}`}>
        <line x1={x} y1={y1} x2={x} y2={y2} className="svg-dimension technical-green-line" />
        <line x1={x - 8} y1={y1} x2={x + 8} y2={y1} className="svg-dimension technical-green-line" />
        <line x1={x - 8} y1={y2} x2={x + 8} y2={y2} className="svg-dimension technical-green-line" />
        <text
          x={x - 8}
          y={(y1 + y2) / 2}
          transform={`rotate(90 ${x - 8} ${(y1 + y2) / 2})`}
          className="technical-text-green small-text"
        >
          {row.heightMm}
        </text>
      </g>
    );
  });
}

function OpeningMarker({
  panel,
  x,
  y,
  width,
  height,
  technical = false
}: {
  panel: PanelDefinition;
  x: number;
  y: number;
  width: number;
  height: number;
  technical?: boolean;
}) {
  const padding = 18;
  const stroke = technical ? "#8b8fff" : "#4b5b74";

  if (panel.openingType === "fixed") {
    return null;
  }

  if (panel.openingType === "turn-right") {
    return (
      <path
        d={`M ${x + padding} ${y + padding} L ${x + width - padding} ${
          y + height / 2
        } L ${x + padding} ${y + height - padding}`}
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeDasharray="8 6"
      />
    );
  }

  if (panel.openingType === "turn-left") {
    return (
      <path
        d={`M ${x + width - padding} ${y + padding} L ${x + padding} ${
          y + height / 2
        } L ${x + width - padding} ${y + height - padding}`}
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeDasharray="8 6"
      />
    );
  }

  if (panel.openingType === "tilt-turn-right") {
    return (
      <>
        <path
          d={`M ${x + padding} ${y + padding} L ${x + width - padding} ${
            y + height / 2
          } L ${x + padding} ${y + height - padding}`}
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeDasharray="8 6"
        />
        <line
          x1={x + padding}
          y1={y + padding}
          x2={x + width - padding}
          y2={y + padding}
          stroke={stroke}
          strokeWidth="2.2"
        />
      </>
    );
  }

  if (panel.openingType === "sliding") {
    return (
      <>
        <line
          x1={x + padding}
          y1={y + height / 2}
          x2={x + width - padding}
          y2={y + height / 2}
          stroke={stroke}
          strokeWidth="2.2"
          strokeDasharray="8 6"
        />
        <polygon
          points={`${x + width - padding},${y + height / 2} ${
            x + width - padding - 14
          },${y + height / 2 - 8} ${x + width - padding - 14},${
            y + height / 2 + 8
          }`}
          fill={stroke}
        />
      </>
    );
  }

  return null;
}

function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  text,
  vertical = false,
  technical = false
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  vertical?: boolean;
  technical?: boolean;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={`svg-dimension ${technical ? "technical-green-line" : ""}`}
      />
      {vertical ? (
        <text
          x={x1 + 16}
          y={(y1 + y2) / 2}
          transform={`rotate(90 ${x1 + 16} ${(y1 + y2) / 2})`}
          className={technical ? "technical-text-green" : "svg-dimension-text"}
        >
          {text}
        </text>
      ) : (
        <text
          x={(x1 + x2) / 2}
          y={y1 - 12}
          textAnchor="middle"
          className={technical ? "technical-text-green" : "svg-dimension-text"}
        >
          {text}
        </text>
      )}
      <line
        x1={x1}
        y1={y1 - 12}
        x2={x1}
        y2={y1 + 12}
        className={`svg-dimension ${technical ? "technical-green-line" : ""}`}
      />
      <line
        x1={x2}
        y1={y2 - 12}
        x2={x2}
        y2={y2 + 12}
        className={`svg-dimension ${technical ? "technical-green-line" : ""}`}
      />
    </g>
  );
}

function DimensionText({
  x,
  y,
  text,
  technical = false,
  anchor = "middle",
  editable = false,
  onClick
}: {
  x: number;
  y: number;
  text: string;
  technical?: boolean;
  anchor?: "start" | "middle" | "end";
  editable?: boolean;
  onClick?: (event: ReactMouseEvent<SVGTextElement>) => void;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className={`${technical ? "technical-text-green small-text" : "svg-dimension-text"} ${editable ? "editable-dimension-text" : ""}`}
      onClick={onClick}
    >
      {text}
    </text>
  );
}

function estimateProfileMeters(design: PvcDesign) {
  const outer = (design.totalWidth * 2 + design.totalHeight * 2) / 1000;
  const mullions =
    design.transoms.reduce(
      (sum, transom) => sum + Math.max(0, transom.panels.length - 1) * transom.height,
      0
    ) / 1000;
  const transoms = ((design.transoms.length - 1) * design.totalWidth) / 1000;

  return (outer + mullions + transoms).toFixed(1);
}

function getOpeningLabel(value: OpeningType) {
  return openingTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export default App;
