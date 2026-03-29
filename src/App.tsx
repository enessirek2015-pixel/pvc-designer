import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { panelLibraryModules, rowLibraryModules } from "./data/moduleLibrary";
import { designTemplates } from "./data/sampleDesign";
import { buildDesignHealth, buildDesignSnapshot, buildPanelEngineering } from "./lib/designEngine";
import { buildManufacturingHtml, buildManufacturingReport } from "./lib/manufacturingEngine";
import type { DesignDiagnostic } from "./lib/designEngine";
import { buildProfileLayout } from "./lib/profileLayout";
import { glassCatalog, hardwareCatalog, profileSeriesCatalog } from "./lib/systemCatalog";
import { useDesignerStore } from "./store/useDesignerStore";
import type { PanelRef } from "./store/useDesignerStore";
import type {
  FrameColor,
  GlassType,
  GuideOrientation,
  HardwareQuality,
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

const sampleTemplateId = designTemplates[0].id;
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

type CommandPreview =
  | { type: "mirror" }
  | { type: "array"; count: number }
  | { type: "offset"; delta: number }
  | { type: "copy-panel"; side: "left" | "right" }
  | { type: "copy-row"; side: "top" | "bottom" };

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

function App() {
  const [viewMode, setViewMode] = useState<"studio" | "technical" | "presentation">("studio");
  const [railTab, setRailTab] = useState<"inspector" | "materials" | "library" | "bom">("inspector");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [snapMm, setSnapMm] = useState(10);
  const [multiSelection, setMultiSelection] = useState<PanelRef[]>([]);
  const [commandTarget, setCommandTarget] = useState<CommandTarget | null>(null);
  const [selectedObject, setSelectedObject] = useState<CanvasObjectSelection | null>(null);
  const [commandValue, setCommandValue] = useState("");
  const [commandQuery, setCommandQuery] = useState("");
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [guideLabelDraft, setGuideLabelDraft] = useState("");
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
    loadTemplate,
    replaceDesign,
    setFrameColor,
    setGlassType,
    setProfileSeries,
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
    equalizeSelectedRowPanels,
    equalizeAllTransomHeights,
    applyOpeningTypeToPanels,
    equalizePanelsByRefs,
    equalizeTransomsByRefs,
    mirrorSelectedRow,
    arraySelectedPanel,
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
  const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];
  const nextProfileSeries = getNextProfileSeries(design.materials.profileSeries);
  const nextHardwareQuality = getNextHardwareQuality(design.materials.hardwareQuality);
  const designSnapshot = useMemo(() => buildDesignSnapshot(design), [design]);
  const designHealth = useMemo(() => buildDesignHealth(design), [design]);
  const selectedPanelEngineering = useMemo(() => {
    if (!selectedPanel) {
      return null;
    }

    return buildPanelEngineering(design, selectedPanel.panel.width, selectedPanel.transom.height);
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
            quickActions: ["set 60", "offset 5"]
          }
        : null;
    }

    const transom = design.transoms.find((item) => item.id === selectedObject.transomId);
    const panel = transom?.panels.find((item) => item.id === selectedObject.panelId);
    if (!transom || !panel) {
      return null;
    }

    const engineering = buildPanelEngineering(design, panel.width, transom.height);

    if (selectedObject.type === "mullion") {
      return {
        title: "Dikey Kayit",
        subtitle: `${panel.width} / ${transom.panels[transom.panels.findIndex((item) => item.id === panel.id) + 1]?.width ?? 0} mm`,
        detail: `Kayit ${design.mullionThickness} mm`,
        quickActions: ["set 60", "offset 5"]
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
      quickActions: ["sv", "array 3", "lib triple"]
    };
  }, [design, selectedObject]);
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

  function applyCommandValue() {
    const parsedValue = Number(commandValue.replace(",", "."));
    if (!commandTarget || !Number.isFinite(parsedValue) || parsedValue <= 0) {
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

  function applyCommandDimension(nextValue: number) {
    if (!commandTarget || !Number.isFinite(nextValue) || nextValue <= 0) {
      return;
    }

    if (commandTarget.type === "panel-width") {
      setPanelWidthById(commandTarget.transomId, commandTarget.panelId, nextValue);
      setCommandTarget({
        ...commandTarget,
        label: `Panel Genisligi - ${nextValue} mm`
      });
      setCommandStatus(`Panel genisligi ${nextValue} mm yapildi`);
      return;
    }

    if (commandTarget.type === "transom-height") {
      setTransomHeightById(commandTarget.transomId, nextValue);
      setCommandTarget({
        ...commandTarget,
        label: `Satir Yuksekligi - ${nextValue} mm`
      });
      setCommandStatus(`Satir yuksekligi ${nextValue} mm yapildi`);
      return;
    }

    if (commandTarget.type === "frame-thickness") {
      setOuterFrameThickness(nextValue);
      setCommandTarget({
        ...commandTarget,
        label: `Kasa Kalinligi - ${nextValue} mm`
      });
      setCommandStatus(`Kasa kalinligi ${nextValue} mm yapildi`);
      return;
    }

    if (commandTarget.type === "mullion-thickness") {
      setMullionThickness(nextValue);
      setCommandTarget({
        ...commandTarget,
        label: `Kayit Kalinligi - ${nextValue} mm`
      });
      setCommandStatus(`Kayit kalinligi ${nextValue} mm yapildi`);
      return;
    }

    setGuidePosition(commandTarget.guideId, nextValue);
    setCommandTarget({
      ...commandTarget,
      label: `${commandTarget.orientation === "vertical" ? "Dikey" : "Yatay"} Guide - ${nextValue} mm`
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

  function runCadCommand(rawValue: string) {
    const source = rawValue.trim();
    if (!source) {
      return;
    }

    const [commandRaw, ...rest] = source.split(/\s+/);
    const command = commandRaw.toLowerCase();
    const args = rest.map((item) => item.toLowerCase());
    const numericValue = Number(args.join(" ").replace(",", "."));
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

    if ((command === "offset" || command === "off") && currentValue !== null && Number.isFinite(numericValue)) {
      applyCommandDimension(Math.max(1, Math.round(currentValue + numericValue)));
      setCommandQuery("");
      return;
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
      mirrorSelectedRow();
      setCommandStatus("Secili satir aynalandi");
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

    if (command === "array" && Number.isFinite(numericValue) && numericValue >= 2) {
      arraySelectedPanel(Math.round(numericValue));
      setCommandStatus(`${Math.round(numericValue)}'lu panel dizisi olusturuldu`);
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
      setCommandStatus("Komutlar: set 900, offset -50, sv, sh, mirror, array 3, guide v 600, guide h 900, layer guides off, lib triple");
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
      if (isTypingSurface) {
        return;
      }
      if (!event.ctrlKey && !event.altKey) {
        if (event.key === "Escape") {
          setCommandValue("");
          setCommandQuery("");
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
    deleteSelectedPanel,
    deleteSelectedTransom,
    equalizePanelsByRefs,
    equalizeTransomsByRefs,
    mirrorSelectedRow,
    multiSelection,
    redo,
    splitSelectedPanelVertical,
    splitSelectedTransomHorizontal,
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

  async function handlePrintBom() {
    if (!window.desktopApi) {
      return;
    }
    await window.desktopApi.printBom(buildManufacturingHtml(design, bom));
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
            <button className="hero-button primary" onClick={() => loadTemplate(sampleTemplateId)}>
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
            <button className="hero-button ghost" onClick={handlePrintBom}>
              PDF / Yazdir
            </button>
          </div>
        </section>

        <section className="template-strip">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Hazir Baslangiclar</p>
              <h3>Sablon Galerisi</h3>
            </div>
            <div className="metric-badge">{design.totalWidth} x {design.totalHeight} mm</div>
          </div>

          <div className="template-grid">
            {designTemplates.map((template) => (
              <button
                key={template.id}
                className={`template-card ${template.id === design.id ? "selected" : ""}`}
                onClick={() => loadTemplate(template.id)}
              >
                <div className="template-preview">
                  <MiniTemplatePreview design={template} />
                </div>
                <div className="template-copy">
                  <strong>{template.name}</strong>
                  <span>
                    {template.totalWidth} x {template.totalHeight} mm
                  </span>
                </div>
              </button>
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
              onCommandTargetChange={setCommandTarget}
              onSplitVertical={splitSelectedPanelVertical}
              onSplitHorizontal={splitSelectedTransomHorizontal}
              onDeletePanel={deleteSelectedPanel}
              zoom={zoom}
              pan={pan}
              snapMm={snapMm}
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
            </div>
            <div className="command-bar">
              <span className="command-label">Komut</span>
              <strong>{toolMode}</strong>
              <span className="command-meta">Snap {snapMm} mm</span>
              <span className="command-meta">Zoom %{Math.round(zoom * 100)}</span>
              <span className="command-meta">Shift+Surukle: Kutu Secim</span>
              <span className={`health-chip ${designHealth.status}`}>
                Kontrol: {getHealthLabel(designHealth.status)} {designHealth.score}/100
              </span>
              <div className="command-line">
                <input
                  type="text"
                  value={commandQuery}
                  placeholder="sv | offset -50 | mirror | array 3 | lib triple"
                  onChange={(event) => setCommandQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      runCadCommand(commandQuery);
                    }
                  }}
                />
                <button className="tool-chip" onClick={() => runCadCommand(commandQuery)}>Calistir</button>
              </div>
              {commandTarget && (
                <div className="command-input">
                  <span className="command-meta">{commandTarget.label}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={commandValue}
                    placeholder="mm yaz"
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
              <div className="command-presets">
                <button className="tool-chip" onClick={() => runCadCommand("mirror")}>Mirror</button>
                <button className="tool-chip" onClick={() => runCadCommand("array 3")}>Array 3</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset -50")}>-50</button>
                <button className="tool-chip" onClick={() => runCadCommand("offset 50")}>+50</button>
                <button className="tool-chip" onClick={() => runCadCommand("lib double")}>Cift Kanat</button>
                <button className="tool-chip" onClick={() => runCadCommand("lib slider")}>Surgu</button>
                <button className="tool-chip" onClick={() => setToolMode("guide-vertical")}>V Guide</button>
                <button className="tool-chip" onClick={() => setToolMode("guide-horizontal")}>H Guide</button>
              </div>
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
                    m²
                  </span>
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
                    <SelectField label="Cam Tipi" value={design.materials.glassType} onChange={(value) => setGlassType(value as GlassType)} options={glassTypeOptions.map((item) => ({ value: item.value, label: item.label }))} />
                    <SelectField label="Profil Serisi" value={design.materials.profileSeries} onChange={(value) => setProfileSeries(value as ProfileSeries)} options={profileSeriesOptions.map((item) => ({ value: item.value, label: item.label }))} />
                    <SelectField label="Donanim" value={design.materials.hardwareQuality} onChange={(value) => setHardwareQuality(value as HardwareQuality)} options={hardwareOptions.map((item) => ({ value: item.value, label: item.label }))} />
                    <label>Musteri<input value={design.customer.customerName} onChange={(event) => setCustomerField("customerName", event.target.value)} /></label>
                    <label>Proje Kodu<input value={design.customer.projectCode} onChange={(event) => setCustomerField("projectCode", event.target.value)} /></label>
                    <label>Adres<input value={design.customer.address} onChange={(event) => setCustomerField("address", event.target.value)} /></label>
                    <label>Notlar<input value={design.customer.notes} onChange={(event) => setCustomerField("notes", event.target.value)} /></label>
                  </div>
                  <div className="material-insights">
                    <div className="material-card">
                      <strong>{profileSpec.label}</strong>
                      <span>Derinlik: {profileSpec.depthMm} mm</span>
                      <span>Onerilen Kasa: {profileSpec.recommendedFrameMm} mm</span>
                      <span>Maks. Kanat: {profileSpec.maxOperableWidthMm} x {profileSpec.maxOperableHeightMm} mm</span>
                    </div>
                    <div className="material-card">
                      <strong>{glassSpec.label}</strong>
                      <span>Dizilim: {glassSpec.buildUp}</span>
                      <span>Agirlik: {glassSpec.weightKgM2} kg/m²</span>
                      <span>Sinif: {glassSpec.thermalClass}</span>
                    </div>
                    <div className="material-card">
                      <strong>{hardwareSpec.label}</strong>
                      <span>Maks. Kanat Agirligi: {hardwareSpec.maxSashWeightKg} kg</span>
                      <span>Standart Menteşe: {hardwareSpec.hingeCount} adet</span>
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
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
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
  const height = 72;
  const scale = width / design.totalWidth;
  const transomOffsets = buildTransomOffsets(design, scale, 10);
  const frameInset = design.outerFrameThickness * scale;
  const outerX = 6;
  const outerY = 10;
  const outerW = width;
  const outerH = design.totalHeight * scale;

  return (
    <svg viewBox="0 0 140 92" className="mini-svg" aria-hidden="true">
      <rect x={outerX} y={outerY} width={outerW} height={outerH} rx="4" fill="#fdfefe" stroke="#90a0b8" />
      {design.transoms.map((transom, transomIndex) => {
        let currentX = outerX + frameInset;
        const rowTop = transomOffsets[transomIndex];

        return transom.panels.map((panel) => {
          const panelWidth = panel.width * scale;
          const panelHeight = transom.height * scale;
          const panelX = currentX;
          currentX += panelWidth;
          return (
            <rect
              key={panel.id}
              x={panelX}
              y={rowTop}
              width={panelWidth}
              height={panelHeight}
              fill={panel.openingType === "fixed" ? "#cfe5f8" : "#a8d7ff"}
              stroke="#7f8ca0"
            />
          );
        });
      })}
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
  const steps = [10, 25, 50, 100, 200, 250, 500, 1000];
  return steps.find((step) => step * pxPerMm >= 48) ?? 1000;
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

function buildCommandPreview(query: string): CommandPreview | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  const [command, ...args] = parts;
  const numeric = Number((args[0] ?? "").replace(",", "."));

  if (command === "mirror") {
    return { type: "mirror" };
  }

  if (command === "array" && Number.isFinite(numeric) && numeric >= 2) {
    return { type: "array", count: Math.max(2, Math.min(8, Math.round(numeric))) };
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

  return null;
}

function formatCommandPreview(preview: CommandPreview) {
  switch (preview.type) {
    case "mirror":
      return "Aynalama";
    case "array":
      return `Array ${preview.count}`;
    case "offset":
      return `Offset ${preview.delta > 0 ? "+" : ""}${preview.delta}`;
    case "copy-panel":
      return `Panel ${preview.side === "left" ? "sol" : "sag"} kopya`;
    case "copy-row":
      return `Satir ${preview.side === "top" ? "ust" : "alt"} kopya`;
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
  onCommandTargetChange,
  onSplitVertical,
  onSplitHorizontal,
  onDeletePanel,
  zoom,
  pan,
  snapMm,
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
  onCommandTargetChange: (target: CommandTarget | null) => void;
  onSplitVertical: () => void;
  onSplitHorizontal: () => void;
  onDeletePanel: () => void;
  zoom: number;
  pan: { x: number; y: number };
  snapMm: number;
  onWheelZoom: (delta: number, reset?: boolean) => void;
  onPanStart: (clientX: number, clientY: number) => void;
  onPanMove: (clientX: number, clientY: number) => void;
  onPanEnd: () => void;
  panEnabled: boolean;
}) {
  const selectPanel = useDesignerStore((state) => state.selectPanel);
  const setPanelWidthById = useDesignerStore((state) => state.setPanelWidthById);
  const setTransomHeightById = useDesignerStore((state) => state.setTransomHeightById);
  const setOuterFrameThickness = useDesignerStore((state) => state.setOuterFrameThickness);
  const setMullionThickness = useDesignerStore((state) => state.setMullionThickness);
  const setSelectedOpeningType = useDesignerStore((state) => state.setSelectedOpeningType);
  const setGlassType = useDesignerStore((state) => state.setGlassType);
  const setHardwareQuality = useDesignerStore((state) => state.setHardwareQuality);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<string | null>(null);
  const [dragHint, setDragHint] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
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
  const drawingHeight = (design.totalHeight / design.totalWidth) * drawingWidth;
  const svgWidth = drawingWidth + margin * 2;
  const svgHeight = drawingHeight + 300;
  const scale = drawingWidth / design.totalWidth;

  const outerX = margin;
  const outerY = 120;
  const outerW = drawingWidth;
  const outerH = drawingHeight;

  const frameInset = design.outerFrameThickness * scale;
  const mullionSize = design.mullionThickness * scale;
  const transomOffsets = buildTransomOffsets(design, scale, outerY);
  const selectedBounds = getSelectedBounds(design, selected, scale, outerX + frameInset, transomOffsets);
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
  const cursorMeasure = useMemo(() => {
    if (!cursor) {
      return null;
    }

    return {
      xMm: clamp(Math.round(((cursor.x - pan.x) / zoom - (outerX + frameInset)) / scale), 0, design.totalWidth),
      yMm: clamp(Math.round(((cursor.y - pan.y) / zoom - (outerY + frameInset)) / scale), 0, design.totalHeight)
    };
  }, [cursor, design.totalHeight, design.totalWidth, frameInset, outerX, outerY, pan.x, pan.y, scale, zoom]);
  const rulerStepMm = useMemo(() => getRulerStepMm(scale, zoom), [scale, zoom]);
  const horizontalRulerTicks = useMemo(
    () =>
      buildRulerTicks(design.totalWidth, rulerStepMm)
        .map((value) => ({
          value,
          x: pan.x + (outerX + frameInset + value * scale) * zoom
        }))
        .filter((tick) => tick.x >= 40 && tick.x <= svgWidth - 18),
    [design.totalWidth, frameInset, outerX, pan.x, rulerStepMm, scale, svgWidth, zoom]
  );
  const verticalRulerTicks = useMemo(
    () =>
      buildRulerTicks(design.totalHeight, rulerStepMm)
        .map((value) => ({
          value,
          y: pan.y + (outerY + frameInset + value * scale) * zoom
        }))
        .filter((tick) => tick.y >= 40 && tick.y <= svgHeight - 18),
    [design.totalHeight, frameInset, outerY, pan.y, rulerStepMm, scale, svgHeight, zoom]
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
  const selectedRowBounds = useMemo(() => {
    if (!selectedPanelData) {
      return null;
    }

    return {
      x: outerX + frameInset,
      y: transomOffsets[selectedPanelData.transomIndex],
      width: design.totalWidth * scale,
      height: selectedPanelData.transom.height * scale
    };
  }, [design.totalWidth, frameInset, outerX, scale, selectedPanelData, transomOffsets]);
  const showPanelCanvasActions =
    selectedBounds &&
    viewMode !== "technical" &&
    (!selectedObject || selectedObject.type === "panel");
  const activeVerticalGuide = useMemo(() => {
    if (!dragState || (dragState.type !== "vertical" && dragState.type !== "object-width")) {
      return null;
    }

    const transomIndex = design.transoms.findIndex((item) => item.id === dragState.transomId);
    if (transomIndex === -1) {
      return null;
    }

    const transom = design.transoms[transomIndex];
    const panelIndex = transom.panels.findIndex((item) => item.id === dragState.panelId);
    if (panelIndex === -1 || panelIndex >= transom.panels.length - 1) {
      return null;
    }

    const dividerX =
      outerX +
      frameInset +
      transom.panels.slice(0, panelIndex + 1).reduce((sum, panel) => sum + panel.width * scale, 0);

    return {
      x: pan.x + dividerX * zoom,
      y1: pan.y + transomOffsets[transomIndex] * zoom,
      y2: pan.y + (transomOffsets[transomIndex] + transom.height * scale) * zoom,
      leftLabel: `${transom.panels[panelIndex].width} mm`,
      rightLabel: `${transom.panels[panelIndex + 1].width} mm`
    };
  }, [design, dragState, frameInset, outerX, pan.x, pan.y, scale, transomOffsets, zoom]);
  const activeHorizontalGuide = useMemo(() => {
    if (!dragState || (dragState.type !== "horizontal" && dragState.type !== "object-height")) {
      return null;
    }

    const transomIndex = design.transoms.findIndex((item) => item.id === dragState.transomId);
    if (transomIndex === -1 || transomIndex >= design.transoms.length - 1) {
      return null;
    }

    const transom = design.transoms[transomIndex];
    const nextTransom = design.transoms[transomIndex + 1];
    const dividerY = transomOffsets[transomIndex] + transom.height * scale;

    return {
      y: pan.y + dividerY * zoom,
      x1: pan.x + (outerX + frameInset) * zoom,
      x2: pan.x + (outerX + outerW - frameInset) * zoom,
      topLabel: `${transom.height} mm`,
      bottomLabel: `${nextTransom.height} mm`
    };
  }, [design, dragState, frameInset, outerW, outerX, pan.x, pan.y, scale, transomOffsets, zoom]);

  const getWorldPoint = (clientX: number, clientY: number, host: HTMLDivElement) => {
    const rect = host.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  };

  const finishMarqueeSelection = (selectionRect: { x: number; y: number; width: number; height: number }) => {
    const nextSelection = collectPanelsInRect(
      design,
      selectionRect,
      scale,
      outerX + frameInset,
      transomOffsets
    );
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
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const rawValue = dragState.startWidth + deltaMm;
        const snapCandidate = getVerticalSnapCandidate(design, dragState.transomId, dragState.panelId, rawValue);
        const nextValue = snapCandidate?.value ?? rawValue;
        setPanelWidthById(dragState.transomId, dragState.panelId, nextValue);
        setDragPreview(`${Math.round(nextValue)} mm`);
        setDragHint(snapCandidate?.label ?? null);
        return;
      }

      if (dragState.type === "object-width") {
        const deltaPx = event.clientX - dragState.startClientX;
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const rawValue = dragState.startWidth + deltaMm;
        const snapCandidate = getVerticalSnapCandidate(design, dragState.transomId, dragState.panelId, rawValue);
        const nextValue = snapCandidate?.value ?? rawValue;
        setPanelWidthById(dragState.transomId, dragState.panelId, nextValue);
        setDragPreview(`${Math.round(nextValue)} mm`);
        setDragHint(snapCandidate?.label ?? `${dragState.sourceLabel} genisligi`);
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
        const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
        const rawValue = dragState.startHeight + deltaMm;
        const snapCandidate = getHorizontalSnapCandidate(design, dragState.transomId, rawValue);
        const nextValue = snapCandidate?.value ?? rawValue;
        setTransomHeightById(dragState.transomId, nextValue);
        setDragPreview(`${Math.round(nextValue)} mm`);
        setDragHint(snapCandidate?.label ?? `${dragState.sourceLabel} yuksekligi`);
        return;
      }

      const deltaPx = event.clientY - dragState.startClientY;
      const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
      const rawValue = dragState.startHeight + deltaMm;
      const snapCandidate = getHorizontalSnapCandidate(design, dragState.transomId, rawValue);
      const nextValue = snapCandidate?.value ?? rawValue;
      setTransomHeightById(dragState.transomId, nextValue);
      setDragPreview(`${Math.round(nextValue)} mm`);
      setDragHint(snapCandidate?.label ?? null);
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
  }, [design, dragState, onMoveGuide, setMullionThickness, setOuterFrameThickness, setPanelWidthById, setTransomHeightById, snapMm]);

  const isTechnical = viewMode === "technical";
  const isPresentation = viewMode === "presentation";

  return (
    <div
      className={`canvas-wrap premium ${isTechnical ? "technical" : ""} ${isPresentation ? "presentation" : ""}`}
      onWheel={(event) => {
        if (!event.ctrlKey) {
          return;
        }
        event.preventDefault();
        onWheelZoom(event.deltaY < 0 ? 0.08 : -0.08);
      }}
      onMouseDown={(event) => {
        if (event.button === 1 || panEnabled) {
          onPanStart(event.clientX, event.clientY);
          return;
        }

        if (event.button === 0 && (toolMode === "guide-vertical" || toolMode === "guide-horizontal")) {
          const worldPoint = getWorldPoint(event.clientX, event.clientY, event.currentTarget);
          const mmValue =
            toolMode === "guide-vertical"
              ? clamp(Math.round((worldPoint.x - (outerX + frameInset)) / scale), 0, design.totalWidth)
              : clamp(Math.round((worldPoint.y - (outerY + frameInset)) / scale), 0, design.totalHeight);
          onAddGuide(toolMode === "guide-vertical" ? "vertical" : "horizontal", mmValue);
          onToolModeChange("select");
          setDragHint(null);
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
          <rect x="0" y="0" width={svgWidth} height="42" className={`ruler-band ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`} />
          <rect x="0" y="0" width="42" height={svgHeight} className={`ruler-band ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`} />
          <rect x="0" y="0" width="42" height="42" className={`ruler-corner ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`} />
          {horizontalRulerTicks.map((tick) => (
            <g key={`ruler-x-${tick.value}`}>
              <line
                x1={tick.x}
                y1="42"
                x2={tick.x}
                y2={tick.value % (rulerStepMm * 2) === 0 ? "14" : "24"}
                className={`ruler-tick ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}
              />
              <text x={tick.x + 4} y="12" className={`ruler-text ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}>
                {tick.value}
              </text>
            </g>
          ))}
          {verticalRulerTicks.map((tick) => (
            <g key={`ruler-y-${tick.value}`}>
              <line
                x1="42"
                y1={tick.y}
                x2={tick.value % (rulerStepMm * 2) === 0 ? "14" : "24"}
                y2={tick.y}
                className={`ruler-tick ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}
              />
              <text
                x="14"
                y={tick.y - 4}
                transform={`rotate(-90 14 ${tick.y - 4})`}
                className={`ruler-text ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}
              >
                {tick.value}
              </text>
            </g>
          ))}
          {cursor && cursorMeasure && (
            <>
              <line x1={cursor.x} y1="0" x2={cursor.x} y2="42" className="ruler-cursor" />
              <line x1="0" y1={cursor.y} x2="42" y2={cursor.y} className="ruler-cursor" />
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
          x={outerX + frameInset}
          y={outerY + frameInset}
          width={outerW - frameInset * 2}
          height={outerH - frameInset * 2}
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
              x={outerX + frameInset + 4}
              y={outerY + frameInset + 4}
              width={Math.max(24, outerW - frameInset * 2 - 8)}
              height={Math.max(24, outerH - frameInset * 2 - 8)}
              rx="8"
              className="object-selection-outline frame inner"
            />
          </>
        )}
        {isSameCanvasObject(selectedObject, { type: "outer-frame" }) && !isTechnical && (
          <ThicknessManipulatorHandles
            primary={{
              x: outerX + outerW / 2,
              y: outerY + frameInset,
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
              x: outerX + frameInset,
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
            {renderPanelChainDimensions(design, outerX + frameInset, outerY, scale)}
            {renderTransomChainDimensions(design, outerX, outerY + frameInset, scale)}
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
                ? outerX + frameInset + guide.positionMm * scale
                : outerY + frameInset + guide.positionMm * scale;

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

        {design.transoms.map((transom, transomIndex) => {
          const rowTop = transomOffsets[transomIndex];
          let currentX = outerX + frameInset;

          return transom.panels.map((panel, panelIndex) => {
            const widthPx = panel.width * scale;
            const heightPx = transom.height * scale;
            const panelX = currentX;
            const panelY = rowTop;
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
                  ? { x: panelX, y: panelY, width: widthPx, height: heightPx }
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

            currentX += widthPx;

            return (
              <g key={panel.id}>
                {isTechnical ? (
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
                    {panelLayout.sashRect && (
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
                    )}
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
                    x={panelX + widthPx / 2}
                    y={outerY + outerH + 52}
                    text={String(panel.width)}
                    technical={isTechnical}
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

                {panelIndex < transom.panels.length - 1 && (
                  <g>
                    <rect
                      x={panelX + widthPx - mullionSize / 2}
                      y={panelY}
                      width={mullionSize}
                      height={heightPx}
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
                      x={panelX + widthPx - 10}
                      y={panelY + heightPx / 2 - 36}
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
                            x: panelX + widthPx + mullionSize / 2 + 18,
                            y: panelY + heightPx / 2,
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
                  </g>
                )}
              </g>
            );
          });
        })}

        {transomOffsets.slice(1).map((offsetY) => (
          <g key={offsetY}>
            {(() => {
              const transomIndex = transomOffsets.findIndex((item) => item === offsetY);
              const aboveTransom = design.transoms[transomIndex];
              const isActiveDivider =
                isSameCanvasObject(selectedObject, {
                  type: "transom-bar",
                  transomId: aboveTransom?.id ?? ""
                }) ||
                (commandTarget?.type === "transom-height" && commandTarget.transomId === aboveTransom?.id);

              return (
                <>
            <rect
              x={outerX + frameInset}
              y={offsetY - mullionSize / 2}
              width={outerW - frameInset * 2}
              height={mullionSize}
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
              x={outerX + outerW / 2 - 40}
              y={offsetY - 10}
              width="80"
              height="20"
              rx="10"
              className="drag-handle"
              onMouseDown={(event) => {
                const transomIndex = transomOffsets.findIndex((item) => item === offsetY);
                const aboveTransom = design.transoms[transomIndex];
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
                    x: outerX + outerW / 2,
                    y: offsetY + mullionSize / 2 + 18,
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
                </>
              );
            })()}
          </g>
        ))}

        {visibleLayers.dimensions && (
          <>
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
          const bounds = getSelectedBounds(design, item, scale, outerX + frameInset, transomOffsets);
          if (!bounds) {
            return null;
          }

          return <MultiSelectionOutline key={`${item.transomId}:${item.panelId}`} bounds={bounds} />;
        })}
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
          </g>
        )}
        {dragPreview && cursor && (
          <g>
            <rect x={cursor.x + 16} y={cursor.y - 26} width="88" height="24" rx="8" className="drag-preview-box" />
            <text x={cursor.x + 60} y={cursor.y - 10} textAnchor="middle" className="drag-preview-text">
              {dragPreview}
            </text>
          </g>
        )}
        {dragHint && cursor && (
          <g>
            <rect x={cursor.x + 16} y={cursor.y + 4} width="138" height="22" rx="8" className="drag-hint-box" />
            <text x={cursor.x + 85} y={cursor.y + 19} textAnchor="middle" className="drag-hint-text">
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
        {isTechnical && visibleLayers.notes && (
          <TechnicalTitleBlock
            x={svgWidth - 276}
            y={svgHeight - 152}
            design={design}
          />
        )}
        </g>
      </svg>
      <div className={`canvas-status-bar ${isTechnical ? "technical" : isPresentation ? "presentation" : ""}`}>
        <span><strong>Imlec</strong> {cursorMeasure ? `${cursorMeasure.xMm}, ${cursorMeasure.yMm} mm` : "--"}</span>
        <span><strong>Secim</strong> {selectedObject ? getCanvasObjectLabel(selectedObject) : selectedPanelData ? `${selectedPanelData.panel.label} / ${selectedPanelData.panel.width} x ${selectedPanelData.transom.height}` : "Yok"}</span>
        <span><strong>Snap</strong> {snapMm} mm</span>
        <span><strong>Zoom</strong> %{Math.round(zoom * 100)}</span>
        <span><strong>Komut</strong> {toolMode}</span>
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

function TechnicalTitleBlock({
  x,
  y,
  design
}: {
  x: number;
  y: number;
  design: PvcDesign;
}) {
  const today = new Date().toLocaleDateString("tr-TR");

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="248" height="122" rx="12" className="technical-title-block" />
      <text x="16" y="22" className="technical-title-head">
        PVC DESIGNER / TEKNIK PAFTA
      </text>
      <text x="16" y="42" className="technical-title-meta">
        Proje: {design.name}
      </text>
      <text x="16" y="58" className="technical-title-meta">
        Musteri: {design.customer.customerName || "Tanimsiz"}
      </text>
      <text x="16" y="74" className="technical-title-meta">
        Seri: {profileSeriesCatalog[design.materials.profileSeries].label}
      </text>
      <text x="16" y="90" className="technical-title-meta">
        Olcu: {design.totalWidth} x {design.totalHeight} mm
      </text>
      <text x="16" y="106" className="technical-title-meta">
        Tarih: {today}
      </text>
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
  tone: "sash" | "glass" | "hardware";
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
  commandTarget: CommandTarget | null;
  selectedObject: CanvasObjectSelection | null;
  rowPanels: PanelDefinition[] | null;
  frameRect: { x: number; y: number; width: number; height: number };
  frameInset: number;
  mullionSize: number;
  scale: number;
  design: PvcDesign;
}) {
  if (preview.type === "array" && selectedBounds) {
    const segmentWidth = selectedBounds.width / preview.count;
    return (
      <g>
        <rect
          x={selectedBounds.x}
          y={selectedBounds.y}
          width={selectedBounds.width}
          height={selectedBounds.height}
          className="command-preview-shell"
        />
        {Array.from({ length: preview.count }, (_, index) => {
          const x = selectedBounds.x + index * segmentWidth;
          return (
            <g key={`array-preview-${index}`}>
              <rect
                x={x}
                y={selectedBounds.y}
                width={segmentWidth}
                height={selectedBounds.height}
                className="command-preview-tile"
              />
              <text
                x={x + segmentWidth / 2}
                y={selectedBounds.y + selectedBounds.height / 2}
                textAnchor="middle"
                className="command-preview-text"
              >
                {index + 1}
              </text>
            </g>
          );
        })}
        <PreviewBadge
          x={selectedBounds.x + selectedBounds.width / 2}
          y={selectedBounds.y - 18}
          text={`Array ${preview.count}`}
        />
      </g>
    );
  }

  if (preview.type === "mirror" && selectedRowBounds && rowPanels?.length) {
    let cursor = selectedRowBounds.x;
    const reversed = [...rowPanels].reverse();
    return (
      <g>
        <rect
          x={selectedRowBounds.x}
          y={selectedRowBounds.y}
          width={selectedRowBounds.width}
          height={selectedRowBounds.height}
          className="command-preview-shell"
        />
        {reversed.map((panel, index) => {
          const width = panel.width * scale;
          const x = cursor;
          cursor += width;
          return (
            <g key={`mirror-preview-${panel.id}-${index}`}>
              <rect
                x={x}
                y={selectedRowBounds.y}
                width={width}
                height={selectedRowBounds.height}
                className="command-preview-tile mirror"
              />
              <text
                x={x + width / 2}
                y={selectedRowBounds.y + 18}
                textAnchor="middle"
                className="command-preview-text"
              >
                {panel.label}
              </text>
            </g>
          );
        })}
        <PreviewBadge
          x={selectedRowBounds.x + selectedRowBounds.width / 2}
          y={selectedRowBounds.y - 18}
          text="Mirror Preview"
        />
      </g>
    );
  }

  if (preview.type === "copy-panel" && selectedBounds) {
    const halfWidth = selectedBounds.width / 2;
    const leftX = preview.side === "left" ? selectedBounds.x : selectedBounds.x + halfWidth;
    const rightX = preview.side === "left" ? selectedBounds.x + halfWidth : selectedBounds.x;
    return (
      <g>
        <rect
          x={selectedBounds.x}
          y={selectedBounds.y}
          width={selectedBounds.width}
          height={selectedBounds.height}
          className="command-preview-shell"
        />
        <rect
          x={leftX}
          y={selectedBounds.y}
          width={halfWidth}
          height={selectedBounds.height}
          className="command-preview-tile copy"
        />
        <rect
          x={rightX}
          y={selectedBounds.y}
          width={halfWidth}
          height={selectedBounds.height}
          className="command-preview-tile"
        />
        <PreviewBadge
          x={selectedBounds.x + selectedBounds.width / 2}
          y={selectedBounds.y - 18}
          text={`Copy ${preview.side === "left" ? "Sol" : "Sag"}`}
        />
      </g>
    );
  }

  if (preview.type === "copy-row" && selectedRowBounds) {
    const halfHeight = selectedRowBounds.height / 2;
    const topY = preview.side === "top" ? selectedRowBounds.y : selectedRowBounds.y + halfHeight;
    const bottomY = preview.side === "top" ? selectedRowBounds.y + halfHeight : selectedRowBounds.y;
    return (
      <g>
        <rect
          x={selectedRowBounds.x}
          y={selectedRowBounds.y}
          width={selectedRowBounds.width}
          height={selectedRowBounds.height}
          className="command-preview-shell"
        />
        <rect
          x={selectedRowBounds.x}
          y={topY}
          width={selectedRowBounds.width}
          height={halfHeight}
          className="command-preview-tile copy"
        />
        <rect
          x={selectedRowBounds.x}
          y={bottomY}
          width={selectedRowBounds.width}
          height={halfHeight}
          className="command-preview-tile"
        />
        <PreviewBadge
          x={selectedRowBounds.x + selectedRowBounds.width / 2}
          y={selectedRowBounds.y - 18}
          text={`Copy ${preview.side === "top" ? "Ust" : "Alt"}`}
        />
      </g>
    );
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

function PreviewBadge({
  x,
  y,
  text
}: {
  x: number;
  y: number;
  text: string;
}) {
  const width = Math.max(118, text.length * 6.8 + 26);

  return (
    <g transform={`translate(${x - width / 2} ${y - 14})`}>
      <rect width={width} height="24" rx="10" className="command-preview-badge" />
      <text x={width / 2} y="16" textAnchor="middle" className="command-preview-badge-text">
        {text}
      </text>
    </g>
  );
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

function buildTransomOffsets(design: PvcDesign, scale: number, outerY: number) {
  const frameInset = design.outerFrameThickness * scale;
  const offsets: number[] = [];
  let currentY = outerY + frameInset;

  design.transoms.forEach((transom) => {
    offsets.push(currentY);
    currentY += transom.height * scale;
  });

  return offsets;
}

function getSelectedBounds(
  design: PvcDesign,
  selected: { transomId: string; panelId: string } | null,
  scale: number,
  startX: number,
  transomOffsets: number[]
) {
  if (!selected) {
    return null;
  }

  const transomIndex = design.transoms.findIndex((transom) => transom.id === selected.transomId);
  if (transomIndex === -1) {
    return null;
  }

  const transom = design.transoms[transomIndex];
  const panelIndex = transom.panels.findIndex((panel) => panel.id === selected.panelId);
  if (panelIndex === -1) {
    return null;
  }

  const x = startX + transom.panels.slice(0, panelIndex).reduce((sum, panel) => sum + panel.width * scale, 0);
  const y = transomOffsets[transomIndex];
  const width = transom.panels[panelIndex].width * scale;
  const height = transom.height * scale;

  return { x, y, width, height };
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
  design: PvcDesign,
  rect: { x: number; y: number; width: number; height: number },
  scale: number,
  startX: number,
  transomOffsets: number[]
) {
  const selections: PanelRef[] = [];

  design.transoms.forEach((transom, transomIndex) => {
    let currentX = startX;
    const panelY = transomOffsets[transomIndex];
    const panelHeight = transom.height * scale;

    transom.panels.forEach((panel) => {
      const panelBounds = {
        x: currentX,
        y: panelY,
        width: panel.width * scale,
        height: panelHeight
      };
      currentX += panelBounds.width;

      if (rectsIntersect(rect, panelBounds)) {
        selections.push({ transomId: transom.id, panelId: panel.id });
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
  design: PvcDesign,
  startX: number,
  outerY: number,
  scale: number
) {
  const firstRow = design.transoms[0];
  if (!firstRow) {
    return null;
  }

  let currentX = startX;
  const y = outerY - 18;

  return firstRow.panels.map((panel) => {
    const panelWidth = panel.width * scale;
    const x1 = currentX;
    const x2 = currentX + panelWidth;
    currentX += panelWidth;

    return (
      <g key={`chain-top-${panel.id}`}>
        <line x1={x1} y1={y} x2={x2} y2={y} className="svg-dimension technical-green-line" />
        <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} className="svg-dimension technical-green-line" />
        <line x1={x2} y1={y - 8} x2={x2} y2={y + 8} className="svg-dimension technical-green-line" />
        <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" className="technical-text-green small-text">
          {panel.width}
        </text>
      </g>
    );
  });
}

function renderTransomChainDimensions(
  design: PvcDesign,
  outerX: number,
  startY: number,
  scale: number
) {
  let currentY = startY;
  const x = outerX - 18;

  return design.transoms.map((transom) => {
    const rowHeight = transom.height * scale;
    const y1 = currentY;
    const y2 = currentY + rowHeight;
    currentY += rowHeight;

    return (
      <g key={`chain-left-${transom.id}`}>
        <line x1={x} y1={y1} x2={x} y2={y2} className="svg-dimension technical-green-line" />
        <line x1={x - 8} y1={y1} x2={x + 8} y2={y1} className="svg-dimension technical-green-line" />
        <line x1={x - 8} y1={y2} x2={x + 8} y2={y2} className="svg-dimension technical-green-line" />
        <text
          x={x - 8}
          y={(y1 + y2) / 2}
          transform={`rotate(90 ${x - 8} ${(y1 + y2) / 2})`}
          className="technical-text-green small-text"
        >
          {transom.height}
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
  technical = false
}: {
  x: number;
  y: number;
  text: string;
  technical?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className={technical ? "technical-text-green small-text" : "svg-dimension-text"}
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
