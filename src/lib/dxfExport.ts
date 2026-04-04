import type { OpeningType, PvcDesign } from "../types/pvc";
import type { CanvasLayout, CanvasPanelLayout, CanvasRect } from "./canvasLayout";
import { glassCatalog, materialSystemCatalog, profileSeriesCatalog } from "./systemCatalog";

type LayerName =
  | "FRAME"
  | "MULLION"
  | "TRANSOM"
  | "GLASS"
  | "OPENING"
  | "DIMENSIONS"
  | "TEXT"
  | "TITLE"
  | "ANNOTATIONS";

const layerSpecs: Array<{ name: LayerName | "0"; color: number }> = [
  { name: "0", color: 7 },
  { name: "FRAME", color: 7 },
  { name: "MULLION", color: 3 },
  { name: "TRANSOM", color: 3 },
  { name: "GLASS", color: 4 },
  { name: "OPENING", color: 1 },
  { name: "DIMENSIONS", color: 2 },
  { name: "TEXT", color: 6 },
  { name: "TITLE", color: 5 },
  { name: "ANNOTATIONS", color: 140 }
];

function toMm(value: number, origin: number, span: number, totalMm: number) {
  if (!span) {
    return 0;
  }
  return Number((((value - origin) / span) * totalMm).toFixed(3));
}

function rectToMm(rect: CanvasRect, layout: CanvasLayout, design: PvcDesign) {
  const originX = layout.outerRect.x;
  const originY = layout.outerRect.y;
  const spanW = layout.outerRect.width;
  const spanH = layout.outerRect.height;
  const x = toMm(rect.x, originX, spanW, design.totalWidth);
  const y = toMm(rect.y, originY, spanH, design.totalHeight);
  const width = toMm(rect.x + rect.width, originX, spanW, design.totalWidth) - x;
  const height = toMm(rect.y + rect.height, originY, spanH, design.totalHeight) - y;

  return {
    x,
    y,
    width,
    height
  };
}

function escapeDxfText(value: string) {
  return value.replace(/\r?\n/g, " ");
}

function buildLayerTable() {
  const rows = layerSpecs.flatMap((layer) => [
    "0",
    "LAYER",
    "2",
    layer.name,
    "70",
    "0",
    "62",
    String(layer.color),
    "6",
    "CONTINUOUS"
  ]);

  return [
    "0",
    "SECTION",
    "2",
    "TABLES",
    "0",
    "TABLE",
    "2",
    "LAYER",
    "70",
    String(layerSpecs.length),
    ...rows,
    "0",
    "ENDTAB",
    "0",
    "ENDSEC"
  ];
}

function formatMm(value: number) {
  return `${Math.round(value)} mm`;
}

function addTextEntity(
  entities: string[],
  x: number,
  y: number,
  text: string,
  height = 28,
  layer: LayerName = "TEXT",
  rotation = 0
) {
  entities.push(
    "0",
    "TEXT",
    "8",
    layer,
    "10",
    String(x),
    "20",
    String(-y),
    "40",
    String(height),
    "1",
    escapeDxfText(text),
    "50",
    String(rotation)
  );
}

function addLineEntity(entities: string[], x1: number, y1: number, x2: number, y2: number, layer: LayerName) {
  entities.push(
    "0",
    "LINE",
    "8",
    layer,
    "10",
    String(x1),
    "20",
    String(-y1),
    "11",
    String(x2),
    "21",
    String(-y2)
  );
}

function addRectEntity(entities: string[], x: number, y: number, width: number, height: number, layer: LayerName) {
  addLineEntity(entities, x, y, x + width, y, layer);
  addLineEntity(entities, x + width, y, x + width, y + height, layer);
  addLineEntity(entities, x + width, y + height, x, y + height, layer);
  addLineEntity(entities, x, y + height, x, y, layer);
}

function addHorizontalDimension(
  entities: string[],
  x1: number,
  x2: number,
  objectY: number,
  dimensionY: number,
  label: string
) {
  addLineEntity(entities, x1, objectY, x1, dimensionY, "DIMENSIONS");
  addLineEntity(entities, x2, objectY, x2, dimensionY, "DIMENSIONS");
  addLineEntity(entities, x1, dimensionY, x2, dimensionY, "DIMENSIONS");
  addLineEntity(entities, x1, dimensionY - 8, x1 + 8, dimensionY + 8, "DIMENSIONS");
  addLineEntity(entities, x2, dimensionY - 8, x2 - 8, dimensionY + 8, "DIMENSIONS");
  addTextEntity(entities, (x1 + x2) / 2 - Math.max(20, label.length * 2.6), dimensionY - 12, label, 16, "DIMENSIONS");
}

