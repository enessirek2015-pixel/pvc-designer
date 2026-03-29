import type { PvcDesign } from "../types/pvc";

function baseMaterials(): PvcDesign["materials"] {
  return {
    frameColor: "white",
    glassType: "double-clear",
    profileSeries: "comfort-70",
    hardwareQuality: "standard"
  };
}

function baseCustomer(): PvcDesign["customer"] {
  return {
    customerName: "",
    projectCode: "",
    address: "",
    notes: ""
  };
}

function baseGuides(): PvcDesign["guides"] {
  return [];
}

export const sampleDesign: PvcDesign = {
  id: "design-001",
  name: "Salon Penceresi",
  totalWidth: 1800,
  totalHeight: 1700,
  outerFrameThickness: 70,
  mullionThickness: 60,
  guides: baseGuides(),
  materials: baseMaterials(),
  customer: baseCustomer(),
  transoms: [
    {
      id: "transom-top",
      height: 400,
      panels: [
        { id: "top-left", width: 600, openingType: "fixed", label: "Sabit" },
        { id: "top-center", width: 600, openingType: "fixed", label: "Sabit" },
        { id: "top-right", width: 600, openingType: "fixed", label: "Sabit" }
      ]
    },
    {
      id: "transom-bottom",
      height: 1300,
      panels: [
        { id: "bottom-left", width: 600, openingType: "fixed", label: "Sabit" },
        { id: "bottom-center", width: 600, openingType: "turn-right", label: "Sag Acilim" },
        { id: "bottom-right", width: 600, openingType: "fixed", label: "Sabit" }
      ]
    }
  ]
};

export const designTemplates: PvcDesign[] = [
  sampleDesign,
  {
    id: "design-002",
    name: "Tek Kanat Pencere",
    totalWidth: 900,
    totalHeight: 1400,
    outerFrameThickness: 70,
    mullionThickness: 60,
    guides: baseGuides(),
    materials: baseMaterials(),
    customer: baseCustomer(),
    transoms: [
      {
        id: "single-main",
        height: 1400,
        panels: [{ id: "single-panel", width: 900, openingType: "turn-right", label: "Sag Acilim" }]
      }
    ]
  },
  {
    id: "design-003",
    name: "Iki Kanat Pencere",
    totalWidth: 1400,
    totalHeight: 1400,
    outerFrameThickness: 70,
    mullionThickness: 60,
    guides: baseGuides(),
    materials: baseMaterials(),
    customer: baseCustomer(),
    transoms: [
      {
        id: "double-main",
        height: 1400,
        panels: [
          { id: "double-left", width: 700, openingType: "turn-left", label: "Sol Acilim" },
          { id: "double-right", width: 700, openingType: "turn-right", label: "Sag Acilim" }
        ]
      }
    ]
  },
  {
    id: "design-004",
    name: "Balkon Surgu",
    totalWidth: 2400,
    totalHeight: 2100,
    outerFrameThickness: 80,
    mullionThickness: 60,
    guides: baseGuides(),
    materials: { ...baseMaterials(), frameColor: "anthracite", glassType: "triple-low-e" },
    customer: baseCustomer(),
    transoms: [
      {
        id: "slider-main",
        height: 2100,
        panels: [
          { id: "slider-left", width: 800, openingType: "sliding", label: "Surme" },
          { id: "slider-center", width: 800, openingType: "fixed", label: "Sabit" },
          { id: "slider-right", width: 800, openingType: "sliding", label: "Surme" }
        ]
      }
    ]
  },
  {
    id: "design-005",
    name: "Uc Bolmeli Seri",
    totalWidth: 2750,
    totalHeight: 1200,
    outerFrameThickness: 70,
    mullionThickness: 55,
    guides: baseGuides(),
    materials: { ...baseMaterials(), profileSeries: "premium-76" },
    customer: baseCustomer(),
    transoms: [
      {
        id: "triple-main",
        height: 1200,
        panels: [
          { id: "triple-left", width: 1000, openingType: "turn-left", label: "Sol Acilim" },
          { id: "triple-center", width: 750, openingType: "fixed", label: "Sabit" },
          { id: "triple-right", width: 1000, openingType: "turn-right", label: "Sag Acilim" }
        ]
      }
    ]
  },
  {
    id: "design-006",
    name: "Vasistasli Pencere",
    totalWidth: 1800,
    totalHeight: 1700,
    outerFrameThickness: 70,
    mullionThickness: 60,
    guides: baseGuides(),
    materials: { ...baseMaterials(), glassType: "double-low-e" },
    customer: baseCustomer(),
    transoms: [
      {
        id: "vas-top",
        height: 350,
        panels: [
          { id: "vas-top-left", width: 600, openingType: "fixed", label: "Sabit" },
          { id: "vas-top-center", width: 600, openingType: "tilt-turn-right", label: "Vasistas" },
          { id: "vas-top-right", width: 600, openingType: "fixed", label: "Sabit" }
        ]
      },
      {
        id: "vas-bottom",
        height: 1350,
        panels: [
          { id: "vas-bottom-left", width: 600, openingType: "fixed", label: "Sabit" },
          { id: "vas-bottom-center", width: 600, openingType: "turn-right", label: "Sag Acilim" },
          { id: "vas-bottom-right", width: 600, openingType: "fixed", label: "Sabit" }
        ]
      }
    ]
  },
  {
    id: "design-007",
    name: "Kapi + Pencere",
    totalWidth: 2000,
    totalHeight: 2200,
    outerFrameThickness: 70,
    mullionThickness: 60,
    guides: baseGuides(),
    materials: { ...baseMaterials(), frameColor: "golden-oak", hardwareQuality: "premium" },
    customer: baseCustomer(),
    transoms: [
      {
        id: "door-window-top",
        height: 500,
        panels: [
          { id: "door-window-top-left", width: 900, openingType: "fixed", label: "Sabit" },
          { id: "door-window-top-right", width: 1100, openingType: "fixed", label: "Sabit" }
        ]
      },
      {
        id: "door-window-main",
        height: 1700,
        panels: [
          { id: "door-window-left", width: 900, openingType: "turn-right", label: "Kapi" },
          { id: "door-window-right", width: 1100, openingType: "fixed", label: "Sabit" }
        ]
      }
    ]
  }
];
