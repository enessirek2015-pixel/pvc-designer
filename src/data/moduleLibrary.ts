import type { OpeningType } from "../types/pvc";

export interface PanelLibraryModule {
  id: string;
  title: string;
  description: string;
  label: string;
  openingType: OpeningType;
  commandAlias: string;
}

export interface RowLibraryModule {
  id: string;
  title: string;
  description: string;
  commandAlias: string;
  panels: Array<{
    ratio: number;
    label: string;
    openingType: OpeningType;
  }>;
}

export const panelLibraryModules: PanelLibraryModule[] = [
  {
    id: "fixed-lite",
    title: "Sabit Cam",
    description: "Secili paneli temiz sabit modula cevirir.",
    label: "Sabit Cam",
    openingType: "fixed",
    commandAlias: "fixed"
  },
  {
    id: "casement-right",
    title: "Sag Kanat",
    description: "Sag acilimli standart pencere kanadi.",
    label: "Sag Kanat",
    openingType: "turn-right",
    commandAlias: "right"
  },
  {
    id: "casement-left",
    title: "Sol Kanat",
    description: "Sol acilimli standart pencere kanadi.",
    label: "Sol Kanat",
    openingType: "turn-left",
    commandAlias: "left"
  },
  {
    id: "tilt-right",
    title: "Vasistas",
    description: "Vasistas + sag acilimli modul.",
    label: "Vasistas",
    openingType: "tilt-turn-right",
    commandAlias: "tilt"
  },
  {
    id: "sliding-leaf",
    title: "Surme Kanat",
    description: "Secili paneli surme kanada cevirir.",
    label: "Surme",
    openingType: "sliding",
    commandAlias: "slide"
  }
];

export const rowLibraryModules: RowLibraryModule[] = [
  {
    id: "double-casement",
    title: "Cift Kanat",
    description: "Esit iki bolmeli klasik pencere duzeni.",
    commandAlias: "double",
    panels: [
      { ratio: 1, label: "Sol Kanat", openingType: "turn-left" },
      { ratio: 1, label: "Sag Kanat", openingType: "turn-right" }
    ]
  },
  {
    id: "triple-center-open",
    title: "Uc Bolmeli",
    description: "Ortada acilir, yanlarda sabit modul.",
    commandAlias: "triple",
    panels: [
      { ratio: 1, label: "Sabit", openingType: "fixed" },
      { ratio: 1, label: "Orta Kanat", openingType: "turn-right" },
      { ratio: 1, label: "Sabit", openingType: "fixed" }
    ]
  },
  {
    id: "slider-duo",
    title: "Balkon Surgu",
    description: "Iki kanatli surme sistem duzeni.",
    commandAlias: "slider",
    panels: [
      { ratio: 1, label: "Surme Sol", openingType: "sliding" },
      { ratio: 1, label: "Surme Sag", openingType: "sliding" }
    ]
  },
  {
    id: "door-side-lite",
    title: "Kapi + Yan Sabit",
    description: "Bir acilir kanat ve yanda sabit panel.",
    commandAlias: "doorlite",
    panels: [
      { ratio: 0.42, label: "Yan Sabit", openingType: "fixed" },
      { ratio: 0.58, label: "Kapi Kanadi", openingType: "turn-right" }
    ]
  },
  {
    id: "vasistas-band",
    title: "Vasistas Band",
    description: "Yanlarda sabit, ortada vasistas duzeni.",
    commandAlias: "band",
    panels: [
      { ratio: 1, label: "Sabit", openingType: "fixed" },
      { ratio: 0.9, label: "Vasistas", openingType: "tilt-turn-right" },
      { ratio: 1, label: "Sabit", openingType: "fixed" }
    ]
  },
  {
    id: "showcase-four",
    title: "Vitrin 4'lu",
    description: "Dortlu vitrin ve kayar son modul.",
    commandAlias: "showcase",
    panels: [
      { ratio: 1, label: "Sabit", openingType: "fixed" },
      { ratio: 1, label: "Sabit", openingType: "fixed" },
      { ratio: 1, label: "Sabit", openingType: "fixed" },
      { ratio: 0.8, label: "Surme", openingType: "sliding" }
    ]
  }
];