function addVerticalDimension(
  entities: string[],
  y1: number,
  y2: number,
  objectX: number,
  dimensionX: number,
  label: string
) {
  addLineEntity(entities, objectX, y1, dimensionX, y1, "DIMENSIONS");
  addLineEntity(entities, objectX, y2, dimensionX, y2, "DIMENSIONS");
  addLineEntity(entities, dimensionX, y1, dimensionX, y2, "DIMENSIONS");
  addLineEntity(entities, dimensionX - 8, y1, dimensionX + 8, y1 + 8, "DIMENSIONS");
  addLineEntity(entities, dimensionX - 8, y2, dimensionX + 8, y2 - 8, "DIMENSIONS");
  addTextEntity(entities, dimensionX + 12, (y1 + y2) / 2 + 10, label, 16, "DIMENSIONS", 90);
}

function addOpeningMarker(
  entities: string[],
  panel: { openingType: OpeningType },
  glassRect: { x: number; y: number; width: number; height: number }
) {
  const left = glassRect.x;
  const right = glassRect.x + glassRect.width;
  const top = glassRect.y;
  const bottom = glassRect.y + glassRect.height;
  const midY = glassRect.y + glassRect.height / 2;
  const midX = glassRect.x + glassRect.width / 2;
  const tipRight = left + glassRect.width * 0.3;
  const tipLeft = left + glassRect.width * 0.7;

  switch (panel.openingType) {
    case "turn-right":
      addLineEntity(entities, right, top, tipRight, midY, "OPENING");
      addLineEntity(entities, right, bottom, tipRight, midY, "OPENING");
      break;
    case "turn-left":
      addLineEntity(entities, left, top, tipLeft, midY, "OPENING");
      addLineEntity(entities, left, bottom, tipLeft, midY, "OPENING");
      break;
    case "tilt-turn-right":
      addLineEntity(entities, right, top, tipRight, midY, "OPENING");
      addLineEntity(entities, right, bottom, tipRight, midY, "OPENING");
      addLineEntity(entities, left + 20, top + 20, right - 20, top + 20, "OPENING");
      addLineEntity(entities, midX, top + 20, midX - 24, top + 44, "OPENING");
      addLineEntity(entities, midX, top + 20, midX + 24, top + 44, "OPENING");
      break;
    case "tilt-turn-left":
      addLineEntity(entities, left, top, tipLeft, midY, "OPENING");
      addLineEntity(entities, left, bottom, tipLeft, midY, "OPENING");
      addLineEntity(entities, left + 20, top + 20, right - 20, top + 20, "OPENING");
      addLineEntity(entities, midX, top + 20, midX - 24, top + 44, "OPENING");
      addLineEntity(entities, midX, top + 20, midX + 24, top + 44, "OPENING");
      break;
    case "sliding":
      addLineEntity(entities, left + 18, midY, right - 18, midY, "OPENING");
      addLineEntity(entities, right - 18, midY, right - 40, midY - 14, "OPENING");
      addLineEntity(entities, right - 18, midY, right - 40, midY + 14, "OPENING");
      addLineEntity(entities, left + 18, midY - 22, right - 18, midY - 22, "OPENING");
      break;
    default:
      addLineEntity(entities, left + 14, top + 14, right - 14, bottom - 14, "OPENING");
      addLineEntity(entities, right - 14, top + 14, left + 14, bottom - 14, "OPENING");
      break;
  }
}

