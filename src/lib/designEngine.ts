import type { OpeningType, PvcDesign } from "../types/pvc";
import { glassCatalog, hardwareCatalog, materialSystemCatalog, profileSeriesCatalog } from "./systemCatalog";

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface DesignDiagnostic {
  id: string;
  severity: DiagnosticSeverity;
  title: string;
  detail: string;
  scope: "design" | "row" | "panel";
  transomId?: string;
  panelId?: string;
  suggestion?: string;
}

export interface DesignSnapshot {
  panelCount: number;
  transomCount: number;
  openingCount: number;
  fixedCount: number;
  glassAreaM2: number;
  profileLengthM: number;
  averagePanelWidth: number;
  averageTransomHeight: number;
}

export interface DesignHealth {
  status: "healthy" | "warning" | "critical";
  score: number;
  warnings: number;
  errors: number;
  diagnostics: DesignDiagnostic[];
}

export interface PanelEngineering {
  grossWidthMm: number;
  grossHeightMm: number;
  approxSashWidthMm: number;
  approxSashHeightMm: number;
  approxGlassWidthMm: number;
  approxGlassHeightMm: number;
  approxGlassAreaM2: number;
  approxSashWeightKg: number;
  areaLimitOk: boolean;
  weightLimitOk: boolean;
  seriesLimitOk: boolean;
}

const MIN_PANEL_WIDTH = 250;
const MIN_TRANSOM_HEIGHT = 250;
const MIN_OPERABLE_WIDTH = 500;
const MIN_OPERABLE_HEIGHT = 500;
const MAX_OPERABLE_WIDTH = 1400;
const MAX_TRANSOM_HEIGHT = 2200;

export function calculatePanelArea(width: number, height: number) {
  return (width * height) / 1_000_000;
}

export function estimateProfileMeters(design: PvcDesign) {
  const outer = (design.totalWidth * 2 + design.totalHeight * 2) / 1000;
  const mullions =
    design.transoms.reduce((sum, transom) => sum + (transom.panels.length - 1) * transom.height, 0) / 1000;
  const transoms =
    design.transoms.slice(0, -1).reduce((sum, _item) => sum + design.totalWidth, 0) / 1000;

  return Number((outer + mullions + transoms).toFixed(1));
}

export function buildDesignSnapshot(design: PvcDesign): DesignSnapshot {
  const panelCount = design.transoms.reduce((sum, transom) => sum + transom.panels.length, 0);
  const openingCount = design.transoms.reduce(
    (sum, transom) => sum + transom.panels.filter((panel) => panel.openingType !== "fixed").length,
    0
  );
  const glassAreaM2 = design.transoms.reduce(
    (sum, transom) =>
      sum +
      transom.panels.reduce(
        (sub, panel) =>
          sub + buildPanelEngineering(design, panel.width, transom.height, panel.openingType).approxGlassAreaM2,
        0
      ),
    0
  );

  return {
    panelCount,
    transomCount: design.transoms.length,
    openingCount,
    fixedCount: panelCount - openingCount,
    glassAreaM2,
    profileLengthM: estimateProfileMeters(design),
    averagePanelWidth: panelCount > 0 ? Math.round(design.totalWidth / panelCount) : 0,
    averageTransomHeight: design.transoms.length > 0 ? Math.round(design.totalHeight / design.transoms.length) : 0
  };
}

