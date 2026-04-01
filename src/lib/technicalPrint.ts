import type { OpeningType, PvcDesign } from "../types/pvc";
import { buildCanvasLayout } from "./canvasLayout";
import { buildDesignHealth, buildDesignSnapshot, buildPanelEngineering } from "./designEngine";
import { buildManufacturingReport, type ManufacturingGroup } from "./manufacturingEngine";
import { profileGeometryCatalog } from "./profileGeometryCatalog";
import { glassCatalog, hardwareCatalog, materialSystemCatalog, profileSeriesCatalog } from "./systemCatalog";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openingLabel(openingType: OpeningType) {
  switch (openingType) {
    case "turn-right":
      return "Sag Acilim";
    case "turn-left":
      return "Sol Acilim";
    case "tilt-turn-right":
      return "Vasistas + Sag";
    case "sliding":
      return "Surme";
    default:
      return "Sabit";
  }
}

function groupLabel(group: ManufacturingGroup) {
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
      return "Donanim";
    default:
      return group;
  }
}

function buildSheetRegister(pageLabel: string, drawingCode: string, revisionTag: string, issueStatus: string, profileLabel: string) {
  return `
    <div class="sheet-register">
      <div class="sheet-register-group">
        <span class="register-chip primary">${escapeHtml(pageLabel)}</span>
        <span class="register-chip">${escapeHtml(drawingCode)}</span>
        <span class="register-chip">${escapeHtml(profileLabel)}</span>
      </div>
      <div class="sheet-register-group">
        <span class="register-chip">REV ${escapeHtml(revisionTag)}</span>
        <span class="register-chip status">${escapeHtml(issueStatus)}</span>
        <span class="register-chip">${escapeHtml(formatToday())}</span>
      </div>
    </div>
  `;
}

function buildApprovalGrid(design: PvcDesign, revisionTag: string, issueStatus: string) {
  return `
    <div class="approval-grid">
      <div class="approval-cell"><span>Cizen</span><strong>PVC Designer</strong></div>
      <div class="approval-cell"><span>Kontrol</span><strong>${escapeHtml(issueStatus)}</strong></div>
      <div class="approval-cell"><span>Revizyon</span><strong>${escapeHtml(revisionTag)}</strong></div>
      <div class="approval-cell"><span>Proje</span><strong>${escapeHtml(design.customer.projectCode || "PRJ-000")}</strong></div>
    </div>
  `;
}

function buildDetailSketchMarkup(geometrySpec: (typeof profileGeometryCatalog)[keyof typeof profileGeometryCatalog]) {
  const frameLines = geometrySpec.frameLines
    .map(
      (ratio, index) =>
        `<span class="detail-sketch-line frame" style="left:${Math.round(ratio * 1000) / 10}%;" data-index="${index}"></span>`
    )
    .join("");
  const sashLines = geometrySpec.sashLines
    .map(
      (ratio, index) =>
        `<span class="detail-sketch-line sash" style="left:${Math.round(ratio * 1000) / 10}%;" data-index="${index}"></span>`
    )
    .join("");
  const thermalBands = geometrySpec.thermalBands
    .map(
      (ratio, index) =>
        `<span class="detail-sketch-line thermal" style="left:${Math.round(ratio * 1000) / 10}%;" data-index="${index}"></span>`
    )
    .join("");
  const drains = geometrySpec.drainageSlots
    .map(
      (ratio, index) =>
        `<span class="detail-sketch-drain" style="left:calc(${Math.round(ratio * 1000) / 10}% - 9px);" data-index="${index}"></span>`
    )
    .join("");
  const chips = geometrySpec.detailRefs
    .slice(0, 3)
    .map((item) => `<span class="detail-sketch-ref">${escapeHtml(item)}</span>`)
    .join("");

  return `
    <div class="detail-sketch">
      <div class="detail-sketch-frame"></div>
      <div class="detail-sketch-sash"></div>
      <div class="detail-sketch-glass"></div>
      ${frameLines}
      ${sashLines}
      ${thermalBands}
      ${drains}
      <div class="detail-sketch-meta">
        <span class="detail-sketch-code">${escapeHtml(geometrySpec.officialCode)}</span>
        <span class="detail-sketch-note">${escapeHtml(geometrySpec.note)}</span>
      </div>
      <div class="detail-sketch-ref-row">${chips}</div>
    </div>
  `;
}

