import type { PvcDesign } from "../types/pvc";
import { buildPanelEngineering, calculatePanelArea } from "./designEngine";
import { glassCatalog, hardwareCatalog, profileSeriesCatalog } from "./systemCatalog";

export type ManufacturingGroup =
  | "outer-frame"
  | "mullion"
  | "transom"
  | "sash"
  | "bead"
  | "glass"
  | "hardware";

export interface CutListItem {
  id: string;
  group: ManufacturingGroup;
  part: string;
  material: string;
  quantity: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  areaM2?: number;
  note?: string;
}

export interface ManufacturingReport {
  openingPanels: number;
  glassAreaM2: number;
  profileLengthMeters: number;
  hingeCount: number;
  cutList: CutListItem[];
}

export function buildManufacturingReport(design: PvcDesign): ManufacturingReport {
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const glassSpec = glassCatalog[design.materials.glassType];
  const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];
  const cutList: CutListItem[] = [];
  let openingPanels = 0;

  cutList.push({
    id: "outer-top-bottom",
    group: "outer-frame",
    part: "Kasa Ust / Alt",
    material: profileSpec.label,
    quantity: 2,
    lengthMm: Math.max(100, design.totalWidth - profileSpec.frameCutLossMm),
    note: `${design.outerFrameThickness} mm kasa net kesim`
  });
  cutList.push({
    id: "outer-side-jamb",
    group: "outer-frame",
    part: "Kasa Yan",
    material: profileSpec.label,
    quantity: 2,
    lengthMm: Math.max(100, design.totalHeight - profileSpec.frameCutLossMm),
    note: `${design.outerFrameThickness} mm kasa net kesim`
  });

  design.transoms.forEach((transom, transomIndex) => {
    if (transomIndex < design.transoms.length - 1) {
      cutList.push({
        id: `transom-${transom.id}`,
        group: "transom",
        part: `Yatay Kayit ${transomIndex + 1}`,
        material: profileSpec.label,
        quantity: 1,
        lengthMm: Math.max(100, design.totalWidth - profileSpec.transomCutLossMm),
        note: `${design.mullionThickness} mm yatay kayit net kesim`
      });
    }

    transom.panels.forEach((panel, panelIndex) => {
      if (panelIndex < transom.panels.length - 1) {
        cutList.push({
          id: `mullion-${transom.id}-${panel.id}`,
          group: "mullion",
          part: `Dikey Kayit ${transomIndex + 1}.${panelIndex + 1}`,
          material: profileSpec.label,
          quantity: 1,
          lengthMm: Math.max(100, transom.height - profileSpec.mullionCutLossMm),
          note: `${design.mullionThickness} mm dikey kayit net kesim`
        });
      }

      const engineering = buildPanelEngineering(design, panel.width, transom.height);
      cutList.push({
        id: `glass-${panel.id}`,
        group: "glass",
        part: `${panel.label} Cam`,
        material: glassSpec.label,
        quantity: 1,
        widthMm: engineering.approxGlassWidthMm,
        heightMm: engineering.approxGlassHeightMm,
        areaM2: calculatePanelArea(engineering.approxGlassWidthMm, engineering.approxGlassHeightMm),
        note: glassSpec.buildUp
      });
      cutList.push({
        id: `bead-h-${panel.id}`,
        group: "bead",
        part: `${panel.label} Cita Ust / Alt`,
        material: profileSpec.label,
        quantity: 2,
        lengthMm: engineering.approxGlassWidthMm + profileSpec.beadAllowanceMm,
        note: panel.openingType === "fixed" ? "Sabit cam cıtasi" : "Kanat ici cıta"
      });
      cutList.push({
        id: `bead-v-${panel.id}`,
        group: "bead",
        part: `${panel.label} Cita Yan`,
        material: profileSpec.label,
        quantity: 2,
        lengthMm: engineering.approxGlassHeightMm + profileSpec.beadAllowanceMm,
        note: panel.openingType === "fixed" ? "Sabit cam cıtasi" : "Kanat ici cıta"
      });

      if (panel.openingType !== "fixed") {
        openingPanels += 1;
        cutList.push({
          id: `sash-h-${panel.id}`,
          group: "sash",
          part: `${panel.label} Kanat Ust / Alt`,
          material: profileSpec.label,
          quantity: 2,
          lengthMm: engineering.approxSashWidthMm,
          note: `${openingLabel(panel.openingType)} net kesim`
        });
        cutList.push({
          id: `sash-v-${panel.id}`,
          group: "sash",
          part: `${panel.label} Kanat Yan`,
          material: profileSpec.label,
          quantity: 2,
          lengthMm: engineering.approxSashHeightMm,
          note: `${openingLabel(panel.openingType)} net kesim`
        });
        cutList.push({
          id: `hardware-${panel.id}`,
          group: "hardware",
          part: hardwarePartName(panel.openingType),
          material: hardwareSpec.label,
          quantity: panel.openingType === "sliding" ? 2 : hardwareSpec.hingeCount,
          note: `${panel.label} icin donanim`
        });
      }
    });
  });

  const glassAreaM2 = cutList
    .filter((item) => item.group === "glass")
    .reduce((sum, item) => sum + (item.areaM2 ?? 0) * item.quantity, 0);
  const profileLengthMeters =
    cutList
      .filter((item) =>
        item.group === "outer-frame" ||
        item.group === "mullion" ||
        item.group === "transom" ||
        item.group === "sash" ||
        item.group === "bead"
      )
      .reduce((sum, item) => sum + (item.lengthMm ?? 0) * item.quantity, 0) / 1000;
  const hingeCount = cutList
    .filter((item) => item.group === "hardware")
    .reduce((sum, item) => sum + item.quantity, 0);

  return {
    openingPanels,
    glassAreaM2,
    profileLengthMeters: Number(profileLengthMeters.toFixed(2)),
    hingeCount,
    cutList
  };
}

