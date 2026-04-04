import {
  FREE_DRAW_WALL_TYPE_OPTIONS,
  getOpeningGeometry,
  getWallGeometry,
  getWallTypeLabel,
  type FreeDrawEntity,
  type FreeDrawOpeningEntity,
  type FreeDrawPoint,
  type FreeDrawWallEntity,
  type FreeDrawWallType
} from "./freeDrawTools";

export type FreeDrawPlanRoom = {
  chainId: string;
  name: string;
  wallType: FreeDrawWallType;
  areaM2: number;
  perimeterMm: number;
  segmentCount: number;
  bounds: { left: number; right: number; top: number; bottom: number };
  points: FreeDrawPoint[];
};

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

function collectPlanBounds(entities: FreeDrawEntity[], rooms: FreeDrawPlanRoom[]) {
  const points: FreeDrawPoint[] = [];

  entities.forEach((entity) => {
    if (entity.type === "wall") {
      const geometry = getWallGeometry(entity);
      points.push(
        { x: geometry.rect.x, y: geometry.rect.y },
        { x: geometry.rect.x + geometry.rect.width, y: geometry.rect.y + geometry.rect.height }
      );
      return;
    }

    if (entity.type === "opening") {
      points.push({ x: entity.x, y: entity.y }, { x: entity.x + entity.width, y: entity.y + entity.height });
    }
  });

  rooms.forEach((room) => {
    points.push({ x: room.bounds.left, y: room.bounds.top }, { x: room.bounds.right, y: room.bounds.bottom });
  });

  if (!points.length) {
    return { left: 0, top: 0, right: 2000, bottom: 1200 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys)
  };
}

function createProjector(bounds: { left: number; top: number; right: number; bottom: number }) {
  const svgWidth = 1040;
  const svgHeight = 620;
  const padding = 54;
  const worldWidth = Math.max(bounds.right - bounds.left, 1);
  const worldHeight = Math.max(bounds.bottom - bounds.top, 1);
  const scale = Math.min((svgWidth - padding * 2) / worldWidth, (svgHeight - padding * 2) / worldHeight);
  const offsetX = padding + (svgWidth - padding * 2 - worldWidth * scale) * 0.5;
  const offsetY = padding + (svgHeight - padding * 2 - worldHeight * scale) * 0.5;

  return {
    svgWidth,
    svgHeight,
    scale,
    point(point: FreeDrawPoint) {
      return {
        x: offsetX + (point.x - bounds.left) * scale,
        y: offsetY + (point.y - bounds.top) * scale
      };
    },
    rect(rect: { x: number; y: number; width: number; height: number }) {
      const topLeft = this.point({ x: rect.x, y: rect.y });
      return {
        x: topLeft.x,
        y: topLeft.y,
        width: rect.width * scale,
        height: rect.height * scale
      };
    }
  };
}

function buildWallTypeLegendRows(rooms: FreeDrawPlanRoom[]) {
  return FREE_DRAW_WALL_TYPE_OPTIONS.map((option) => ({
    ...option,
    count: rooms.filter((room) => room.wallType === option.value).length
  })).filter((item) => item.count > 0);
}

function getLegendCode(wallType: FreeDrawWallType) {
  if (wallType === "exterior") {
    return "DIS";
  }
  if (wallType === "partition") {
    return "BLM";
  }
  if (wallType === "curtain") {
    return "GYD";
  }
  return "IC";
}

function getRoomCeilingHeight(wallType: FreeDrawWallType) {
  if (wallType === "curtain") {
    return 3200;
  }
  if (wallType === "exterior") {
    return 3000;
  }
  return 2800;
}

