import { useEffect, useMemo, useRef, useState } from "react";
import { designTemplates } from "./data/sampleDesign";
import { useDesignerStore } from "./store/useDesignerStore";
import type { PanelRef } from "./store/useDesignerStore";
import type {
  FrameColor,
  GlassType,
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

const sampleTemplateId = designTemplates[0].id;
type ToolMode =
  | "select"
  | "split-vertical"
  | "split-horizontal"
  | "add-left"
  | "add-right"
  | "add-top"
  | "add-bottom"
  | "delete-panel";

function App() {
  const [viewMode, setViewMode] = useState<"studio" | "technical" | "presentation">("studio");
  const [railTab, setRailTab] = useState<"inspector" | "materials" | "bom">("inspector");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [snapMm, setSnapMm] = useState(10);
  const [multiSelection, setMultiSelection] = useState<PanelRef[]>([]);
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
    setDesignName,
    loadTemplate,
    replaceDesign,
    setFrameColor,
    setGlassType,
    setProfileSeries,
    setHardwareQuality,
    setCustomerField,
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

  const totalPanelCount = design.transoms.reduce((sum, transom) => sum + transom.panels.length, 0);
  const openingCount = design.transoms.reduce(
    (sum, transom) => sum + transom.panels.filter((panel) => panel.openingType !== "fixed").length,
    0
  );
  const fixedCount = totalPanelCount - openingCount;
  const bom = useMemo(() => buildBom(design), [design]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
      if (!event.ctrlKey && !event.altKey) {
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
    await window.desktopApi.printBom(buildBomHtml(design, bom));
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
                <span className="canvas-chip">
                  {viewMode === "studio" ? "Studyo" : viewMode === "technical" ? "Teknik" : "Sunum"}
                </span>
              </div>
            </div>

            <PvcCanvas
              design={design}
              selected={selected}
              multiSelection={multiSelection}
              onMultiSelectionChange={setMultiSelection}
              onInsertPanel={insertPanelAdjacent}
              onInsertTransom={insertTransomAdjacent}
              viewMode={viewMode}
              toolMode={toolMode}
              onToolModeChange={setToolMode}
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
                <button className={`tab-button ${railTab === "bom" ? "active" : ""}`} onClick={() => setRailTab("bom")}>BOM</button>
              </div>

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

              {railTab === "inspector" && !selectedPanel && (
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
                  value={`${estimateProfileMeters(design)} m`}
                  accent="green"
                />
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
  multiSelection,
  onMultiSelectionChange,
  onInsertPanel,
  onInsertTransom,
  viewMode,
  toolMode,
  onToolModeChange,
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
  multiSelection: PanelRef[];
  onMultiSelectionChange: (panels: PanelRef[]) => void;
  onInsertPanel: (side: "left" | "right") => void;
  onInsertTransom: (side: "top" | "bottom") => void;
  viewMode: "studio" | "technical" | "presentation";
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
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
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<string | null>(null);
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
    | null
  >(null);
  const margin = 120;
  const drawingWidth = 900;
  const drawingHeight = (design.totalHeight / design.totalWidth) * drawingWidth;
  const scale = drawingWidth / design.totalWidth;

  const outerX = margin;
  const outerY = 120;
  const outerW = drawingWidth;
  const outerH = drawingHeight;

  const frameInset = design.outerFrameThickness * scale;
  const mullionSize = design.mullionThickness * scale;
  const transomOffsets = buildTransomOffsets(design, scale, outerY);
  const selectedBounds = getSelectedBounds(design, selected, scale, outerX + frameInset, transomOffsets);
  const multiSelectionKeys = useMemo(
    () => new Set(multiSelection.map((panel) => `${panel.transomId}:${panel.panelId}`)),
    [multiSelection]
  );

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
        const nextValue = dragState.startWidth + deltaMm;
        setPanelWidthById(dragState.transomId, dragState.panelId, nextValue);
        setDragPreview(`${Math.round(nextValue)} mm`);
        return;
      }

      const deltaPx = event.clientY - dragState.startClientY;
      const deltaMm = snapValue(deltaPx / dragState.scale, snapMm);
      const nextValue = dragState.startHeight + deltaMm;
      setTransomHeightById(dragState.transomId, nextValue);
      setDragPreview(`${Math.round(nextValue)} mm`);
    };

    const handleUp = () => {
      setDragState(null);
      setDragPreview(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, setPanelWidthById, setTransomHeightById]);

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
        marqueeStart.current = null;
        setMarquee(null);
        onPanEnd();
      }}
    >
      <svg
        className="drawing-surface"
        viewBox={`0 0 ${drawingWidth + margin * 2} ${drawingHeight + 300}`}
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
          <rect x="0" y="0" width={drawingWidth + margin * 2} height={drawingHeight + 300} fill="#101722" />
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
        />
        <rect
          x={outerX + frameInset}
          y={outerY + frameInset}
          width={outerW - frameInset * 2}
          height={outerH - frameInset * 2}
          fill={isTechnical ? "none" : isPresentation ? "#0d1521" : "#ffffff"}
          stroke={isTechnical ? "#69b95c" : isPresentation ? "#364a66" : "#c6ccd6"}
          strokeWidth="1.6"
        />

        {isTechnical && (
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

            currentX += widthPx;

            return (
              <g key={panel.id}>
                <rect
                  x={panelX}
                  y={panelY}
                  width={widthPx}
                  height={heightPx}
                  rx="4"
                  fill={isTechnical ? "url(#technicalGlassFill)" : "url(#glassFill)"}
                  stroke={
                    isTechnical
                      ? isSelected
                        ? "#c18dfc"
                        : isMultiSelected
                          ? "#f6c84a"
                          : "#69b95c"
                      : isSelected
                        ? "#f08a18"
                        : isMultiSelected
                          ? "#2d6cdf"
                          : isPresentation
                            ? "#d2b377"
                            : "#748090"
                  }
                  strokeWidth={isSelected ? "4.5" : isMultiSelected ? "3" : "1.4"}
                  filter={isTechnical ? undefined : "url(#panelShadow)"}
                  className="clickable-panel"
                  onClick={(event) => {
                    if (event.shiftKey && toolMode === "select") {
                      const exists = multiSelectionKeys.has(panelKey);
                      const nextSelection = exists
                        ? multiSelection.filter((item) => item.transomId !== transom.id || item.panelId !== panel.id)
                        : [...multiSelection, { transomId: transom.id, panelId: panel.id }];
                      onMultiSelectionChange(nextSelection);
                      selectPanel(transom.id, panel.id);
                      return;
                    }

                    onMultiSelectionChange([{ transomId: transom.id, panelId: panel.id }]);
                    selectPanel(transom.id, panel.id);
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
                <OpeningMarker
                  panel={panel}
                  x={panelX}
                  y={panelY}
                  width={widthPx}
                  height={heightPx}
                  technical={isTechnical || isPresentation}
                />
                <DimensionText
                  x={panelX + widthPx / 2}
                  y={outerY + outerH + 52}
                  text={String(panel.width)}
                  technical={isTechnical}
                />

                {isTechnical && (
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
                      stroke={isTechnical ? "#69b95c" : isPresentation ? "#d2b377" : "#aab1bc"}
                      strokeWidth="1"
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
                        selectPanel(transom.id, panel.id);
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
                  </g>
                )}
              </g>
            );
          });
        })}

        {transomOffsets.slice(1).map((offsetY) => (
          <g key={offsetY}>
            <rect
              x={outerX + frameInset}
              y={offsetY - mullionSize / 2}
              width={outerW - frameInset * 2}
              height={mullionSize}
              fill={isTechnical ? "none" : isPresentation ? "#1f3047" : "#dbdfe6"}
              stroke={isTechnical ? "#69b95c" : isPresentation ? "#d2b377" : "#aab1bc"}
              strokeWidth="1"
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
                selectPanel(aboveTransom.id, aboveTransom.panels[0].id);
                setDragState({
                  type: "horizontal",
                  transomId: aboveTransom.id,
                  startClientY: event.clientY,
                  startHeight: aboveTransom.height,
                  scale
                });
              }}
            />
          </g>
        ))}

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

        {selectedBounds && !isTechnical && (
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
            <line x1={cursor.x} y1="0" x2={cursor.x} y2={drawingHeight + 300} className="crosshair-line" />
            <line x1="0" y1={cursor.y} x2={drawingWidth + margin * 2} y2={cursor.y} className="crosshair-line" />
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
        </g>
      </svg>
    </div>
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