export function buildManufacturingHtml(design: PvcDesign, report: ManufacturingReport) {
  const rows = report.cutList
    .map((item) => {
      const sizeText = item.lengthMm
        ? `${item.lengthMm} mm`
        : item.widthMm && item.heightMm
          ? `${item.widthMm} x ${item.heightMm} mm`
          : "-";

      return `<tr>
        <td>${groupLabel(item.group)}</td>
        <td>${item.part}</td>
        <td>${item.material}</td>
        <td>${item.quantity}</td>
        <td>${sizeText}</td>
        <td>${item.note ?? "-"}</td>
      </tr>`;
    })
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${design.name} Uretim Listesi</title>
      <style>
        body { font-family: Segoe UI, Arial, sans-serif; padding: 24px; color: #111827; }
        h1 { margin-bottom: 6px; }
        .meta { margin-bottom: 16px; color: #4b5563; }
        .stats { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .chip { padding: 8px 12px; border-radius: 999px; background: #eef2ff; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
        th { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>${design.name}</h1>
      <div class="meta">${design.customer.customerName || "Musteri tanimsiz"} | ${design.totalWidth} x ${design.totalHeight} mm</div>
      <div class="stats">
        <div class="chip">Toplam Profil: ${report.profileLengthMeters.toFixed(2)} m</div>
        <div class="chip">Cam Alani: ${report.glassAreaM2.toFixed(2)} m²</div>
        <div class="chip">Acilir Kanat: ${report.openingPanels}</div>
        <div class="chip">Donanim Adedi: ${report.hingeCount}</div>
      </div>
      <table>
        <tr><th>Grup</th><th>Parca</th><th>Malzeme</th><th>Adet</th><th>Olcu</th><th>Not</th></tr>
        ${rows}
      </table>
    </body>
  </html>`;
}

function openingLabel(openingType: string) {
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
      return "Aksesuar";
    default:
      return group;
  }
}

function hardwarePartName(openingType: string) {
  if (openingType === "sliding") {
    return "Surme Rulman Takimi";
  }
  if (openingType === "tilt-turn-right") {
    return "Cift Acilim Mekanizma";
  }
  return "Menteşe Takimi";
}
