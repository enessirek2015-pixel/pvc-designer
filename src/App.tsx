import { useEffect, useMemo, useState } from "react";
import { designTemplates } from "./data/sampleDesign";
import { useDesignerStore } from "./store/useDesignerStore";
import type { OpeningType, PanelDefinition, PvcDesign } from "./types/pvc";

const openingTypeOptions: Array<{ value: OpeningType; label: string; hint: string }> = [
  { value: "fixed", label: "Sabit", hint: "Acilmayan cam panel" },
  { value: "turn-right", label: "Sag Acilim", hint: "Sagdan menteeseli kanat" },
  { value: "turn-left", label: "Sol Acilim", hint: "Soldan menteeseli kanat" },
  { value: "tilt-turn-right", label: "Vasistas + Sag", hint: "Ustten vasistas, saga acilim" },
  { value: "sliding", label: "Surme", hint: "Yatay kayar kanat" }
];

const sampleTemplateId = designTemplates[0].id;

function App() {
  const [viewMode, setViewMode] = useState<"studio" | "technical">("studio");
  const {
    design,
    selected,
    activeProjectPath,
    setTotalWidth,
    setTotalHeight,
    setOuterFrameThickness,
    setMullionThickness,
    setDesignName,
    loadTemplate,
    replaceDesign,
    setSelectedOpeningType,
    setSelectedPanelWidth,
    setSelectedTransomHeight,
    splitSelectedPanelVertical,
    splitSelectedTransomHorizontal,
    deleteSelectedPanel,
    deleteSelectedTransom,
    insertPanelAdjacent,
    insertTransomAdjacent
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

  return (
    <div className="studio-shell">
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
            <button
              className={`hero-button ${viewMode === "technical" ? "primary" : "ghost"}`}
              onClick={() => setViewMode(viewMode === "studio" ? "technical" : "studio")}
            >
              {viewMode === "studio" ? "Teknik Moda Gec" : "Studyoya Don"}
            </button>
            <button className="hero-button ghost">PDF</button>
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
                <span className="canvas-chip">
                  {viewMode === "studio" ? "Studyo gorunumu" : "Teknik gorunum"}
                </span>
              </div>
            </div>

            <PvcCanvas
              design={design}
              selected={selected}
              onInsertPanel={insertPanelAdjacent}
              onInsertTransom={insertTransomAdjacent}
              viewMode={viewMode}
            />
          </section>

          <aside className="right-rail">
            <section className="inspector-card">
              <div className="section-title-row tight">
                <div>
                  <p className="eyebrow">Inspector</p>
                  <h3>Secili Eleman</h3>
                </div>
                <div className="mini-badge">{selectedPanel?.panel.label ?? "Yok"}</div>
              </div>

              {selectedPanel ? (
                <>
                  <div className="focus-card">
                    <strong>{selectedPanel.panel.label}</strong>
                    <span>{getOpeningLabel(selectedPanel.panel.openingType)}</span>
                    <span>
                      {selectedPanel.panel.width} x {selectedPanel.transom.height} mm
                    </span>
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
              ) : (
                <p className="soft-text">Duzenlemek icin cizim alani icinden bir panel sec.</p>
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

function PvcCanvas({
  design,
  selected,
  onInsertPanel,
  onInsertTransom,
  viewMode
}: {
  design: PvcDesign;
  selected: { transomId: string; panelId: string } | null;
  onInsertPanel: (side: "left" | "right") => void;
  onInsertTransom: (side: "top" | "bottom") => void;
  viewMode: "studio" | "technical";
}) {
  const selectPanel = useDesignerStore((state) => state.selectPanel);
  const setPanelWidthById = useDesignerStore((state) => state.setPanelWidthById);
  const setTransomHeightById = useDesignerStore((state) => state.setTransomHeightById);
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

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handleMove = (event: MouseEvent) => {
      if (dragState.type === "vertical") {
        const deltaPx = event.clientX - dragState.startClientX;
        const deltaMm = deltaPx / dragState.scale;
        setPanelWidthById(dragState.transomId, dragState.panelId, dragState.startWidth + deltaMm);
        return;
      }

      const deltaPx = event.clientY - dragState.startClientY;
      const deltaMm = deltaPx / dragState.scale;
      setTransomHeightById(dragState.transomId, dragState.startHeight + deltaMm);
    };

    const handleUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, setPanelWidthById, setTransomHeightById]);

  return (
    <div className={`canvas-wrap premium ${viewMode === "technical" ? "technical" : ""}`}>
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

        {viewMode === "technical" && (
          <rect x="0" y="0" width={drawingWidth + margin * 2} height={drawingHeight + 300} fill="#101722" />
        )}

        <rect
          x={outerX}
          y={outerY}
          width={outerW}
          height={outerH}
          fill={viewMode === "technical" ? "none" : "#f8f9fb"}
          stroke={viewMode === "technical" ? "#8acb6d" : "#8994a3"}
          strokeWidth="2.2"
          rx="8"
        />
        <rect
          x={outerX + frameInset}
          y={outerY + frameInset}
          width={outerW - frameInset * 2}
          height={outerH - frameInset * 2}
          fill={viewMode === "technical" ? "none" : "#ffffff"}
          stroke={viewMode === "technical" ? "#69b95c" : "#c6ccd6"}
          strokeWidth="1.6"
        />

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

            currentX += widthPx;

            return (
              <g key={panel.id}>
                <rect
                  x={panelX}
                  y={panelY}
                  width={widthPx}
                  height={heightPx}
                  rx="4"
                  fill={viewMode === "technical" ? "url(#technicalGlassFill)" : "url(#glassFill)"}
                  stroke={
                    viewMode === "technical"
                      ? isSelected
                        ? "#c18dfc"
                        : "#69b95c"
                      : isSelected
                        ? "#f08a18"
                        : "#748090"
                  }
                  strokeWidth={isSelected ? "4.5" : "1.4"}
                  filter={viewMode === "technical" ? undefined : "url(#panelShadow)"}
                  className="clickable-panel"
                  onClick={() => selectPanel(transom.id, panel.id)}
                />
                <text
                  x={panelX + widthPx / 2}
                  y={panelY + heightPx / 2 - 12}
                  textAnchor="middle"
                  className={viewMode === "technical" ? "svg-label technical-text-red" : "svg-label"}
                >
                  {viewMode === "technical"
                    ? `${Math.round(panel.width / 10)}x${Math.round(transom.height / 10)}`
                    : panel.label}
                </text>
                <text
                  x={panelX + widthPx / 2}
                  y={panelY + heightPx / 2 + 18}
                  textAnchor="middle"
                  className={viewMode === "technical" ? "svg-sub-label technical-text-green" : "svg-sub-label"}
                >
                  {viewMode === "technical" ? `QTA: ${panel.width}` : `${panel.width} x ${transom.height}`}
                </text>
                <OpeningMarker
                  panel={panel}
                  x={panelX}
                  y={panelY}
                  width={widthPx}
                  height={heightPx}
                  technical={viewMode === "technical"}
                />
                <DimensionText
                  x={panelX + widthPx / 2}
                  y={outerY + outerH + 52}
                  text={String(panel.width)}
                  technical={viewMode === "technical"}
                />

                {viewMode === "technical" && (
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
                      fill={viewMode === "technical" ? "none" : "#dbdfe6"}
                      stroke={viewMode === "technical" ? "#69b95c" : "#aab1bc"}
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
              fill={viewMode === "technical" ? "none" : "#dbdfe6"}
              stroke={viewMode === "technical" ? "#69b95c" : "#aab1bc"}
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
          technical={viewMode === "technical"}
        />
        <DimensionLine
          x1={outerX + outerW + 82}
          y1={outerY}
          x2={outerX + outerW + 82}
          y2={outerY + outerH}
          text={`${design.totalHeight} mm`}
          vertical
          technical={viewMode === "technical"}
        />

        {viewMode === "technical" && (
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

        {selectedBounds && (
          <>
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
      </svg>
    </div>
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
