import type { ProfileSeries } from "../types/pvc";

export interface ProfileGeometrySpec {
  id: ProfileSeries;
  officialCode: string;
  officialName: string;
  frameLines: number[];
  sashLines: number[];
  thermalBands: number[];
  drainageSlots: number[];
  detailRefs: string[];
  note: string;
  chamberLabel: string;
  sectionScaleLabel: string;
}

export const profileGeometryCatalog: Record<ProfileSeries, ProfileGeometrySpec> = {
  "standard-58": {
    id: "standard-58",
    officialCode: "S58-3C",
    officialName: "Standard 58 / 3 Chamber",
    frameLines: [0.16, 0.31, 0.69, 0.84],
    sashLines: [0.24, 0.5, 0.76],
    thermalBands: [0.5],
    drainageSlots: [0.2, 0.8],
    detailRefs: ["A-A", "B-B", "D1"],
    note: "3 odacikli klasik pencere geometrisi.",
    chamberLabel: "3 Oda",
    sectionScaleLabel: "Olcek 1:2 / Standart"
  },
  "comfort-70": {
    id: "comfort-70",
    officialCode: "C70-4C",
    officialName: "Comfort 70 / 4 Chamber",
    frameLines: [0.12, 0.25, 0.4, 0.6, 0.75, 0.88],
    sashLines: [0.22, 0.41, 0.59, 0.78],
    thermalBands: [0.47, 0.53],
    drainageSlots: [0.18, 0.5, 0.82],
    detailRefs: ["A-A", "B-B", "C-C"],
    note: "4 odacik ve guclu termal kopru ayrimi.",
    chamberLabel: "4 Oda",
    sectionScaleLabel: "Olcek 1:2 / Konfor"
  },
  "premium-76": {
    id: "premium-76",
    officialCode: "P76-5C",
    officialName: "Premium 76 / 5 Chamber",
    frameLines: [0.1, 0.22, 0.34, 0.5, 0.66, 0.78, 0.9],
    sashLines: [0.18, 0.34, 0.5, 0.66, 0.82],
    thermalBands: [0.44, 0.56],
    drainageSlots: [0.16, 0.5, 0.84],
    detailRefs: ["A-A", "B-B", "C-C"],
    note: "5 odacikli premium profil kesiti.",
    chamberLabel: "5 Oda",
    sectionScaleLabel: "Olcek 1:2 / Premium"
  },
  "elite-82": {
    id: "elite-82",
    officialCode: "E82-6C",
    officialName: "Elite 82 / 6 Chamber",
    frameLines: [0.08, 0.18, 0.28, 0.4, 0.6, 0.72, 0.82, 0.92],
    sashLines: [0.16, 0.3, 0.45, 0.55, 0.7, 0.84],
    thermalBands: [0.42, 0.5, 0.58],
    drainageSlots: [0.15, 0.38, 0.62, 0.85],
    detailRefs: ["A-A", "B-B", "C-C"],
    note: "6 odacikli yuksek yalitimli elite geometri.",
    chamberLabel: "6 Oda",
    sectionScaleLabel: "Olcek 1:2 / Elite"
  },
  "veka-softline": {
    id: "veka-softline",
    officialCode: "VEKA82",
    officialName: "VEKA Softline 82",
    frameLines: [0.09, 0.21, 0.33, 0.5, 0.67, 0.79, 0.91],
    sashLines: [0.18, 0.36, 0.52, 0.68, 0.84],
    thermalBands: [0.45, 0.55],
    drainageSlots: [0.18, 0.5, 0.82],
    detailRefs: ["A-A", "B-B", "VE1"],
    note: "Softline konturunda yumusak hatli 82 mm seri.",
    chamberLabel: "Softline",
    sectionScaleLabel: "Olcek 1:2 / VEKA"
  },
  "rehau-synego": {
    id: "rehau-synego",
    officialCode: "REH80",
    officialName: "REHAU Synego 80",
    frameLines: [0.1, 0.22, 0.35, 0.5, 0.65, 0.78, 0.9],
    sashLines: [0.17, 0.33, 0.5, 0.67, 0.83],
    thermalBands: [0.43, 0.57],
    drainageSlots: [0.16, 0.34, 0.66, 0.84],
    detailRefs: ["A-A", "B-B", "R1"],
    note: "Synego derinlik ve cok odacikli modern kesit yapisi.",
    chamberLabel: "Synego",
    sectionScaleLabel: "Olcek 1:2 / REHAU"
  }
};
