import type { GlassType, HardwareQuality, MaterialSystem, ProfileSeries } from "../types/pvc";

export interface ProfileSeriesSpec {
  id: ProfileSeries;
  label: string;
  depthMm: number;
  recommendedFrameMm: number;
  recommendedMullionMm: number;
  maxOperableWidthMm: number;
  maxOperableHeightMm: number;
  maxOperableAreaM2: number;
  frameCutLossMm: number;
  mullionCutLossMm: number;
  transomCutLossMm: number;
  sashReductionMm: number;
  glassReductionMm: number;
  beadAllowanceMm: number;
}

export interface GlassSpec {
  id: GlassType;
  label: string;
  buildUp: string;
  thicknessLabel: string;
  nominalThicknessMm: number;
  weightKgM2: number;
  thermalClass: "basic" | "good" | "high";
  uValueWm2K: number;
  rwDb: number;
}

export interface HardwareSpec {
  id: HardwareQuality;
  label: string;
  maxSashWeightKg: number;
  hingeCount: number;
}

export interface MaterialSystemSpec {
  id: MaterialSystem;
  label: string;
  description: string;
  recommendedFrameMm: number;
  recommendedMullionMm: number;
  sashAdjustmentMm: number;
  glassAdjustmentMm: number;
}

export const profileSeriesCatalog: Record<ProfileSeries, ProfileSeriesSpec> = {
  "standard-58": {
    id: "standard-58",
    label: "Standard 58",
    depthMm: 58,
    recommendedFrameMm: 58,
    recommendedMullionMm: 58,
    maxOperableWidthMm: 900,
    maxOperableHeightMm: 1600,
    maxOperableAreaM2: 1.35,
    frameCutLossMm: 10,
    mullionCutLossMm: 6,
    transomCutLossMm: 12,
    sashReductionMm: 42,
    glassReductionMm: 88,
    beadAllowanceMm: 14
  },
  "comfort-70": {
    id: "comfort-70",
    label: "Comfort 70",
    depthMm: 70,
    recommendedFrameMm: 70,
    recommendedMullionMm: 70,
    maxOperableWidthMm: 1100,
    maxOperableHeightMm: 2100,
    maxOperableAreaM2: 1.8,
    frameCutLossMm: 12,
    mullionCutLossMm: 8,
    transomCutLossMm: 14,
    sashReductionMm: 50,
    glassReductionMm: 96,
    beadAllowanceMm: 16
  },
  "premium-76": {
    id: "premium-76",
    label: "Premium 76",
    depthMm: 76,
    recommendedFrameMm: 76,
    recommendedMullionMm: 76,
    maxOperableWidthMm: 1200,
    maxOperableHeightMm: 2300,
    maxOperableAreaM2: 2.1,
    frameCutLossMm: 12,
    mullionCutLossMm: 8,
    transomCutLossMm: 16,
    sashReductionMm: 54,
    glassReductionMm: 104,
    beadAllowanceMm: 18
  },
  "elite-82": {
    id: "elite-82",
    label: "Elite 82",
    depthMm: 82,
    recommendedFrameMm: 82,
    recommendedMullionMm: 82,
    maxOperableWidthMm: 1300,
    maxOperableHeightMm: 2400,
    maxOperableAreaM2: 2.35,
    frameCutLossMm: 14,
    mullionCutLossMm: 10,
    transomCutLossMm: 18,
    sashReductionMm: 58,
    glassReductionMm: 112,
    beadAllowanceMm: 18
  },
  "veka-softline": {
    id: "veka-softline",
    label: "VEKA Softline",
    depthMm: 82,
    recommendedFrameMm: 82,
    recommendedMullionMm: 76,
    maxOperableWidthMm: 1250,
    maxOperableHeightMm: 2400,
    maxOperableAreaM2: 2.3,
    frameCutLossMm: 14,
    mullionCutLossMm: 10,
    transomCutLossMm: 18,
    sashReductionMm: 58,
    glassReductionMm: 110,
    beadAllowanceMm: 18
  },
  "rehau-synego": {
    id: "rehau-synego",
    label: "REHAU Synego",
    depthMm: 80,
    recommendedFrameMm: 80,
    recommendedMullionMm: 76,
    maxOperableWidthMm: 1250,
    maxOperableHeightMm: 2350,
    maxOperableAreaM2: 2.25,
    frameCutLossMm: 14,
    mullionCutLossMm: 10,
    transomCutLossMm: 18,
    sashReductionMm: 56,
    glassReductionMm: 108,
    beadAllowanceMm: 18
  }
};

