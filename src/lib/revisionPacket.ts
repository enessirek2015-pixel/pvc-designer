import type { DesignRevisionEntry, PvcDesign } from "../types/pvc";
import { buildCanvasLayout } from "./canvasLayout";
import { buildManufacturingReport } from "./manufacturingEngine";

type BundleRevisionEntry = DesignRevisionEntry & {
  designId: string;
  designName: string;
  segmentLabel: string;
};

type BundleDiffRow = {
  template: PvcDesign;
  sourceDesign: PvcDesign;
  comparison: Array<{
    key: string;
    label: string;
    current: string;
    source: string;
    changed: boolean;
  }>;
  changedCount: number;
  changedFields: string;
  impact: string;
};

type RevisionPacketInput = {
  bundleName: string;
  roomName: string;
  templates: PvcDesign[];
  diffRows: BundleDiffRow[];
  revisions: BundleRevisionEntry[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMiniDesignSvg(design: PvcDesign, title: string) {
  const width = 220;
  const outerX = 18;
  const outerY = 20;
  const scale = width / (design.totalWidth + design.outerFrameThickness * 2);
  const outerW = width;
  const outerH = (design.totalHeight + design.outerFrameThickness * 2) * scale;
  const canvasLayout = buildCanvasLayout(
    design,
    { x: outerX, y: outerY, width: outerW, height: outerH },
    scale
  );

  const rows = canvasLayout.rows
    .flatMap((row) =>
      row.panels.map((panel) => {
        const openingType = design.transoms[row.transomIndex].panels[panel.panelIndex].openingType;
        return `<rect x="${panel.bounds.x}" y="${panel.bounds.y}" width="${panel.bounds.width}" height="${panel.bounds.height}" rx="3" fill="${openingType === "fixed" ? "#d8ebfb" : "#b6dcff"}" stroke="#6f839d" stroke-width="0.8" />`;
      })
    )
    .join("");

  const verticalBars = canvasLayout.verticalBars
    .map(
      (bar) =>
        `<rect x="${bar.rect.x}" y="${bar.rect.y}" width="${bar.rect.width}" height="${bar.rect.height}" fill="#ccd5e2" stroke="#95a3b8" stroke-width="0.6" />`
    )
    .join("");

  const horizontalBars = canvasLayout.horizontalBars
    .map(
      (bar) =>
        `<rect x="${bar.rect.x}" y="${bar.rect.y}" width="${bar.rect.width}" height="${bar.rect.height}" fill="#ccd5e2" stroke="#95a3b8" stroke-width="0.6" />`
    )
    .join("");

  return `<svg viewBox="0 0 260 ${Math.max(140, outerH + 72)}" class="mini-sheet">
    <text x="18" y="14" class="mini-title">${escapeHtml(title)}</text>
    <rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" rx="6" fill="#fefefe" stroke="#8ea0b8" stroke-width="1.2" />
    ${rows}
    ${verticalBars}
    ${horizontalBars}
    <text x="${outerX + outerW / 2}" y="${outerY + outerH + 20}" class="mini-meta">${design.totalWidth} x ${design.totalHeight} mm</text>
    <text x="${outerX + outerW / 2}" y="${outerY + outerH + 36}" class="mini-meta">${escapeHtml(design.materials.profileSeries)} / ${escapeHtml(design.materials.glassType)}</text>
  </svg>`;
}

export function buildBundleRevisionPacketHtml(input: RevisionPacketInput) {
  const generatedAt = new Date().toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short"
  });
  const reports = input.templates.map((template) => ({
    template,
    report: buildManufacturingReport(template)
  }));
  const totalProfile = reports.reduce((sum, item) => sum + item.report.profileLengthMeters, 0);
  const totalGlass = reports.reduce((sum, item) => sum + item.report.glassAreaM2, 0);
  const totalHardware = reports.reduce((sum, item) => sum + item.report.hingeCount, 0);
  const totalOpeningPanels = reports.reduce((sum, item) => sum + item.report.openingPanels, 0);

  const facadeRows = reports
    .map(({ template, report }) => {
      const diff = input.diffRows.find((row) => row.template.id === template.id);
      return `<tr>
        <td>${escapeHtml(template.projectLink?.segmentLabel ?? "Cephe")}</td>
        <td>${escapeHtml(template.name)}</td>
        <td>${template.totalWidth} x ${template.totalHeight}</td>
        <td>${report.profileLengthMeters.toFixed(2)} m</td>
        <td>${report.glassAreaM2.toFixed(2)} m²</td>
        <td>${report.hingeCount}</td>
        <td>${report.openingPanels}</td>
        <td>${diff ? escapeHtml(diff.changedFields) : "Senkron"}</td>
      </tr>`;
    })
    .join("");

  const revisionRows = input.revisions.length
    ? input.revisions
        .map(
          (entry) => `<tr>
        <td>${escapeHtml(entry.segmentLabel)}</td>
        <td>${escapeHtml(entry.designName)}</td>
        <td>${escapeHtml(entry.label)}</td>
        <td>${escapeHtml(entry.detail)}</td>
        <td>${new Date(entry.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5">Revizyon kaydi bulunmuyor.</td></tr>`;

  const diffRows = input.diffRows.length
    ? input.diffRows
        .map(
          (row) => `<div class="diff-sheet">
        <div class="diff-sheet-head">
          <strong>${escapeHtml(row.template.projectLink?.segmentLabel ?? "Cephe")} / ${escapeHtml(row.template.name)}</strong>
          <span>${row.changedCount} fark / ${escapeHtml(row.impact)}</span>
        </div>
        <div class="diff-sheet-preview">
          ${renderMiniDesignSvg(row.template, "Aktif")}
          ${renderMiniDesignSvg(row.sourceDesign, "Kaynak")}
        </div>
        <table>
          <tr><th>Alan</th><th>Aktif</th><th>Kaynak</th></tr>
          ${row.comparison
            .map(
              (entry) => `<tr class="${entry.changed ? "changed" : ""}">
                <td>${escapeHtml(entry.label)}</td>
                <td>${escapeHtml(entry.current)}</td>
                <td>${escapeHtml(entry.source)}</td>
              </tr>`
            )
            .join("")}
        </table>
      </div>`
        )
        .join("")
    : `<div class="empty-note">Plan ile farkli kalan cephe bulunmuyor.</div>`;

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(input.bundleName)} Revizyon Paketi</title>
      <style>
        body { font-family: Segoe UI, Arial, sans-serif; margin: 0; padding: 24px; color: #142033; background: #f4f7fb; }
        h1, h2 { margin: 0; }
        .head { display: grid; gap: 8px; margin-bottom: 18px; }
        .meta { color: #5e6d82; font-weight: 600; }
        .chips { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .chip { padding: 9px 14px; border-radius: 999px; background: #e8eef8; color: #223244; font-weight: 700; }
        .grid { display: grid; gap: 18px; }
        .card { background: #ffffff; border: 1px solid #d8e0ea; border-radius: 20px; padding: 18px; box-shadow: 0 10px 24px rgba(26, 39, 58, 0.06); }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th, td { border: 1px solid #d8e0ea; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
        th { background: #eef3fa; color: #213244; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
        .diff-sheet { display: grid; gap: 12px; padding: 14px; border: 1px solid #d8e0ea; border-radius: 18px; background: #fbfcfe; margin-top: 14px; }
        .diff-sheet-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
        .diff-sheet-head strong { color: #1d2b3d; }
        .diff-sheet-head span { color: #5f6f83; font-size: 12px; font-weight: 700; }
        .diff-sheet-preview { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .mini-sheet { width: 100%; min-height: 180px; border: 1px solid #d8e0ea; border-radius: 16px; background: linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%); }
        .mini-title { fill: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        .mini-meta { fill: #506074; font-size: 10px; font-weight: 700; text-anchor: middle; }
        tr.changed td { background: #fff5e8; }
        .empty-note { margin-top: 14px; color: #5e6d82; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="head">
        <h1>${escapeHtml(input.bundleName)} Revizyon Paketi</h1>
        <div class="meta">${escapeHtml(input.roomName || "Adsiz Oda")} / ${generatedAt}</div>
      </div>
      <div class="chips">
        <div class="chip">Cephe ${input.templates.length}</div>
        <div class="chip">Farkli ${input.diffRows.length}</div>
        <div class="chip">Toplam Profil ${totalProfile.toFixed(2)} m</div>
        <div class="chip">Toplam Cam ${totalGlass.toFixed(2)} m²</div>
        <div class="chip">Donanim ${totalHardware}</div>
        <div class="chip">Acilir Kanat ${totalOpeningPanels}</div>
      </div>
      <div class="grid">
        <section class="card">
          <h2>Cephe Ozeti ve BOM Etkisi</h2>
          <table>
            <tr>
              <th>Segment</th>
              <th>Cephe</th>
              <th>Olcu</th>
              <th>Profil</th>
              <th>Cam</th>
              <th>Donanim</th>
              <th>Kanat</th>
              <th>Durum</th>
            </tr>
            ${facadeRows}
          </table>
        </section>
        <section class="card">
          <h2>Set Fark Listesi</h2>
          ${diffRows}
        </section>
        <section class="card">
          <h2>Revizyon Akisi</h2>
          <table>
            <tr>
              <th>Segment</th>
              <th>Cephe</th>
              <th>Islem</th>
              <th>Detay</th>
              <th>Tarih</th>
            </tr>
            ${revisionRows}
          </table>
        </section>
      </div>
    </body>
  </html>`;
}
