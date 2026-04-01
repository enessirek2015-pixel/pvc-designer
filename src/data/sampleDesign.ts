import type { PvcDesign } from "../types/pvc";

function nextDesignId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function createBaseMaterials(): PvcDesign["materials"] {
  return {
    frameColor: "white",
    glassType: "double-clear",
    profileSeries: "comfort-70",
    materialSystem: "c60",
    hardwareQuality: "standard"
  };
}

export function createBaseCustomer(): PvcDesign["customer"] {
  return {
    customerName: "",
    projectCode: "",
    address: "",
    notes: ""
  };
}

export function createBaseGuides(): PvcDesign["guides"] {
  return [];
}

export function createBlankDesign({
  name = "Yeni Proje",
  totalWidth = 1500,
  totalHeight = 1500,
  outerFrameThickness = 70,
  mullionThickness = 60,
  materials,
  customer
}: Partial<
  Pick<PvcDesign, "name" | "totalWidth" | "totalHeight" | "outerFrameThickness" | "mullionThickness"> & {
    materials: Partial<PvcDesign["materials"]>;
    customer: Partial<PvcDesign["customer"]>;
  }
> = {}): PvcDesign {
  return {
    id: nextDesignId("design"),
    name,
    totalWidth,
    totalHeight,
    outerFrameThickness,
    mullionThickness,
    guides: createBaseGuides(),
    materials: { ...createBaseMaterials(), ...materials },
    customer: { ...createBaseCustomer(), ...customer },
    transoms: [
      {
        id: nextDesignId("transom"),
        height: totalHeight,
        panels: [
          {
            id: nextDesignId("panel"),
            width: totalWidth,
            openingType: "fixed",
            label: "Panel 1"
          }
        ]
      }
    ]
  };
}

export const sampleDesign: PvcDesign = {
  id: "design-001",
  name: "Salon Penceresi",
  totalWidth: 1800,
  totalHeight: 1700,
  outerFrameThickness: 70,
  mullionThickness: 60,
  guides: createBaseGuides(),
  materials: createBaseMaterials(),
  customer: createBaseCustomer(),
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
    guides: createBaseGuides(),
    materials: createBaseMaterials(),
    customer: createBaseCustomer(),
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
    guides: createBaseGuides(),
    materials: createBaseMaterials(),
    customer: createBaseCustomer(),
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
    guides: createBaseGuides(),
    materials: { ...createBaseMaterials(), frameColor: "anthracite", glassType: "triple-low-e", materialSystem: "sliding-system" },
    customer: createBaseCustomer(),
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
    guides: createBaseGuides(),
    materials: { ...createBaseMaterials(), profileSeries: "premium-76", materialSystem: "system-series" },
    customer: createBaseCustomer(),
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
    guides: createBaseGuides(),
    materials: { ...createBaseMaterials(), glassType: "double-low-e", materialSystem: "thermal-insulation" },
    customer: createBaseCustomer(),
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
    guides: createBaseGuides(),
    materials: { ...createBaseMaterials(), frameColor: "golden-oak", hardwareQuality: "premium", materialSystem: "aldoks" },
    customer: createBaseCustomer(),
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
