import {
  getOpeningLeafTypes,
  getWallGeometry,
  getWallTypeLabel,
  normalizeOpeningRatios,
  type FreeDrawOpeningEntity,
  type FreeDrawWallEntity
} from "./freeDrawTools";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatToday() {
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getFacadeWallHeight(wall: FreeDrawWallEntity) {
  if (wall.wallType === "curtain") {
    return 3200;
  }
  if (wall.wallType === "exterior") {
    return 3000;
  }
  return 2800;
}

function getOpeningElevation(opening: FreeDrawOpeningEntity) {
  if (opening.category === "door") {
    return { sill: 0, height: 2200 };
  }
  if (opening.category === "sliding") {
    return { sill: 0, height: opening.topLight ? 2300 : 2200 };
  }
  return { sill: 900, height: opening.topLight ? 1700 : 1400 };
}

function getOpeningFacadeWidth(opening: FreeDrawOpeningEntity) {
  return opening.hostOrientation === "vertical" ? opening.height : opening.width;
}

function buildFacadeSvg(wall: FreeDrawWallEntity, openings: FreeDrawOpeningEntity[]) {
  const geometry = getWallGeometry(wall);
  const wallWidth = geometry.length;
  const wallHeight = getFacadeWallHeight(wall);
  const sortedOpenings = [...openings].sort((left, right) =>
    geometry.orientation === "horizontal" ? left.x - right.x : left.y - right.y
  );

  const svgWidth = 1180;
  const svgHeight = 640;
  const paddingX = 84;
  const paddingTop = 88;
  const paddingBottom = 110;
  const scale = Math.min((svgWidth - paddingX * 2) / Math.max(wallWidth, 1), (svgHeight - paddingTop - paddingBottom) / Math.max(wallHeight, 1));
  const baseY = svgHeight - paddingBottom;
  const wallRect = {
    x: paddingX,
    y: baseY - wallHeight * scale,
    width: wallWidth * scale,
    height: wallHeight * scale
  };

  const facadeOpenings = sortedOpenings.map((opening, index) => {
    const along = geometry.orientation === "horizontal" ? opening.x - geometry.left : opening.y - geometry.top;
    const width = getOpeningFacadeWidth(opening);
    const elevation = getOpeningElevation(opening);
    const x = wallRect.x + along * scale;
    const y = baseY - (elevation.sill + elevation.height) * scale;
    const rect = {
      x,
      y,
      width: width * scale,
      height: elevation.height * scale
    };
    return {
      ...opening,
      label: `O-${index + 1}`,
      along,
      width,
      sill: elevation.sill,
      openingHeight: elevation.height,
      head: elevation.sill + elevation.height,
      rect
    };
  });

  const segments: Array<{ start: number; end: number; label: string }> = [];
  let cursor = 0;
  facadeOpenings.forEach((opening) => {
    if (opening.along > cursor) {
      segments.push({ start: cursor, end: opening.along, label: `${Math.round(opening.along - cursor)}` });
    }
    segments.push({ start: opening.along, end: opening.along + opening.width, label: `${Math.round(opening.width)}` });
    cursor = opening.along + opening.width;
  });
  if (cursor < wallWidth) {
    segments.push({ start: cursor, end: wallWidth, label: `${Math.round(wallWidth - cursor)}` });
  }

  const dimensionMarkup = `
    <g class="facade-dimensions">
      <line x1="${wallRect.x}" y1="${wallRect.y - 58}" x2="${wallRect.x + wallRect.width}" y2="${wallRect.y - 58}" class="facade-dim-line major" />
      <line x1="${wallRect.x}" y1="${wallRect.y - 72}" x2="${wallRect.x}" y2="${wallRect.y - 10}" class="facade-dim-line" />
      <line x1="${wallRect.x + wallRect.width}" y1="${wallRect.y - 72}" x2="${wallRect.x + wallRect.width}" y2="${wallRect.y - 10}" class="facade-dim-line" />
      <text x="${wallRect.x + wallRect.width * 0.5}" y="${wallRect.y - 72}" class="facade-dim-text major">${Math.round(wallWidth)} mm</text>
      ${segments
        .map((segment, index) => {
          const startX = wallRect.x + segment.start * scale;
          const endX = wallRect.x + segment.end * scale;
          const y = wallRect.y - 28;
          return `
            <g>
              <line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" class="facade-dim-line" />
              <line x1="${startX}" y1="${y - 10}" x2="${startX}" y2="${wallRect.y - 6}" class="facade-dim-line" />
              <line x1="${endX}" y1="${y - 10}" x2="${endX}" y2="${wallRect.y - 6}" class="facade-dim-line" />
              <text x="${(startX + endX) * 0.5}" y="${y - 10}" class="facade-dim-text">${segment.label}</text>
            </g>
          `;
        })
        .join("")}
      <line x1="${wallRect.x + wallRect.width + 52}" y1="${wallRect.y}" x2="${wallRect.x + wallRect.width + 52}" y2="${wallRect.y + wallRect.height}" class="facade-dim-line major" />
      <line x1="${wallRect.x + wallRect.width + 40}" y1="${wallRect.y}" x2="${wallRect.x + wallRect.width + 6}" y2="${wallRect.y}" class="facade-dim-line" />
      <line x1="${wallRect.x + wallRect.width + 40}" y1="${wallRect.y + wallRect.height}" x2="${wallRect.x + wallRect.width + 6}" y2="${wallRect.y + wallRect.height}" class="facade-dim-line" />
      <text x="${wallRect.x + wallRect.width + 70}" y="${wallRect.y + wallRect.height * 0.5}" class="facade-dim-text vertical major">${Math.round(wallHeight)} mm</text>
    </g>
  `;

  const openingMarkup = facadeOpenings
    .map((opening) => {
      const frameInset = Math.max(8, Math.min(18, opening.frameThickness * scale * 0.4));
      const inner = {
        x: opening.rect.x + frameInset,
        y: opening.rect.y + frameInset,
        width: Math.max(opening.rect.width - frameInset * 2, 18),
        height: Math.max(opening.rect.height - frameInset * 2, 18)
      };
      const topLightHeight = opening.topLight ? Math.min(inner.height * 0.22, 52) : 0;
      const mainRect = {
        x: inner.x,
        y: inner.y + topLightHeight + (opening.topLight ? Math.max(6, opening.mullionThickness * scale * 0.35) : 0),
        width: inner.width,
        height: Math.max(inner.height - topLightHeight - (opening.topLight ? Math.max(6, opening.mullionThickness * scale * 0.35) : 0), 18)
      };
      const ratios = normalizeOpeningRatios(opening.columns, opening.columnRatios);
      const ratioSum = ratios.reduce((sum, value) => sum + value, 0) || opening.columns;
      const mullion = Math.max(5, opening.mullionThickness * scale * 0.35);
      let cursorX = mainRect.x;
      const dividers = ratios.slice(0, -1).map((ratio, index) => {
        const sectionWidth = (mainRect.width - mullion * (opening.columns - 1)) * (ratio / ratioSum);
        cursorX += sectionWidth;
        const divider = cursorX + mullion * 0.5;
        cursorX += mullion;
        return { id: `${opening.id}-d-${index}`, x: divider };
      });
      const leafTypes = getOpeningLeafTypes(opening);

      return `
        <g>
          <rect x="${opening.rect.x}" y="${opening.rect.y}" width="${opening.rect.width}" height="${opening.rect.height}" class="facade-opening-frame outer ${opening.category}" />
          <rect x="${inner.x}" y="${inner.y}" width="${inner.width}" height="${inner.height}" class="facade-opening-frame inner" />
          ${opening.topLight ? `<line x1="${inner.x}" y1="${mainRect.y - mullion * 0.5}" x2="${inner.x + inner.width}" y2="${mainRect.y - mullion * 0.5}" class="facade-opening-divider" />` : ""}
          ${dividers.map((divider) => `<line x1="${divider.x}" y1="${mainRect.y}" x2="${divider.x}" y2="${mainRect.y + mainRect.height}" class="facade-opening-divider" />`).join("")}
          <rect x="${mainRect.x + 10}" y="${mainRect.y + 10}" width="${Math.max(mainRect.width - 20, 12)}" height="${Math.max(mainRect.height - 20, 12)}" class="facade-opening-glass" />
          ${
            leafTypes.some((leafType) => leafType === "left" || leafType === "right")
              ? `<line x1="${mainRect.x + 12}" y1="${mainRect.y + 12}" x2="${mainRect.x + mainRect.width - 12}" y2="${mainRect.y + mainRect.height - 12}" class="facade-opening-swing" />
                 <line x1="${mainRect.x + 12}" y1="${mainRect.y + mainRect.height - 12}" x2="${mainRect.x + mainRect.width - 12}" y2="${mainRect.y + 12}" class="facade-opening-swing" />`
              : ""
          }
          <text x="${opening.rect.x + opening.rect.width * 0.5}" y="${opening.rect.y - 10}" class="facade-opening-label">${opening.label}</text>
          <text x="${opening.rect.x + opening.rect.width * 0.5}" y="${opening.rect.y + opening.rect.height + 24}" class="facade-opening-meta">${Math.round(opening.width)} x ${opening.openingHeight}</text>
          <text x="${opening.rect.x + opening.rect.width + 12}" y="${opening.rect.y + opening.rect.height * 0.5}" class="facade-opening-meta side">${opening.sill}</text>
        </g>
      `;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="facade-sheet-svg" role="img" aria-label="Cephe plani">
      <rect x="16" y="16" width="${svgWidth - 32}" height="${svgHeight - 32}" rx="20" class="facade-sheet-frame" />
      <rect x="${wallRect.x}" y="${wallRect.y}" width="${wallRect.width}" height="${wallRect.height}" class="facade-wall-shell ${wall.wallType ?? "interior"}" />
      <line x1="${wallRect.x}" y1="${baseY}" x2="${wallRect.x + wallRect.width}" y2="${baseY}" class="facade-ground-line" />
      ${dimensionMarkup}
      ${openingMarkup}
      <text x="${wallRect.x + wallRect.width * 0.5}" y="${baseY + 44}" class="facade-wall-title">${escapeHtml(getWallTypeLabel(wall.wallType))} / ${Math.round(wallWidth)} mm</text>
    </svg>
  `;
}

export function buildFreeDrawFacadePrintHtml(
  wall: FreeDrawWallEntity,
  openings: FreeDrawOpeningEntity[],
  title = "Cephe"
) {
  const geometry = getWallGeometry(wall);
  const wallHeight = getFacadeWallHeight(wall);
  const sortedOpenings = [...openings].sort((left, right) =>
    geometry.orientation === "horizontal" ? left.x - right.x : left.y - right.y
  );

  const openingRows = sortedOpenings
    .map((opening, index) => {
      const elevation = getOpeningElevation(opening);
      return `
        <tr>
          <td>O-${index + 1}</td>
          <td>${escapeHtml(opening.category === "window" ? "Pencere" : opening.category === "door" ? "Kapi" : "Surme")}</td>
          <td>${Math.round(getOpeningFacadeWidth(opening))} mm</td>
          <td>${elevation.sill} mm</td>
          <td>${elevation.sill + elevation.height} mm</td>
          <td>${opening.columns}</td>
        </tr>
      `;
    })
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)} Cephe Paftasi</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #eef3f8; color: #172436; }
        .page { width: 100%; min-height: 180mm; background: #fff; border-radius: 18px; border: 1px solid #d8e2ed; padding: 18px; }
        .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 18px; }
        .title-block h1 { margin: 0 0 6px; font-size: 24px; }
        .eyebrow { margin: 0 0 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #657a96; text-transform: uppercase; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
        .meta-grid div { padding: 10px 12px; border-radius: 12px; background: #f4f8fb; border: 1px solid #e2eaf2; font-size: 12px; }
        .meta-grid span { display: block; color: #6a7f98; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .sheet-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 18px; align-items: start; }
        .panel { background: #fff; border: 1px solid #dde5ee; border-radius: 18px; padding: 16px; }
        .panel h2 { margin: 0 0 12px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 9px 10px; border-bottom: 1px solid #ebf0f5; font-size: 12px; text-align: left; }
        th { font-size: 11px; color: #6c8199; text-transform: uppercase; letter-spacing: 0.08em; }
        .revision-card { min-width: 270px; padding: 14px; border-radius: 16px; border: 1px solid #dfe7f0; background: #f7fbff; }
        .revision-card h2 { margin: 0 0 10px; font-size: 15px; }
        .revision-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .revision-grid div { padding: 8px 10px; border-radius: 10px; background: #fff; border: 1px solid #e4ecf4; font-size: 12px; }
        .revision-grid span { display: block; color: #6a7f98; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .facade-sheet-svg { width: 100%; height: auto; display: block; border-radius: 18px; background: #0c1220; }
        .facade-sheet-frame { fill: none; stroke: #7da962; stroke-width: 1.2; }
        .facade-wall-shell { fill: rgba(235, 241, 249, 0.14); stroke: rgba(230, 238, 250, 0.82); stroke-width: 1.5; }
        .facade-wall-shell.exterior { fill: rgba(229, 126, 126, 0.14); stroke: rgba(255, 165, 165, 0.86); }
        .facade-wall-shell.partition { fill: rgba(114, 183, 132, 0.14); stroke: rgba(156, 228, 174, 0.82); }
        .facade-wall-shell.curtain { fill: rgba(104, 165, 232, 0.12); stroke: rgba(146, 208, 255, 0.86); }
        .facade-ground-line { stroke: rgba(255, 213, 111, 0.72); stroke-width: 1.2; stroke-dasharray: 8 4; }
        .facade-dim-line { stroke: rgba(255, 213, 111, 0.72); stroke-width: 1.1; stroke-dasharray: 6 4; }
        .facade-dim-line.major { stroke: rgba(255, 213, 111, 0.96); }
        .facade-dim-text { fill: #ffd56f; font-size: 12px; font-weight: 700; text-anchor: middle; paint-order: stroke; stroke: rgba(10, 16, 25, 0.92); stroke-width: 4px; }
        .facade-dim-text.major { font-size: 14px; }
        .facade-dim-text.vertical { writing-mode: vertical-rl; }
        .facade-opening-frame.outer { fill: rgba(241, 245, 252, 0.16); stroke: rgba(238, 245, 255, 0.88); stroke-width: 1.3; }
        .facade-opening-frame.outer.door { fill: rgba(255, 224, 184, 0.16); stroke: rgba(255, 214, 163, 0.9); }
        .facade-opening-frame.outer.sliding { fill: rgba(175, 224, 255, 0.12); stroke: rgba(181, 231, 255, 0.9); }
        .facade-opening-frame.inner { fill: rgba(125, 197, 230, 0.12); stroke: rgba(149, 218, 245, 0.78); stroke-width: 1; }
        .facade-opening-divider { stroke: rgba(232, 240, 252, 0.68); stroke-width: 1; }
        .facade-opening-glass { fill: rgba(151, 215, 255, 0.18); stroke: rgba(186, 228, 255, 0.42); stroke-width: 0.8; }
        .facade-opening-swing { stroke: rgba(255, 213, 111, 0.8); stroke-width: 1; stroke-dasharray: 6 4; }
        .facade-opening-label { fill: #eef6ff; font-size: 11px; font-weight: 800; text-anchor: middle; }
        .facade-opening-meta { fill: #bdd0e5; font-size: 10px; font-weight: 700; text-anchor: middle; }
        .facade-opening-meta.side { text-anchor: start; }
        .facade-wall-title { fill: #eef5ff; font-size: 14px; font-weight: 800; text-anchor: middle; }
        .page-footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 11px; color: #7b8da4; }
      </style>
    </head>
    <body>
      <section class="page">
        <div class="title-row">
          <div class="title-block">
            <p class="eyebrow">Serbest Cizim Cephe Paftasi</p>
            <h1>${escapeHtml(title)}</h1>
            <div class="meta-grid">
              <div><span>Tarih</span>${escapeHtml(formatToday())}</div>
              <div><span>Duvar Tipi</span>${escapeHtml(getWallTypeLabel(wall.wallType))}</div>
              <div><span>Duvar Boyu</span>${Math.round(geometry.length)} mm</div>
              <div><span>Duvar Yuksekligi</span>${wallHeight} mm</div>
              <div><span>Aciklik</span>${openings.length}</div>
              <div><span>Plan Tipi</span>Cephe</div>
              <div><span>Durum</span>Teknik Pafta</div>
              <div><span>Kaynagi</span>PVC Designer</div>
            </div>
          </div>
          <div class="revision-card">
            <p class="eyebrow">Revizyon Blogu</p>
            <h2>FACADE-01</h2>
            <div class="revision-grid">
              <div><span>Revizyon</span>00</div>
              <div><span>Sayfa</span>01 / 01</div>
              <div><span>Durum</span>On Inceleme</div>
              <div><span>Olcek</span>Otomatik</div>
              <div><span>Hazirlayan</span>PVC Designer</div>
              <div><span>Tarih</span>${escapeHtml(formatToday())}</div>
            </div>
          </div>
        </div>
        <div class="sheet-grid">
          <div class="panel">
            <h2>Cephe Gorunusu</h2>
            ${buildFacadeSvg(wall, openings)}
          </div>
          <div class="panel">
            <h2>Aciklik Cizelgesi</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tip</th>
                  <th>Genislik</th>
                  <th>Denizlik</th>
                  <th>Baslik</th>
                  <th>Bolme</th>
                </tr>
              </thead>
              <tbody>${openingRows || `<tr><td colspan="6">Aciklik bulunamadi.</td></tr>`}</tbody>
            </table>
            <h2 style="margin-top:18px;">Cephe Ozet</h2>
            <table>
              <tbody>
                <tr><th>Oda</th><td>${escapeHtml(title)}</td></tr>
                <tr><th>Duvar Tipi</th><td>${escapeHtml(getWallTypeLabel(wall.wallType))}</td></tr>
                <tr><th>Toplam Boy</th><td>${Math.round(geometry.length)} mm</td></tr>
                <tr><th>Referans Kot</th><td>+0.00 / ${getFacadeWallHeight(wall)} mm</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="page-footer">
          <span>Sayfa 01 / 01</span>
          <span>PVC Designer Serbest Cizim Cephe Ciktisi</span>
        </div>
      </section>
    </body>
  </html>
  `;
}