function addTitleBlock(entities: string[], design: PvcDesign) {
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const materialSpec = materialSystemCatalog[design.materials.materialSystem];
  const glassSpec = glassCatalog[design.materials.glassType];
  const blockWidth = 460;
  const blockHeight = 150;
  const x = Math.max(0, design.totalWidth - blockWidth);
  const y = design.totalHeight + 110;

  addRectEntity(entities, x, y, blockWidth, blockHeight, "TITLE");
  addLineEntity(entities, x, y + 44, x + blockWidth, y + 44, "TITLE");
  addLineEntity(entities, x + 260, y, x + 260, y + blockHeight, "TITLE");
  addLineEntity(entities, x + 360, y + 44, x + 360, y + blockHeight, "TITLE");
  addTextEntity(entities, x + 18, y + 28, "PVC DESIGNER - TEKNIK DXF", 24, "TITLE");
  addTextEntity(entities, x + 18, y + 72, `Proje: ${design.name}`, 16, "TEXT");
  addTextEntity(entities, x + 18, y + 96, `Musteri: ${design.customer.customerName || "-"}`, 16, "TEXT");
  addTextEntity(entities, x + 18, y + 120, `Kod: ${design.customer.projectCode || "-"}`, 16, "TEXT");
  addTextEntity(entities, x + 18, y + 144, `${materialSpec.label} / ${profileSpec.label}`, 16, "TEXT");
  addTextEntity(entities, x + 276, y + 72, `Cam: ${glassSpec.label}`, 16, "TEXT");
  addTextEntity(entities, x + 276, y + 96, `Boyut: ${design.totalWidth} x ${design.totalHeight}`, 16, "TEXT");
  addTextEntity(entities, x + 276, y + 120, `Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 16, "TEXT");
  addTextEntity(entities, x + 276, y + 144, "Olcek: 1:1 mm", 16, "TEXT");
}

function addPanelText(
  entities: string[],
  panelLayout: CanvasPanelLayout,
  label: string,
  widthMm: number,
  heightMm: number,
  glassLabel: string
) {
  const textX = panelLayout.centerX - Math.max(30, label.length * 3.4);
  addTextEntity(entities, textX, panelLayout.centerY - 10, label, 18, "TEXT");
  addTextEntity(entities, textX - 6, panelLayout.centerY + 14, `${widthMm}x${heightMm}`, 14, "ANNOTATIONS");
  addTextEntity(entities, textX - 6, panelLayout.centerY + 34, glassLabel, 12, "ANNOTATIONS");
}

export function buildDesignDxf(design: PvcDesign, layout: CanvasLayout) {
  const entities: string[] = [];
  const firstRow = layout.rows[0];

  addRectEntity(entities, 0, 0, design.totalWidth, design.totalHeight, "FRAME");
  addRectEntity(
    entities,
    design.outerFrameThickness,
    design.outerFrameThickness,
    Math.max(10, design.totalWidth - design.outerFrameThickness * 2),
    Math.max(10, design.totalHeight - design.outerFrameThickness * 2),
    "FRAME"
  );

  layout.verticalBars.forEach((bar) => {
    const rect = rectToMm(bar.rect, layout, design);
    addRectEntity(entities, rect.x, rect.y, rect.width, rect.height, "MULLION");
  });

  layout.horizontalBars.forEach((bar) => {
    const rect = rectToMm(bar.rect, layout, design);
    addRectEntity(entities, rect.x, rect.y, rect.width, rect.height, "TRANSOM");
  });

  layout.rows.forEach((row, rowIndex) => {
    const transom = design.transoms[rowIndex];
    row.panels.forEach((panelLayout, panelIndex) => {
      const panel = transom?.panels[panelIndex];
      if (!panel) {
        return;
      }

      const rect = rectToMm(panelLayout.bounds, layout, design);
      const glassInsetX = Math.max(18, Math.min(42, Math.round(rect.width * 0.08)));
      const glassInsetY = Math.max(18, Math.min(42, Math.round(rect.height * 0.08)));
      const glassRect = {
        x: rect.x + glassInsetX,
        y: rect.y + glassInsetY,
        width: Math.max(80, rect.width - glassInsetX * 2),
        height: Math.max(80, rect.height - glassInsetY * 2)
      };

      addRectEntity(entities, glassRect.x, glassRect.y, glassRect.width, glassRect.height, "GLASS");
      addOpeningMarker(entities, panel, glassRect);
      addPanelText(
        entities,
        panelLayout,
        `${panel.label || `P${panelIndex + 1}`}`,
        panel.width,
        transom.height,
        glassCatalog[design.materials.glassType].thicknessLabel
      );
    });
  });

  if (firstRow) {
    let currentX = 0;
    firstRow.panels.forEach((panel) => {
      addHorizontalDimension(
        entities,
        currentX,
        currentX + panel.widthMm,
        0,
        -60,
        formatMm(panel.widthMm)
      );
      currentX += panel.widthMm;
    });
  }

  addHorizontalDimension(entities, 0, design.totalWidth, 0, -120, formatMm(design.totalWidth));

  let currentY = 0;
  design.transoms.forEach((transom) => {
    addVerticalDimension(
      entities,
      currentY,
      currentY + transom.height,
      design.totalWidth,
      design.totalWidth + 60,
      formatMm(transom.height)
    );
    currentY += transom.height;
  });

  addVerticalDimension(
    entities,
    0,
    design.totalHeight,
    design.totalWidth,
    design.totalWidth + 120,
    formatMm(design.totalHeight)
  );

  addTextEntity(
    entities,
    0,
    design.totalHeight + 56,
    `${design.name} - ${design.totalWidth}x${design.totalHeight} mm`,
    24,
    "TITLE"
  );
  addTitleBlock(entities, design);

  return [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$ACADVER",
    "1",
    "AC1015",
    "0",
    "ENDSEC",
    ...buildLayerTable(),
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    ...entities,
    "0",
    "ENDSEC",
    "0",
    "EOF"
  ].join("\n");
}

export function downloadDxf(content: string, fileName: string) {
  const blob = new Blob([content], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