function formatToday() {
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function buildTechnicalPrintSvg(design: PvcDesign) {
  const svgWidth = 980;
  const svgHeight = 580;
  const geometrySpec = profileGeometryCatalog[design.materials.profileSeries];
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const materialSpec = materialSystemCatalog[design.materials.materialSystem];
  const scale = Math.min(720 / design.totalWidth, 400 / design.totalHeight);
  const outerWidth = Math.round(design.totalWidth * scale);
  const outerHeight = Math.round(design.totalHeight * scale);
  const outerRect = {
    x: 90,
    y: 92,
    width: outerWidth,
    height: outerHeight
  };
  const layout = buildCanvasLayout(design, outerRect, scale);
  const drawingCode = `${geometrySpec.officialCode}-${design.totalWidth}x${design.totalHeight}`;

  const panelMarkup = layout.rows
    .flatMap((row, rowIndex) =>
      row.panels.map((panel, panelIndex) => {
        const sourcePanel = design.transoms[rowIndex]?.panels[panelIndex];
        if (!sourcePanel) {
          return "";
        }

        const label = `${rowIndex + 1}.${panelIndex + 1}`;
        return `
          <g>
            <rect x="${panel.bounds.x}" y="${panel.bounds.y}" width="${panel.bounds.width}" height="${panel.bounds.height}" class="panel-fill" />
            <text x="${panel.bounds.x + panel.bounds.width / 2}" y="${panel.bounds.y + panel.bounds.height / 2 - 8}" text-anchor="middle" class="panel-label">${escapeHtml(label)}</text>
            <text x="${panel.bounds.x + panel.bounds.width / 2}" y="${panel.bounds.y + panel.bounds.height / 2 + 10}" text-anchor="middle" class="panel-meta">${escapeHtml(openingLabel(sourcePanel.openingType))}</text>
            <text x="${panel.bounds.x + panel.bounds.width / 2}" y="${panel.bounds.y + panel.bounds.height - 10}" text-anchor="middle" class="panel-size">${sourcePanel.width} x ${design.transoms[rowIndex].height}</text>
          </g>
        `;
      })
    )
    .join("");

  const detailMarkerMarkup = layout.rows
    .flatMap((row) => row.panels.map((panel) => ({ row, panel })))
    .slice(0, 6)
    .map(({ panel }, index) => {
      const badgeX = panel.bounds.x + panel.bounds.width - 18;
      const badgeY = panel.bounds.y + 18;
      return `
        <g>
          <circle cx="${badgeX}" cy="${badgeY}" r="12" class="detail-badge" />
          <text x="${badgeX}" y="${badgeY + 4}" text-anchor="middle" class="detail-badge-text">D${index + 1}</text>
        </g>
      `;
    })
    .join("");

  const mullionMarkup = layout.verticalBars
    .map(
      (bar) =>
        `<rect x="${bar.rect.x}" y="${bar.rect.y}" width="${bar.rect.width}" height="${bar.rect.height}" class="profile-fill" />`
    )
    .join("");

  const transomMarkup = layout.horizontalBars
    .map(
      (bar) =>
        `<rect x="${bar.rect.x}" y="${bar.rect.y}" width="${bar.rect.width}" height="${bar.rect.height}" class="profile-fill" />`
    )
    .join("");

  const columnDims = layout.rows[0]?.panels
    .map((panel) => {
      return `
        <g>
          <line x1="${panel.cellBounds.x}" y1="${outerRect.y + outerRect.height + 26}" x2="${panel.cellBounds.x + panel.cellBounds.width}" y2="${outerRect.y + outerRect.height + 26}" class="dim-line" />
          <line x1="${panel.cellBounds.x}" y1="${outerRect.y + outerRect.height + 18}" x2="${panel.cellBounds.x}" y2="${outerRect.y + outerRect.height + 34}" class="dim-line" />
          <line x1="${panel.cellBounds.x + panel.cellBounds.width}" y1="${outerRect.y + outerRect.height + 18}" x2="${panel.cellBounds.x + panel.cellBounds.width}" y2="${outerRect.y + outerRect.height + 34}" class="dim-line" />
          <text x="${panel.cellBounds.x + panel.cellBounds.width / 2}" y="${outerRect.y + outerRect.height + 20}" text-anchor="middle" class="dim-text">${panel.widthMm}</text>
        </g>
      `;
    })
    .join("");

  const rowDims = layout.rows
    .map((row) => {
      return `
        <g>
          <line x1="${outerRect.x + outerRect.width + 26}" y1="${row.cellBounds.y}" x2="${outerRect.x + outerRect.width + 26}" y2="${row.cellBounds.y + row.cellBounds.height}" class="dim-line" />
          <line x1="${outerRect.x + outerRect.width + 18}" y1="${row.cellBounds.y}" x2="${outerRect.x + outerRect.width + 34}" y2="${row.cellBounds.y}" class="dim-line" />
          <line x1="${outerRect.x + outerRect.width + 18}" y1="${row.cellBounds.y + row.cellBounds.height}" x2="${outerRect.x + outerRect.width + 34}" y2="${row.cellBounds.y + row.cellBounds.height}" class="dim-line" />
          <text x="${outerRect.x + outerRect.width + 32}" y="${row.cellBounds.y + row.cellBounds.height / 2 + 4}" class="dim-text dim-text-vertical">${row.heightMm}</text>
        </g>
      `;
    })
    .join("");

  const gridMarkup = Array.from({ length: Math.floor((svgWidth - 32) / 36) }, (_, index) => {
    const x = 16 + index * 36;
    return `<line x1="${x}" y1="16" x2="${x}" y2="${svgHeight - 16}" class="sheet-grid" />`;
  }).join("") +
    Array.from({ length: Math.floor((svgHeight - 32) / 28) }, (_, index) => {
      const y = 16 + index * 28;
      return `<line x1="16" y1="${y}" x2="${svgWidth - 16}" y2="${y}" class="sheet-grid" />`;
    }).join("");

  const titleBlockX = svgWidth - 286;
  const titleBlockY = svgHeight - 124;
  const titleBlockMarkup = `
    <g transform="translate(${titleBlockX} ${titleBlockY})">
      <rect width="250" height="88" rx="14" class="sheet-title-block" />
      <rect x="12" y="12" width="86" height="28" rx="8" class="sheet-title-pill" />
      <text x="55" y="30" text-anchor="middle" class="sheet-title-pill-text">SAYFA 01</text>
      <text x="110" y="26" class="sheet-title-caption">CIZIM KODU</text>
      <text x="110" y="40" class="sheet-title-text">${escapeHtml(drawingCode)}</text>
      <text x="12" y="58" class="sheet-title-caption">SISTEM</text>
      <text x="12" y="72" class="sheet-title-text">${escapeHtml(materialSpec.label)} / ${escapeHtml(profileSpec.label)}</text>
      <text x="160" y="58" class="sheet-title-caption">DETAY</text>
      <text x="160" y="72" class="sheet-title-text">${escapeHtml(geometrySpec.officialName)}</text>
    </g>
  `;

  const sectionLegendMarkup = `
    <g transform="translate(36 ${svgHeight - 112})">
      <rect width="214" height="76" rx="14" class="sheet-legend-block" />
      <text x="16" y="22" class="sheet-title-caption">KESIT REFERANSLARI</text>
      <text x="16" y="40" class="sheet-title-text">${escapeHtml(geometrySpec.detailRefs.join(" / "))}</text>
      <text x="16" y="58" class="sheet-title-caption">${escapeHtml(geometrySpec.note)}</text>
    </g>
  `;

  return `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="technical-sheet-svg" role="img" aria-label="Teknik pafta">
      ${gridMarkup}
      <rect x="12" y="12" width="${svgWidth - 24}" height="${svgHeight - 24}" rx="18" class="sheet-frame" />
      <rect x="${outerRect.x}" y="${outerRect.y}" width="${outerRect.width}" height="${outerRect.height}" class="outer-frame" />
      <rect x="${layout.innerRect.x}" y="${layout.innerRect.y}" width="${layout.innerRect.width}" height="${layout.innerRect.height}" class="inner-frame" />
      ${panelMarkup}
      ${detailMarkerMarkup}
      ${mullionMarkup}
      ${transomMarkup}
      ${columnDims}
      ${rowDims}
      <line x1="${outerRect.x}" y1="${outerRect.y - 34}" x2="${outerRect.x + outerRect.width}" y2="${outerRect.y - 34}" class="dim-line" />
      <text x="${outerRect.x + outerRect.width / 2}" y="${outerRect.y - 40}" text-anchor="middle" class="dim-text">${design.totalWidth} mm</text>
      <line x1="${outerRect.x - 34}" y1="${outerRect.y}" x2="${outerRect.x - 34}" y2="${outerRect.y + outerRect.height}" class="dim-line" />
      <text x="${outerRect.x - 42}" y="${outerRect.y + outerRect.height / 2}" class="dim-text dim-text-vertical">${design.totalHeight} mm</text>
      ${sectionLegendMarkup}
      ${titleBlockMarkup}
      <text x="24" y="28" class="sheet-title">TEKNIK PERSPEKTIF / SAYFA 01</text>
      <text x="${svgWidth - 24}" y="28" text-anchor="end" class="sheet-title">PVC DESIGNER</text>
    </svg>
  `;
}

export function buildTechnicalPrintHtml(design: PvcDesign) {
  const snapshot = buildDesignSnapshot(design);
  const health = buildDesignHealth(design);
  const report = buildManufacturingReport(design);
  const geometrySpec = profileGeometryCatalog[design.materials.profileSeries];
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const glassSpec = glassCatalog[design.materials.glassType];
  const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];
  const materialSpec = materialSystemCatalog[design.materials.materialSystem];
  const revisionTag = `R${String(Math.min(99, snapshot.panelCount + snapshot.transomCount)).padStart(2, "0")}`;
  const issueStatus = health.errors > 0 ? "Kontrol Gerekli" : health.warnings > 0 ? "Revizyonlu" : "Uretime Hazir";
  const drawingCode = `${geometrySpec.officialCode}-${design.totalWidth}x${design.totalHeight}`;

  const panelRows = design.transoms
    .flatMap((transom, rowIndex) =>
      transom.panels.map((panel, panelIndex) => {
        const engineering = buildPanelEngineering(design, panel.width, transom.height, panel.openingType);
        const isOperable = panel.openingType !== "fixed";
        const oversize =
          isOperable &&
          (panel.width > profileSpec.maxOperableWidthMm ||
            transom.height > profileSpec.maxOperableHeightMm ||
            engineering.approxGlassAreaM2 > profileSpec.maxOperableAreaM2);
        const nearLimit =
          isOperable &&
          !oversize &&
          (panel.width > profileSpec.maxOperableWidthMm * 0.92 ||
            transom.height > profileSpec.maxOperableHeightMm * 0.92 ||
            engineering.approxSashWeightKg > hardwareSpec.maxSashWeightKg * 0.92);
        const overweight = isOperable && engineering.approxSashWeightKg > hardwareSpec.maxSashWeightKg;
        const status = oversize || overweight ? "error" : nearLimit ? "warning" : "ok";
        const statusLabel =
          oversize || overweight
            ? "Riskli"
            : nearLimit
              ? "Sinira Yakin"
              : "Uygun";
        return {
          ref: `${rowIndex + 1}.${panelIndex + 1}`,
          opening: openingLabel(panel.openingType),
          gross: `${panel.width} x ${transom.height} mm`,
          sash: `${Math.round(engineering.approxSashWidthMm)} x ${Math.round(engineering.approxSashHeightMm)} mm`,
          glass: `${Math.round(engineering.approxGlassWidthMm)} x ${Math.round(engineering.approxGlassHeightMm)} mm`,
          glassArea: engineering.approxGlassAreaM2.toFixed(2),
          weight: engineering.approxSashWeightKg.toFixed(1),
          status,
          statusLabel,
          sectionRefs: ["A-A", "B-B", "C-C"],
          detailNote:
            oversize || overweight
              ? "Kanat veya agirlik limiti kritik seviyede."
              : nearLimit
                ? "Panel olculeri seri limitine yakin."
                : "Panel seri ve donanim limitleri icinde."
        };
      })
    )
    .slice(0, 12);

  const cutRows = report.cutList
    .slice(0, 38)
    .map((item) => {
      const sizeText = item.lengthMm
        ? `${item.lengthMm} mm`
        : item.widthMm && item.heightMm
          ? `${item.widthMm} x ${item.heightMm} mm`
          : "-";

      return `
        <tr>
          <td>${escapeHtml(groupLabel(item.group))}</td>
          <td>${escapeHtml(item.part)}</td>
          <td>${escapeHtml(item.material)}</td>
          <td>${item.quantity}</td>
          <td>${escapeHtml(sizeText)}</td>
          <td>${escapeHtml(item.note ?? "-")}</td>
        </tr>
      `;
    })
    .join("");

  const diagnosticRows =
    health.diagnostics.length > 0
      ? health.diagnostics
          .slice(0, 8)
          .map(
            (diagnostic) => `
              <li>
                <strong>${escapeHtml(diagnostic.title)}</strong>
                <span>${escapeHtml(diagnostic.detail)}</span>
              </li>
            `
          )
          .join("")
      : `<li><strong>Durum</strong><span>Proje saglik kontrolunde kritik hata bulunmadi.</span></li>`;

  const panelTableRows = panelRows
    .map(
      (row) => `
        <tr>
          <td>${row.ref}</td>
          <td>${escapeHtml(row.opening)}</td>
          <td>${escapeHtml(row.gross)}</td>
          <td>${escapeHtml(row.sash)}</td>
          <td>${escapeHtml(row.glass)}</td>
          <td>${row.glassArea} m2</td>
          <td>${row.weight} kg</td>
        </tr>
      `
    )
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(design.name)} Teknik Pafta</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Segoe UI, Arial, sans-serif; color: #152235; background: #eef3f8; }
        .page { position: relative; width: 100%; min-height: 180mm; background: #ffffff; border: 1px solid #d9e3ef; border-radius: 18px; margin: 0 0 10mm; padding: 18px; page-break-after: always; overflow: hidden; }
        .page::before { content: ""; position: absolute; inset: 10px; border: 1px solid #d6e0ea; border-radius: 14px; pointer-events: none; }
        .page:last-child { page-break-after: auto; }
        .page-shell { position: relative; z-index: 1; }
        .sheet-register { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 14px; padding: 10px 12px; border: 1px solid #d8e2ee; border-radius: 14px; background: linear-gradient(180deg, #fbfdff 0%, #f2f6fb 100%); }
        .sheet-register-group { display: flex; flex-wrap: wrap; gap: 8px; }
        .register-chip { display: inline-flex; align-items: center; justify-content: center; min-height: 28px; padding: 0 12px; border-radius: 999px; background: #edf3fa; color: #2a425d; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .register-chip.primary { background: #183657; color: #f3f8fe; }
        .register-chip.status { background: #efe8d0; color: #745b14; }
        .title-row { display: flex; justify-content: space-between; gap: 18px; align-items: stretch; }
        .title-block, .meta-block, .summary-block, .diagnostic-block, .table-block { border: 1px solid #d8e2ee; border-radius: 16px; background: #f9fbfd; }
        .title-block { flex: 1.3; padding: 16px 18px; }
        .meta-block { flex: 1; padding: 16px 18px; }
        .title-banner { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 12px; }
        .title-code { min-width: 190px; padding: 12px 14px; border-radius: 14px; background: linear-gradient(180deg, #11223a 0%, #183657 100%); color: #f3f8fe; }
        .title-code span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.76; margin-bottom: 5px; }
        .title-code strong { display: block; font-size: 14px; letter-spacing: 0.05em; }
        .approval-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
        .approval-cell { border: 1px solid #d8e2ee; border-radius: 12px; background: #ffffff; padding: 8px 10px; min-height: 52px; }
        .approval-cell span { display: block; color: #667789; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .approval-cell strong { display: block; color: #152235; font-size: 12px; }
        h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0.04em; }
        h2 { margin: 0 0 12px; font-size: 16px; }
        .eyebrow { margin: 0 0 6px; color: #42648f; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 14px; font-size: 12px; }
        .meta-grid div span { display: block; color: #667789; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
        .sheet-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) 320px; gap: 18px; margin-top: 18px; }
        .sheet-layout.secondary { grid-template-columns: minmax(0, 1fr); }
        .summary-block, .diagnostic-block, .table-block { padding: 14px 16px; }
        .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .summary-chip { border-radius: 14px; padding: 10px 12px; background: #eef4fb; }
        .summary-chip span { display: block; color: #60758d; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .summary-chip strong { font-size: 15px; color: #16253a; }
        .diagnostic-block ul { margin: 0; padding-left: 18px; display: grid; gap: 10px; }
        .diagnostic-block li { display: grid; gap: 2px; font-size: 12px; }
        .technical-sheet-svg { width: 100%; height: auto; display: block; background: #0c1220; border-radius: 18px; }
        .sheet-grid { stroke: rgba(120, 155, 109, 0.12); stroke-width: 0.8; }
        .sheet-frame { fill: #111a2a; stroke: #4d8a57; stroke-width: 1.4; }
        .outer-frame { fill: none; stroke: #86d16b; stroke-width: 1.6; }
        .inner-frame { fill: none; stroke: #6bbc59; stroke-width: 1; }
        .profile-fill { fill: rgba(107, 188, 89, 0.18); stroke: #6bbc59; stroke-width: 1; }
        .panel-fill { fill: rgba(106, 168, 218, 0.18); stroke: #7fcaea; stroke-width: 0.9; }
        .panel-label { fill: #ff5757; font-size: 12px; font-weight: 800; }
        .panel-meta, .panel-size, .dim-text, .sheet-title { fill: #9be07d; font-size: 10px; font-weight: 700; }
        .sheet-title-block { fill: rgba(17, 28, 44, 0.94); stroke: rgba(244, 223, 177, 0.32); stroke-width: 1.2; }
        .sheet-title-pill { fill: rgba(74, 124, 242, 0.16); stroke: rgba(120, 202, 255, 0.42); stroke-width: 1; }
        .sheet-title-pill-text { fill: #dcecff; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }
        .sheet-title-caption { fill: rgba(244, 223, 177, 0.72); font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .sheet-title-text { fill: #f4f8fd; font-size: 10px; font-weight: 700; }
        .sheet-legend-block { fill: rgba(17, 28, 44, 0.92); stroke: rgba(120, 202, 255, 0.26); stroke-width: 1; }
        .detail-badge { fill: #20304d; stroke: #f3f7fb; stroke-width: 1; }
        .detail-badge-text { fill: #f7fbff; font-size: 10px; font-weight: 800; }
        .dim-text-vertical { writing-mode: vertical-rl; glyph-orientation-vertical: 0; }
        .dim-line { stroke: #9be07d; stroke-width: 1; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #dde6f0; padding: 9px 8px; text-align: left; font-size: 12px; vertical-align: top; }
        th { color: #5e738a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
        .footer-note { margin-top: 10px; color: #667789; font-size: 11px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 18px; }
        .detail-card { border: 1px solid #d8e2ee; border-radius: 16px; background: #f9fbfd; padding: 14px 16px; }
        .detail-card.warning { border-color: #f0d489; background: linear-gradient(180deg, #fffaf0 0%, #fdf8ee 100%); }
        .detail-card.error { border-color: #efb3b3; background: linear-gradient(180deg, #fff5f5 0%, #fff2f2 100%); }
        .detail-card-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; }
        .detail-chip { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 28px; padding: 0 10px; border-radius: 999px; background: #1d3557; color: #f7fbff; font-size: 11px; font-weight: 800; }
        .detail-chip.warning { background: #7a5b12; color: #fff3ca; }
        .detail-chip.error { background: #7c1f2a; color: #ffd7d7; }
        .detail-chip.subtle { background: #eaf0f7; color: #29415e; }
        .detail-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .detail-note { margin-top: 10px; color: #516479; font-size: 11px; line-height: 1.45; }
        .detail-page-note { margin-top: 10px; color: #667789; font-size: 11px; }
        .page:nth-of-type(3) .title-block > .footer-note { display: none; }
        .page-footer { margin-top: 14px; display: flex; justify-content: space-between; gap: 12px; color: #6b7d91; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; }
        .detail-sketch { margin-top: 10px; width: 100%; height: 132px; border-radius: 14px; background: linear-gradient(180deg, #182337 0%, #0f1727 100%); position: relative; overflow: hidden; }
        .detail-sketch-frame { position: absolute; inset: 14px; border: 2px solid #8ad06d; }
        .detail-sketch-sash { position: absolute; inset: 26px; border: 2px solid #bfd2e8; }
        .detail-sketch-glass { position: absolute; inset: 38px; background: linear-gradient(180deg, rgba(93, 153, 212, 0.45), rgba(69, 124, 179, 0.18)); border: 1px solid rgba(193, 230, 255, 0.45); }
        .detail-sketch-line { position: absolute; top: 16px; bottom: 16px; width: 0; border-left: 1px dashed rgba(120, 202, 255, 0.36); }
        .detail-sketch-line.frame { border-left-color: rgba(138, 208, 109, 0.58); top: 14px; bottom: 14px; }
        .detail-sketch-line.sash { border-left-color: rgba(201, 217, 233, 0.52); top: 26px; bottom: 26px; }
        .detail-sketch-line.thermal { border-left: 1px solid rgba(244, 223, 177, 0.8); top: 18px; bottom: 18px; }
        .detail-sketch-drain { position: absolute; bottom: 18px; width: 18px; height: 2px; border-radius: 999px; background: rgba(120, 202, 255, 0.86); }
        .detail-sketch-meta { position: absolute; left: 14px; right: 14px; bottom: 10px; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .detail-sketch-code { display: inline-flex; align-items: center; min-height: 22px; padding: 0 9px; border-radius: 999px; background: rgba(244, 223, 177, 0.14); color: #f7e7bf; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }
        .detail-sketch-note { color: rgba(224, 234, 244, 0.8); font-size: 10px; text-align: right; }
        .detail-sketch-ref-row { position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; }
        .detail-sketch-ref { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 22px; padding: 0 8px; border-radius: 999px; background: rgba(17, 34, 58, 0.82); color: #eff6fd; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; }
        .detail-card table td, .detail-card table th { font-size: 11px; padding: 7px 6px; }
      </style>
    </head>
    <body>
      <section class="page">
        <div class="page-shell">
        ${buildSheetRegister("Sayfa 01 / 03", drawingCode, revisionTag, issueStatus, profileSpec.label)}
        <div class="title-row">
          <div class="title-block">
            <div class="title-banner">
              <div>
                <p class="eyebrow">Teknik Pafta</p>
                <h1>${escapeHtml(design.name)}</h1>
              </div>
              <div class="title-code">
                <span>Cizim Kodu</span>
                <strong>${escapeHtml(drawingCode)}</strong>
              </div>
            </div>
            <div class="meta-grid">
              <div><span>Musteri</span>${escapeHtml(design.customer.customerName || "Musteri tanimsiz")}</div>
              <div><span>Proje Kodu</span>${escapeHtml(design.customer.projectCode || "PRJ-000")}</div>
              <div><span>Olcu</span>${design.totalWidth} x ${design.totalHeight} mm</div>
              <div><span>Tarih</span>${formatToday()}</div>
              <div><span>Sistem</span>${escapeHtml(materialSpec.label)}</div>
              <div><span>Profil</span>${escapeHtml(profileSpec.label)}</div>
              <div><span>Cam</span>${escapeHtml(glassSpec.label)} / ${escapeHtml(glassSpec.thicknessLabel)}</div>
              <div><span>Donanim</span>${escapeHtml(hardwareSpec.label)}</div>
            </div>
            ${buildApprovalGrid(design, revisionTag, issueStatus)}
          </div>
          <div class="meta-block">
            <p class="eyebrow">Uretim Durumu</p>
            <div class="meta-grid">
              <div><span>Panel</span>${snapshot.panelCount}</div>
              <div><span>Satir</span>${snapshot.transomCount}</div>
              <div><span>Acilir</span>${snapshot.openingCount}</div>
              <div><span>Sabit</span>${snapshot.fixedCount}</div>
              <div><span>Profil</span>${report.profileLengthMeters.toFixed(2)} m</div>
              <div><span>Cam</span>${report.glassAreaM2.toFixed(2)} m2</div>
              <div><span>Saglik</span>${health.status.toUpperCase()}</div>
              <div><span>Skor</span>${health.score}/100</div>
              <div><span>Seri Kod</span>${escapeHtml(geometrySpec.officialCode)}</div>
              <div><span>Kesit</span>${escapeHtml(geometrySpec.chamberLabel)}</div>
            </div>
          </div>
        </div>

        <div class="sheet-layout">
          <div class="table-block">
            <h2>Genel Gorunum</h2>
            ${buildTechnicalPrintSvg(design)}
          </div>
          <div style="display:grid; gap:18px;">
            <div class="summary-block">
              <h2>Malzeme Ozeti</h2>
              <div class="summary-grid">
                <div class="summary-chip"><span>Kasa / Kayit</span><strong>${design.outerFrameThickness} / ${design.mullionThickness} mm</strong></div>
                <div class="summary-chip"><span>Cam Kalinligi</span><strong>${escapeHtml(glassSpec.thicknessLabel)}</strong></div>
                <div class="summary-chip"><span>Mentese</span><strong>${report.hingeCount} adet</strong></div>
                <div class="summary-chip"><span>Derinlik</span><strong>${profileSpec.depthMm} mm</strong></div>
              </div>
            </div>
            <div class="diagnostic-block">
              <h2>Proje Sagligi</h2>
              <ul>${diagnosticRows}</ul>
            </div>
          </div>
        </div>

        <div class="table-block" style="margin-top:18px;">
          <h2>Panel / Kanat Takvimi</h2>
          <table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Tip</th>
                <th>Brut</th>
                <th>Net Kanat</th>
                <th>Net Cam</th>
                <th>Cam Alan</th>
                <th>Tahmini Kg</th>
              </tr>
            </thead>
            <tbody>${panelTableRows}</tbody>
          </table>
        </div>
        <div class="page-footer">
          <span>Sayfa 01 / 03</span>
          <span>${escapeHtml(revisionTag)} / ${escapeHtml(issueStatus)}</span>
          <span>${escapeHtml(profileSpec.label)} / ${escapeHtml(materialSpec.label)}</span>
        </div>
        </div>
      </section>

      <section class="page">
        <div class="page-shell">
        ${buildSheetRegister("Sayfa 02 / 03", drawingCode, revisionTag, issueStatus, "Kesim / Uretim")}
        <div class="title-row">
          <div class="title-block">
            <div class="title-banner">
              <div>
                <p class="eyebrow">Uretim Cikti</p>
                <h1>${escapeHtml(design.name)} Kesim ve Malzeme Listesi</h1>
              </div>
              <div class="title-code">
                <span>Seri / Sistem</span>
                <strong>${escapeHtml(geometrySpec.officialCode)} / ${escapeHtml(materialSpec.label)}</strong>
              </div>
            </div>
            <div class="footer-note">Bu sayfa yazdir veya Microsoft Print to PDF ile teknik pafta olarak alinabilir.</div>
            ${buildApprovalGrid(design, revisionTag, issueStatus)}
          </div>
          <div class="meta-block">
            <p class="eyebrow">Malzeme Serisi</p>
            <div class="meta-grid">
              <div><span>Sistem</span>${escapeHtml(materialSpec.label)}</div>
              <div><span>Profil</span>${escapeHtml(profileSpec.label)}</div>
              <div><span>Cam</span>${escapeHtml(glassSpec.buildUp)}</div>
              <div><span>Donanim</span>${escapeHtml(hardwareSpec.label)}</div>
              <div><span>Adres</span>${escapeHtml(design.customer.address || "Adres girilmedi")}</div>
              <div><span>Not</span>${escapeHtml(design.customer.notes || "Teknik not girilmedi")}</div>
              <div><span>Geometri</span>${escapeHtml(geometrySpec.officialName)}</div>
              <div><span>Detay Ref</span>${escapeHtml(geometrySpec.detailRefs.join(" / "))}</div>
            </div>
          </div>
        </div>

        <div class="two-col" style="margin-top:18px;">
          <div class="summary-block">
            <h2>Kesim Ozetleri</h2>
            <div class="summary-grid">
              <div class="summary-chip"><span>Toplam Kalem</span><strong>${report.cutList.length}</strong></div>
              <div class="summary-chip"><span>Profil Toplami</span><strong>${report.profileLengthMeters.toFixed(2)} m</strong></div>
              <div class="summary-chip"><span>Cam Toplami</span><strong>${report.glassAreaM2.toFixed(2)} m2</strong></div>
              <div class="summary-chip"><span>Acilir</span><strong>${report.openingPanels}</strong></div>
            </div>
          </div>
          <div class="summary-block">
            <h2>Notlar</h2>
            <div class="footer-note">
              Kesim listesi seri, sistem ve cam secimlerine gore netlestirilmis yaklasik uretim ciktisidir.
              Nihai siparis oncesi atolyede seri dogrulamasi yapilmasi onerilir.
            </div>
          </div>
        </div>

        <div class="table-block" style="margin-top:18px;">
          <h2>Kesim Listesi</h2>
          <table>
            <thead>
              <tr>
                <th>Grup</th>
                <th>Parca</th>
                <th>Malzeme</th>
                <th>Adet</th>
                <th>Olcu</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>${cutRows}</tbody>
          </table>
        </div>
        <div class="page-footer">
          <span>Sayfa 02 / 03</span>
          <span>${escapeHtml(revisionTag)} / ${escapeHtml(issueStatus)}</span>
          <span>Kesim / Uretim Ciktisi</span>
        </div>
        </div>
      </section>

      <section class="page">
        <div class="page-shell">
        ${buildSheetRegister("Sayfa 03 / 03", drawingCode, revisionTag, issueStatus, "Detay / Kesit")}
        <div class="title-row">
          <div class="title-block">
            <div class="title-banner">
              <div>
                <p class="eyebrow">Detay Referanslari</p>
                <h1>${escapeHtml(design.name)} Detay Levhasi</h1>
              </div>
              <div class="title-code">
                <span>Kesit Seti</span>
                <strong>${escapeHtml(geometrySpec.detailRefs.join(" / "))}</strong>
              </div>
            </div>
            <div class="detail-page-note">Sayfa 01 uzerindeki D1-D6 referanslari bu levhaya baglidir.</div>
            ${buildApprovalGrid(design, revisionTag, issueStatus)}
          </div>
          <div class="meta-block">
            <p class="eyebrow">Kesit Ozetleri</p>
            <div class="meta-grid">
              <div><span>Profil Derinligi</span>${profileSpec.depthMm} mm</div>
              <div><span>Kasa / Kayit</span>${design.outerFrameThickness} / ${design.mullionThickness} mm</div>
              <div><span>Cam Build-Up</span>${escapeHtml(glassSpec.buildUp)}</div>
              <div><span>Max Kanat</span>${profileSpec.maxOperableWidthMm} x ${profileSpec.maxOperableHeightMm} mm</div>
              <div><span>Seri Kod</span>${escapeHtml(geometrySpec.officialCode)}</div>
              <div><span>Kesit Notu</span>${escapeHtml(geometrySpec.note)}</div>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          ${panelRows
            .slice(0, 6)
            .map(
              (row, index) => `
                <article class="detail-card ${row.status === "ok" ? "" : row.status}">
                  <div class="detail-card-head">
                    <div>
                      <p class="eyebrow">Detay Ref</p>
                      <h2 style="margin:0;">${row.ref} / ${escapeHtml(row.opening)}</h2>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <span class="detail-chip ${row.status === "ok" ? "" : row.status}">${escapeHtml(row.statusLabel)}</span>
                      <span class="detail-chip">D${index + 1}</span>
                    </div>
                  </div>
                  <table>
                    <tr><th>Brut</th><td>${escapeHtml(row.gross)}</td></tr>
                    <tr><th>Net Kanat</th><td>${escapeHtml(row.sash)}</td></tr>
                    <tr><th>Net Cam</th><td>${escapeHtml(row.glass)}</td></tr>
                    <tr><th>Cam</th><td>${escapeHtml(glassSpec.label)} / ${escapeHtml(glassSpec.thicknessLabel)}</td></tr>
                    <tr><th>Profil</th><td>${escapeHtml(profileSpec.label)} / ${escapeHtml(materialSpec.label)}</td></tr>
                    <tr><th>Donanim</th><td>${escapeHtml(hardwareSpec.label)}</td></tr>
                    <tr><th>Geometri</th><td>${escapeHtml(geometrySpec.officialCode)} / ${escapeHtml(geometrySpec.chamberLabel)}</td></tr>
                    <tr><th>Durum</th><td>${escapeHtml(row.statusLabel)}</td></tr>
                  </table>
                  <div class="detail-chip-row">
                    ${row.sectionRefs.map((item) => `<span class="detail-chip subtle">${escapeHtml(item)}</span>`).join("")}
                  </div>
                  <div class="detail-note">${escapeHtml(row.detailNote)}</div>
                  ${buildDetailSketchMarkup(geometrySpec)}
                </article>
              `
            )
            .join("")}
        </div>
        <div class="page-footer">
          <span>Sayfa 03 / 03</span>
          <span>${escapeHtml(revisionTag)} / ${escapeHtml(issueStatus)}</span>
          <span>Detay / Kesit Referanslari</span>
        </div>
        </div>
      </section>
    </body>
  </html>
  `;
}