export function buildDesignHealth(design: PvcDesign): DesignHealth {
  const diagnostics: DesignDiagnostic[] = [];
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];

  const totalRowHeight = design.transoms.reduce((sum, transom) => sum + transom.height, 0);
  if (Math.abs(totalRowHeight - design.totalHeight) > 2) {
    diagnostics.push({
      id: "total-height-mismatch",
      severity: "error",
      title: "Toplam yukseklik uyusmuyor",
      detail: `Satirlarin toplami ${totalRowHeight} mm, proje yuksekligi ${design.totalHeight} mm.`,
      scope: "design",
      suggestion: "Satir yuksekliklerini yeniden dengele."
    });
  }

  if (design.outerFrameThickness < 50 || design.outerFrameThickness > 120) {
    diagnostics.push({
      id: "outer-frame-range",
      severity: "warning",
      title: "Kasa kalinligi tipik araligin disinda",
      detail: `Kasa kalinligi ${design.outerFrameThickness} mm. Seri/profil kurallariyla eslestirmek gerekebilir.`,
      scope: "design",
      suggestion: "Kasa olcusunu profil serisine senkronla."
    });
  }

  if (design.mullionThickness < 45 || design.mullionThickness > 120) {
    diagnostics.push({
      id: "mullion-range",
      severity: "warning",
      title: "Kayit kalinligi kontrol edilmeli",
      detail: `Kayit kalinligi ${design.mullionThickness} mm. Uretim serisine gore dogrulama onerilir.`,
      scope: "design",
      suggestion: "Kayit olcusunu profil serisine senkronla."
    });
  }

  if (Math.abs(design.outerFrameThickness - profileSpec.recommendedFrameMm) > 12) {
    diagnostics.push({
      id: "frame-series-mismatch",
      severity: "warning",
      title: "Kasa kalinligi seriyle tam uyumlu degil",
      detail: `${profileSpec.label} icin onerilen kasa ${profileSpec.recommendedFrameMm} mm, mevcut ${design.outerFrameThickness} mm.`,
      scope: "design",
      suggestion: "Kasa olcusunu seri tavsiyesine cek."
    });
  }

  if (Math.abs(design.mullionThickness - profileSpec.recommendedMullionMm) > 12) {
    diagnostics.push({
      id: "mullion-series-mismatch",
      severity: "warning",
      title: "Kayit kalinligi seriyle tam uyumlu degil",
      detail: `${profileSpec.label} icin onerilen kayit ${profileSpec.recommendedMullionMm} mm, mevcut ${design.mullionThickness} mm.`,
      scope: "design",
      suggestion: "Kayit olcusunu seri tavsiyesine cek."
    });
  }

  design.transoms.forEach((transom, transomIndex) => {
    const rowWidth = transom.panels.reduce((sum, panel) => sum + panel.width, 0);
    if (Math.abs(rowWidth - design.totalWidth) > 2) {
      diagnostics.push({
        id: `row-width-${transom.id}`,
        severity: "error",
        title: `Satir ${transomIndex + 1} genisligi uyusmuyor`,
        detail: `Satir toplami ${rowWidth} mm, proje genisligi ${design.totalWidth} mm.`,
        scope: "row",
        transomId: transom.id,
        suggestion: "Satir panellerini yeniden esitle."
      });
    }

    if (transom.height < MIN_TRANSOM_HEIGHT) {
      diagnostics.push({
        id: `row-min-height-${transom.id}`,
        severity: "error",
        title: `Satir ${transomIndex + 1} fazla kisa`,
        detail: `Satir yuksekligi ${transom.height} mm. Minimum ${MIN_TRANSOM_HEIGHT} mm onerilir.`,
        scope: "row",
        transomId: transom.id,
        suggestion: "Satir yuksekliklerini yeniden dengele."
      });
    } else if (transom.height > MAX_TRANSOM_HEIGHT) {
      diagnostics.push({
        id: `row-max-height-${transom.id}`,
        severity: "warning",
        title: `Satir ${transomIndex + 1} cok yuksek`,
        detail: `Satir yuksekligi ${transom.height} mm. Takviye ve profil seri kontrolu gerekebilir.`,
        scope: "row",
        transomId: transom.id,
        suggestion: "Satiri dengele veya seriyi guclendir."
      });
    }

    transom.panels.forEach((panel, panelIndex) => {
      const panelEngineering = buildPanelEngineering(design, panel.width, transom.height, panel.openingType);

      if (panel.width < MIN_PANEL_WIDTH) {
        diagnostics.push({
          id: `panel-min-width-${panel.id}`,
          severity: "error",
          title: `Panel ${transomIndex + 1}.${panelIndex + 1} fazla dar`,
          detail: `Panel genisligi ${panel.width} mm. Minimum ${MIN_PANEL_WIDTH} mm.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Paneli genislet veya acilimi sabit cama cevir."
        });
      }

      if (isOperable(panel.openingType) && panel.width < MIN_OPERABLE_WIDTH) {
        diagnostics.push({
          id: `panel-operable-width-${panel.id}`,
          severity: "warning",
          title: `Acilir panel ${transomIndex + 1}.${panelIndex + 1} dar`,
          detail: `Acilir kanat genisligi ${panel.width} mm. Minimum ${MIN_OPERABLE_WIDTH} mm onerilir.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Kanadi sabit yap veya olcuyu buyut."
        });
      }

      if (isOperable(panel.openingType) && panel.width > MAX_OPERABLE_WIDTH) {
        diagnostics.push({
          id: `panel-operable-max-${panel.id}`,
          severity: "warning",
          title: `Acilir panel ${transomIndex + 1}.${panelIndex + 1} genis`,
          detail: `Acilir kanat genisligi ${panel.width} mm. Menteşe, kol ve seri kurallari kontrol edilmeli.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Kanadi bol veya daha guclu seri sec."
        });
      }

      if (isOperable(panel.openingType) && transom.height < MIN_OPERABLE_HEIGHT) {
        diagnostics.push({
          id: `panel-operable-height-${panel.id}`,
          severity: "warning",
          title: `Acilir panel ${transomIndex + 1}.${panelIndex + 1} alçak`,
          detail: `Kanat yuksekligi ${transom.height} mm. Minimum ${MIN_OPERABLE_HEIGHT} mm onerilir.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Kanadi sabit yap veya satir yuksekligini artir."
        });
      }

      if (isOperable(panel.openingType) && panel.width > profileSpec.maxOperableWidthMm) {
        diagnostics.push({
          id: `panel-series-width-${panel.id}`,
          severity: "warning",
          title: `Panel ${transomIndex + 1}.${panelIndex + 1} seri limitine yaklasiyor`,
          detail: `${profileSpec.label} icin kanat genisligi limiti ${profileSpec.maxOperableWidthMm} mm, mevcut ${panel.width} mm.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Seriyi yukselt veya paneli bol."
        });
      }

      if (isOperable(panel.openingType) && transom.height > profileSpec.maxOperableHeightMm) {
        diagnostics.push({
          id: `panel-series-height-${panel.id}`,
          severity: "warning",
          title: `Panel ${transomIndex + 1}.${panelIndex + 1} seri yukseklik limitini asiyor`,
          detail: `${profileSpec.label} icin kanat yuksekligi limiti ${profileSpec.maxOperableHeightMm} mm, mevcut ${transom.height} mm.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Seriyi yukselt veya satiri yeniden duzenle."
        });
      }

      if (isOperable(panel.openingType) && !panelEngineering.areaLimitOk) {
        diagnostics.push({
          id: `panel-area-limit-${panel.id}`,
          severity: "warning",
          title: `Panel ${transomIndex + 1}.${panelIndex + 1} alan limiti asiyor`,
          detail: `Kanat alani ${panelEngineering.approxGlassAreaM2.toFixed(2)} m2. ${profileSpec.label} icin onerilen limit ${profileSpec.maxOperableAreaM2.toFixed(2)} m2.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Kanadi bol veya daha guclu seri sec."
        });
      }

      if (isOperable(panel.openingType) && !panelEngineering.weightLimitOk) {
        diagnostics.push({
          id: `panel-weight-limit-${panel.id}`,
          severity: "error",
          title: `Panel ${transomIndex + 1}.${panelIndex + 1} donanim limitini asiyor`,
          detail: `Tahmini kanat agirligi ${panelEngineering.approxSashWeightKg.toFixed(1)} kg. ${hardwareSpec.label} donanim limiti ${hardwareSpec.maxSashWeightKg} kg.`,
          scope: "panel",
          transomId: transom.id,
          panelId: panel.id,
          suggestion: "Donanimi yukselt, seriyi guclendir veya kanadi sabit yap."
        });
      }
    });
  });

  const errors = diagnostics.filter((item) => item.severity === "error").length;
  const warnings = diagnostics.filter((item) => item.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 18 - warnings * 7);

  return {
    status: errors > 0 ? "critical" : warnings > 0 ? "warning" : "healthy",
    score,
    warnings,
    errors,
    diagnostics
  };
}

function isOperable(openingType: OpeningType) {
  return openingType !== "fixed";
}

export function buildPanelEngineering(
  design: PvcDesign,
  panelWidth: number,
  transomHeight: number,
  openingType: OpeningType = "fixed"
): PanelEngineering {
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const glassSpec = glassCatalog[design.materials.glassType];
  const hardwareSpec = hardwareCatalog[design.materials.hardwareQuality];
  const materialSpec = materialSystemCatalog[design.materials.materialSystem];
  const frameDelta = Math.max(0, design.outerFrameThickness - profileSpec.recommendedFrameMm);
  const mullionDelta = Math.max(0, design.mullionThickness - profileSpec.recommendedMullionMm);
  const sashOffsetFactor = openingType === "fixed" ? 0.5 : 1;
  const approxSashWidthMm = Math.max(
    160,
    panelWidth -
      (profileSpec.sashReductionMm * sashOffsetFactor +
        materialSpec.sashAdjustmentMm +
        frameDelta * 0.8 +
        mullionDelta * 0.35)
  );
  const approxSashHeightMm = Math.max(
    160,
    transomHeight -
      (profileSpec.sashReductionMm * sashOffsetFactor +
        materialSpec.sashAdjustmentMm +
        frameDelta * 0.8 +
        mullionDelta * 0.55)
  );
  const approxGlassWidthMm = Math.max(
    120,
    panelWidth -
      (profileSpec.glassReductionMm +
        materialSpec.glassAdjustmentMm +
        glassSpec.nominalThicknessMm * 0.55 +
        frameDelta * 1.6 +
        mullionDelta * 1.2)
  );
  const approxGlassHeightMm = Math.max(
    120,
    transomHeight -
      (profileSpec.glassReductionMm +
        materialSpec.glassAdjustmentMm +
        glassSpec.nominalThicknessMm * 0.55 +
        frameDelta * 1.6 +
        mullionDelta * 1.45)
  );
  const approxGlassAreaM2 = calculatePanelArea(approxGlassWidthMm, approxGlassHeightMm);
  const approxSashWeightKg = approxGlassAreaM2 * glassSpec.weightKgM2;
  const grossAreaM2 = calculatePanelArea(panelWidth, transomHeight);

  return {
    grossWidthMm: panelWidth,
    grossHeightMm: transomHeight,
    approxSashWidthMm,
    approxSashHeightMm,
    approxGlassWidthMm,
    approxGlassHeightMm,
    approxGlassAreaM2,
    approxSashWeightKg,
    areaLimitOk: approxGlassAreaM2 <= profileSpec.maxOperableAreaM2,
    weightLimitOk: approxSashWeightKg <= hardwareSpec.maxSashWeightKg,
    seriesLimitOk:
      panelWidth <= profileSpec.maxOperableWidthMm && transomHeight <= profileSpec.maxOperableHeightMm
  };
}