function buildPlanSvg(entities: FreeDrawEntity[], rooms: FreeDrawPlanRoom[]) {
  const walls = entities.filter((entity): entity is FreeDrawWallEntity => entity.type === "wall");
  const openings = entities.filter((entity): entity is FreeDrawOpeningEntity => entity.type === "opening");
  const bounds = collectPlanBounds(entities, rooms);
  const projector = createProjector(bounds);
  const legendRows = buildWallTypeLegendRows(rooms);

  const roomMarkup = rooms
    .map((room) => {
      const polygon = room.points.map((point) => {
        const projected = projector.point(point);
        return `${projected.x},${projected.y}`;
      });
      const labelPoint = projector.point({
        x: (room.bounds.left + room.bounds.right) * 0.5,
        y: (room.bounds.top + room.bounds.bottom) * 0.5
      });

      return `
        <g>
          <polygon points="${polygon.join(" ")}" class="plan-room-fill ${escapeHtml(room.wallType)}" />
          <text x="${labelPoint.x}" y="${labelPoint.y - 8}" text-anchor="middle" class="plan-room-label">${escapeHtml(room.name)}</text>
          <text x="${labelPoint.x}" y="${labelPoint.y + 10}" text-anchor="middle" class="plan-room-meta">${room.areaM2.toFixed(2)} m2</text>
        </g>
      `;
    })
    .join("");

  const wallMarkup = walls
    .map((wall) => {
      const geometry = getWallGeometry(wall);
      const rect = projector.rect(geometry.rect);
      const centerStart = projector.point(geometry.centerline.start);
      const centerEnd = projector.point(geometry.centerline.end);
      const labelX = geometry.orientation === "horizontal" ? rect.x + rect.width * 0.5 : rect.x + rect.width + 20;
      const labelY = geometry.orientation === "horizontal" ? rect.y - 10 : rect.y + rect.height * 0.5;

      return `
        <g>
          <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" class="plan-wall-fill ${escapeHtml(wall.wallType ?? "interior")}" />
          <line x1="${centerStart.x}" y1="${centerStart.y}" x2="${centerEnd.x}" y2="${centerEnd.y}" class="plan-wall-center" />
          <text x="${labelX}" y="${labelY}" class="plan-wall-label ${geometry.orientation === "vertical" ? "vertical" : ""}">${escapeHtml(getWallTypeLabel(wall.wallType))} ${Math.round(geometry.length)} / ${Math.round(wall.thickness)}</text>
        </g>
      `;
    })
    .join("");

  const openingMarkup = openings
    .map((opening) => {
      const rect = projector.rect({
        x: opening.x,
        y: opening.y,
        width: opening.width,
        height: opening.height
      });
      const geometry = getOpeningGeometry(opening);
      const innerRect = projector.rect({
        x: geometry.inner.x,
        y: geometry.inner.y,
        width: geometry.inner.width,
        height: geometry.inner.height
      });

      return `
        <g>
          <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" class="plan-opening-cut" />
          <rect x="${innerRect.x}" y="${innerRect.y}" width="${innerRect.width}" height="${innerRect.height}" class="plan-opening-frame" />
        </g>
      `;
    })
    .join("");

  const gridMarkup = Array.from({ length: 18 }, (_, index) => {
    const x = 24 + index * 60;
    const y = 24 + index * 34;
    return `
      <line x1="${x}" y1="0" x2="${x}" y2="${projector.svgHeight}" class="plan-grid" />
      <line x1="0" y1="${y}" x2="${projector.svgWidth}" y2="${y}" class="plan-grid" />
    `;
  }).join("");

  const projectedTopLeft = projector.point({ x: bounds.left, y: bounds.top });
  const projectedTopRight = projector.point({ x: bounds.right, y: bounds.top });
  const projectedBottomLeft = projector.point({ x: bounds.left, y: bounds.bottom });
  const projectedBottomRight = projector.point({ x: bounds.right, y: bounds.bottom });
  const axisOffset = 30;

  const axisMarkup = `
    <g class="plan-axis-overlay">
      <line x1="${projectedTopLeft.x}" y1="${projectedTopLeft.y - axisOffset}" x2="${projectedTopLeft.x}" y2="${projectedBottomLeft.y + axisOffset}" class="plan-axis-line" />
      <line x1="${projectedTopRight.x}" y1="${projectedTopRight.y - axisOffset}" x2="${projectedTopRight.x}" y2="${projectedBottomRight.y + axisOffset}" class="plan-axis-line" />
      <line x1="${projectedTopLeft.x - axisOffset}" y1="${projectedTopLeft.y}" x2="${projectedTopRight.x + axisOffset}" y2="${projectedTopRight.y}" class="plan-axis-line" />
      <line x1="${projectedBottomLeft.x - axisOffset}" y1="${projectedBottomLeft.y}" x2="${projectedBottomRight.x + axisOffset}" y2="${projectedBottomRight.y}" class="plan-axis-line" />
      <circle cx="${projectedTopLeft.x}" cy="${projectedTopLeft.y - axisOffset}" r="14" class="plan-axis-bubble" />
      <circle cx="${projectedTopRight.x}" cy="${projectedTopRight.y - axisOffset}" r="14" class="plan-axis-bubble" />
      <circle cx="${projectedTopLeft.x - axisOffset}" cy="${projectedTopLeft.y}" r="14" class="plan-axis-bubble" />
      <circle cx="${projectedBottomLeft.x - axisOffset}" cy="${projectedBottomLeft.y}" r="14" class="plan-axis-bubble" />
      <text x="${projectedTopLeft.x}" y="${projectedTopLeft.y - axisOffset + 5}" class="plan-axis-text">A</text>
      <text x="${projectedTopRight.x}" y="${projectedTopRight.y - axisOffset + 5}" class="plan-axis-text">B</text>
      <text x="${projectedTopLeft.x - axisOffset}" y="${projectedTopLeft.y + 5}" class="plan-axis-text">1</text>
      <text x="${projectedBottomLeft.x - axisOffset}" y="${projectedBottomLeft.y + 5}" class="plan-axis-text">2</text>
      <text x="${(projectedTopLeft.x + projectedTopRight.x) * 0.5}" y="${projectedTopLeft.y - axisOffset - 14}" class="plan-axis-distance">${Math.round(bounds.right - bounds.left)} mm</text>
      <text x="${projectedTopLeft.x - axisOffset - 18}" y="${(projectedTopLeft.y + projectedBottomLeft.y) * 0.5}" class="plan-axis-distance vertical">${Math.round(bounds.bottom - bounds.top)} mm</text>
    </g>
  `;

  const legendMarkup = legendRows.length
    ? `
      <g class="plan-legend-box">
        <rect x="26" y="26" width="210" height="${52 + legendRows.length * 24}" rx="16" class="plan-legend-shell" />
        <text x="44" y="48" class="plan-legend-title">Duvar Tipleri</text>
        ${legendRows
          .map(
            (row, index) => `
              <rect x="42" y="${62 + index * 24}" width="16" height="10" rx="4" class="plan-legend-chip ${escapeHtml(row.value)}" />
              <text x="68" y="${71 + index * 24}" class="plan-legend-label">${escapeHtml(row.label)}</text>
              <text x="220" y="${71 + index * 24}" class="plan-legend-value">${row.count}</text>
            `
          )
          .join("")}
      </g>
    `
    : "";

  return `
    <svg viewBox="0 0 ${projector.svgWidth} ${projector.svgHeight}" class="plan-sheet-svg" role="img" aria-label="Serbest cizim teknik plani">
      <rect x="10" y="10" width="${projector.svgWidth - 20}" height="${projector.svgHeight - 20}" rx="20" class="plan-sheet-frame" />
      ${gridMarkup}
      ${axisMarkup}
      ${roomMarkup}
      ${wallMarkup}
      ${openingMarkup}
      ${legendMarkup}
    </svg>
  `;
}