export const glassCatalog: Record<GlassType, GlassSpec> = {
  "single-clear": {
    id: "single-clear",
    label: "Tek Cam Clear",
    buildUp: "4 mm",
    thicknessLabel: "4 mm",
    nominalThicknessMm: 4,
    weightKgM2: 10,
    thermalClass: "basic",
    uValueWm2K: 5.8,
    rwDb: 28
  },
  "double-clear": {
    id: "double-clear",
    label: "Cift Cam Clear",
    buildUp: "4+12+4",
    thicknessLabel: "20 mm",
    nominalThicknessMm: 20,
    weightKgM2: 20,
    thermalClass: "good",
    uValueWm2K: 2.8,
    rwDb: 32
  },
  "triple-clear": {
    id: "triple-clear",
    label: "Uc Cam Clear",
    buildUp: "4+12+4+12+4",
    thicknessLabel: "36 mm",
    nominalThicknessMm: 36,
    weightKgM2: 30,
    thermalClass: "high",
    uValueWm2K: 0.9,
    rwDb: 37
  },
  "double-low-e": {
    id: "double-low-e",
    label: "Cift Cam Low-E",
    buildUp: "4+16+4 Low-E",
    thicknessLabel: "24 mm",
    nominalThicknessMm: 24,
    weightKgM2: 20,
    thermalClass: "high",
    uValueWm2K: 1.1,
    rwDb: 34
  },
  "triple-low-e": {
    id: "triple-low-e",
    label: "Uc Cam Low-E",
    buildUp: "4+12+4+12+4 Low-E",
    thicknessLabel: "36 mm",
    nominalThicknessMm: 36,
    weightKgM2: 30,
    thermalClass: "high",
    uValueWm2K: 0.6,
    rwDb: 39
  },
  "tempered-clear": {
    id: "tempered-clear",
    label: "Temperli",
    buildUp: "6 mm temperli",
    thicknessLabel: "6 mm",
    nominalThicknessMm: 6,
    weightKgM2: 15,
    thermalClass: "basic",
    uValueWm2K: 5.8,
    rwDb: 29
  },
  "laminated-clear": {
    id: "laminated-clear",
    label: "Lamine",
    buildUp: "4+4 lamine",
    thicknessLabel: "8 mm",
    nominalThicknessMm: 8,
    weightKgM2: 20,
    thermalClass: "good",
    uValueWm2K: 5.7,
    rwDb: 40
  },
  "reflective-blue": {
    id: "reflective-blue",
    label: "Reflekte Mavi",
    buildUp: "6 mm reflekte",
    thicknessLabel: "6 mm",
    nominalThicknessMm: 6,
    weightKgM2: 15,
    thermalClass: "good",
    uValueWm2K: 2.9,
    rwDb: 31
  },
  "reflective-smoke": {
    id: "reflective-smoke",
    label: "Reflekte Fume",
    buildUp: "6 mm reflekte",
    thicknessLabel: "6 mm",
    nominalThicknessMm: 6,
    weightKgM2: 15,
    thermalClass: "good",
    uValueWm2K: 2.9,
    rwDb: 31
  },
  frosted: {
    id: "frosted",
    label: "Buzlu",
    buildUp: "4+12+4 satin",
    thicknessLabel: "20 mm",
    nominalThicknessMm: 20,
    weightKgM2: 20,
    thermalClass: "good",
    uValueWm2K: 2.8,
    rwDb: 33
  }
};

export const hardwareCatalog: Record<HardwareQuality, HardwareSpec> = {
  economy: { id: "economy", label: "Ekonomi", maxSashWeightKg: 80, hingeCount: 2 },
  standard: { id: "standard", label: "Standart", maxSashWeightKg: 110, hingeCount: 2 },
  premium: { id: "premium", label: "Premium", maxSashWeightKg: 130, hingeCount: 3 }
};

export const materialSystemCatalog: Record<MaterialSystem, MaterialSystemSpec> = {
  aldoks: {
    id: "aldoks",
    label: "Aldoks",
    description: "Aluminyum destekli cephe ve ticari dograma karakteri.",
    recommendedFrameMm: 68,
    recommendedMullionMm: 58,
    sashAdjustmentMm: 10,
    glassAdjustmentMm: 16
  },
  c60: {
    id: "c60",
    label: "C60",
    description: "60 mm sinifi standart pencere sistemi.",
    recommendedFrameMm: 60,
    recommendedMullionMm: 54,
    sashAdjustmentMm: 6,
    glassAdjustmentMm: 10
  },
  "thermal-insulation": {
    id: "thermal-insulation",
    label: "Isi Yalitimi",
    description: "Yuksek yalitim icin daha derin profil ve daha kalin cam boslugu.",
    recommendedFrameMm: 76,
    recommendedMullionMm: 70,
    sashAdjustmentMm: 14,
    glassAdjustmentMm: 20
  },
  "sliding-system": {
    id: "sliding-system",
    label: "Surme Sistem",
    description: "Surme dograma akisi icin daha genis kasa ve ray karakteri.",
    recommendedFrameMm: 80,
    recommendedMullionMm: 64,
    sashAdjustmentMm: 18,
    glassAdjustmentMm: 14
  },
  "system-series": {
    id: "system-series",
    label: "Sistem Serisi",
    description: "Seri tavsiyelerini merkeze alan dengeli genel kullanim.",
    recommendedFrameMm: 70,
    recommendedMullionMm: 60,
    sashAdjustmentMm: 8,
    glassAdjustmentMm: 12
  }
};