export function buildFreeDrawPlanPrintHtml(entities: FreeDrawEntity[], rooms: FreeDrawPlanRoom[]) {
  const walls = entities.filter((entity): entity is FreeDrawWallEntity => entity.type === "wall");
  const openings = entities.filter((entity): entity is FreeDrawOpeningEntity => entity.type === "opening");
  const totalWallLength = walls.reduce((sum, wall) => sum + Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y), 0);
  const title = rooms.length ? `${rooms[0].name} ve Plan Ozeti` : "Serbest Cizim Plani";
  const wallTypeSummary = buildWallTypeLegendRows(rooms)
    .map(
      (row) => `
        <tr>
          <td>${getLegendCode(row.value)}</td>
          <td>${escapeHtml(row.label)}</td>
          <td>${row.count}</td>
        </tr>
      `
    )
    .join("");
  const axisRows = `
    <tr><td>A</td><td>Sol Aks</td><td>Planin sol referansi</td></tr>
    <tr><td>B</td><td>Sag Aks</td><td>Planin sag referansi</td></tr>
    <tr><td>1</td><td>Ust Aks</td><td>Planin ust referansi</td></tr>
    <tr><td>2</td><td>Alt Aks</td><td>Planin alt referansi</td></tr>
  `;
  const levelRows = rooms
    .map(
      (room) => `
        <tr>
          <td>${escapeHtml(room.name)}</td>
          <td>+0.00</td>
          <td>+${(getRoomCeilingHeight(room.wallType) / 1000).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  const roomRows = rooms
    .map(
      (room) => `
        <tr>
          <td>${escapeHtml(room.name)}</td>
          <td>${escapeHtml(getWallTypeLabel(room.wallType))}</td>
          <td>${room.segmentCount}</td>
          <td>${room.areaM2.toFixed(2)} m2</td>
          <td>${Math.round(room.perimeterMm)} mm</td>
        </tr>
      `
    )
    .join("");

  const wallRows = walls
    .map(
      (wall, index) => `
        <tr>
          <td>W-${index + 1}</td>
          <td>${escapeHtml(getWallTypeLabel(wall.wallType))}</td>
          <td>${Math.round(Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y))} mm</td>
          <td>${Math.round(wall.thickness)} mm</td>
          <td>${escapeHtml(wall.roomName || "-")}</td>
        </tr>
      `
    )
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)} Teknik Plan</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #eef3f8; color: #172436; }
        .page { width: 100%; min-height: 180mm; background: #fff; border-radius: 18px; border: 1px solid #d8e2ed; padding: 18px; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 18px; }
        .title-block h1 { margin: 0 0 6px; font-size: 24px; }
        .revision-card { min-width: 270px; padding: 14px; border-radius: 16px; border: 1px solid #dfe7f0; background: #f7fbff; }
        .revision-card h2 { margin: 0 0 10px; font-size: 15px; }
        .revision-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .revision-grid div { padding: 8px 10px; border-radius: 10px; background: #fff; border: 1px solid #e4ecf4; font-size: 12px; }
        .revision-grid span { display: block; color: #6a7f98; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .eyebrow { margin: 0 0 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #657a96; text-transform: uppercase; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
        .meta-grid div { padding: 10px 12px; border-radius: 12px; background: #f4f8fb; border: 1px solid #e2eaf2; font-size: 12px; }
        .meta-grid span { display: block; color: #6a7f98; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .plan-sheet-svg { width: 100%; height: auto; display: block; border-radius: 18px; background: #0c1220; }
        .plan-sheet-frame { fill: none; stroke: #7da962; stroke-width: 1.2; }
        .plan-grid { stroke: rgba(140, 170, 120, 0.12); stroke-width: 0.8; }
        .plan-room-fill { fill: rgba(88, 150, 112, 0.10); stroke: rgba(130, 206, 160, 0.28); stroke-width: 1.1; stroke-dasharray: 5 4; }
        .plan-room-fill.exterior { fill: rgba(153, 76, 76, 0.12); stroke: rgba(255, 165, 165, 0.30); }
        .plan-room-fill.partition { fill: rgba(90, 142, 110, 0.12); stroke: rgba(156, 228, 174, 0.28); }
        .plan-room-fill.curtain { fill: rgba(71, 116, 156, 0.12); stroke: rgba(146, 208, 255, 0.28); }
        .plan-room-label { fill: #eef5ff; font-size: 14px; font-weight: 800; }
        .plan-room-meta { fill: #b5d5c2; font-size: 11px; font-weight: 700; }
        .plan-wall-fill { fill: rgba(232, 238, 247, 0.16); stroke: rgba(228, 238, 250, 0.82); stroke-width: 1.4; }
        .plan-wall-fill.exterior { fill: rgba(229, 126, 126, 0.18); stroke: rgba(255, 165, 165, 0.88); }
        .plan-wall-fill.partition { fill: rgba(114, 183, 132, 0.16); stroke: rgba(156, 228, 174, 0.8); }
        .plan-wall-fill.curtain { fill: rgba(104, 165, 232, 0.14); stroke: rgba(146, 208, 255, 0.86); }
        .plan-wall-center { stroke: rgba(255, 214, 111, 0.52); stroke-width: 1; stroke-dasharray: 7 4; }
        .plan-wall-label { fill: #edf4fe; font-size: 10px; font-weight: 700; text-anchor: middle; }
        .plan-wall-label.vertical { writing-mode: vertical-rl; text-anchor: start; }
        .plan-opening-cut { fill: rgba(19, 24, 34, 0.96); stroke: rgba(255,255,255,0.10); stroke-width: 1; }
        .plan-opening-frame { fill: rgba(125, 197, 230, 0.18); stroke: rgba(149, 218, 245, 0.84); stroke-width: 1; }
        .plan-axis-line { stroke: rgba(255, 213, 111, 0.84); stroke-width: 1; stroke-dasharray: 8 5; }
        .plan-axis-bubble { fill: #101725; stroke: rgba(255, 213, 111, 0.96); stroke-width: 1.2; }
        .plan-axis-text { fill: #ffd56f; font-size: 10px; font-weight: 800; text-anchor: middle; }
        .plan-axis-distance { fill: #dcedff; font-size: 10px; font-weight: 800; text-anchor: middle; }
        .plan-axis-distance.vertical { writing-mode: vertical-rl; }
        .plan-legend-shell { fill: rgba(11, 17, 27, 0.88); stroke: rgba(255,255,255,0.08); stroke-width: 1; }
        .plan-legend-title { fill: rgba(255, 213, 111, 0.96); font-size: 12px; font-weight: 800; }
        .plan-legend-chip { fill: rgba(226, 234, 247, 0.18); stroke: rgba(226, 234, 247, 0.76); stroke-width: 0.8; }
        .plan-legend-chip.exterior { fill: rgba(229, 126, 126, 0.18); stroke: rgba(255, 165, 165, 0.88); }
        .plan-legend-chip.partition { fill: rgba(114, 183, 132, 0.16); stroke: rgba(156, 228, 174, 0.8); }
        .plan-legend-chip.curtain { fill: rgba(104, 165, 232, 0.14); stroke: rgba(146, 208, 255, 0.86); }
        .plan-legend-label { fill: #eef4fe; font-size: 10px; font-weight: 700; }
        .plan-legend-value { fill: #b8cbe0; font-size: 10px; font-weight: 700; text-anchor: end; }
        .sheet-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 18px; align-items: start; }
        .panel { background: #fff; border: 1px solid #dde5ee; border-radius: 18px; padding: 16px; }
        .panel h2 { margin: 0 0 12px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 9px 10px; border-bottom: 1px solid #ebf0f5; font-size: 12px; text-align: left; }
        th { font-size: 11px; color: #6c8199; text-transform: uppercase; letter-spacing: 0.08em; }
        .page-footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 11px; color: #7b8da4; }
      </style>
    </head>
    <body>
      <section class="page">
        <div class="title-row">
          <div class="title-block">
            <p class="eyebrow">Serbest Cizim Teknik Paftasi</p>
            <h1>${escapeHtml(title)}</h1>
            <div class="meta-grid">
              <div><span>Tarih</span>${escapeHtml(formatToday())}</div>
              <div><span>Oda</span>${rooms.length}</div>
              <div><span>Duvar</span>${walls.length}</div>
              <div><span>Aciklik</span>${openings.length}</div>
              <div><span>Toplam Duvar</span>${Math.round(totalWallLength)} mm</div>
              <div><span>Plan Tipi</span>Serbest Cizim</div>
              <div><span>Durum</span>Teknik Plan</div>
              <div><span>Kaynagi</span>PVC Designer</div>
            </div>
          </div>
          <div class="revision-card">
            <p class="eyebrow">Revizyon Blogu</p>
            <h2>PLAN-01</h2>
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
            <h2>Plan Gorunusu</h2>
            ${buildPlanSvg(entities, rooms)}
          </div>
          <div class="panel">
            <h2>Oda Cizelgesi</h2>
            <table>
              <thead>
                <tr>
                  <th>Oda</th>
                  <th>Duvar Tipi</th>
                  <th>Seg.</th>
                  <th>Alan</th>
                  <th>Cevre</th>
                </tr>
              </thead>
              <tbody>${roomRows || `<tr><td colspan="5">Oda bulunamadi.</td></tr>`}</tbody>
            </table>
            <h2 style="margin-top:18px;">Duvar Tipi Ozet</h2>
            <table>
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Tip</th>
                  <th>Adet</th>
                </tr>
              </thead>
              <tbody>${wallTypeSummary || `<tr><td colspan="3">Tip bulunamadi.</td></tr>`}</tbody>
            </table>
            <h2 style="margin-top:18px;">Aks Cizelgesi</h2>
            <table>
              <thead>
                <tr>
                  <th>Aks</th>
                  <th>Ad</th>
                  <th>Aciklama</th>
                </tr>
              </thead>
              <tbody>${axisRows}</tbody>
            </table>
            <h2 style="margin-top:18px;">Kot Cizelgesi</h2>
            <table>
              <thead>
                <tr>
                  <th>Mekan</th>
                  <th>Bitmis Doseme</th>
                  <th>Tavan Kotu</th>
                </tr>
              </thead>
              <tbody>${levelRows || `<tr><td colspan="3">Mekan bulunamadi.</td></tr>`}</tbody>
            </table>
            <h2 style="margin-top:18px;">Duvar Cizelgesi</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tip</th>
                  <th>Boy</th>
                  <th>Kalinlik</th>
                  <th>Oda</th>
                </tr>
              </thead>
              <tbody>${wallRows || `<tr><td colspan="5">Duvar bulunamadi.</td></tr>`}</tbody>
            </table>
          </div>
        </div>
        <div class="page-footer">
          <span>Sayfa 01 / 01</span>
          <span>PVC Designer Serbest Cizim Plan Ciktisi</span>
        </div>
      </section>
    </body>
  </html>
  `;
}
