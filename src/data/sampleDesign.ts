import type { PvcDesign } from "../types/pvc";

export const sampleDesign: PvcDesign = {
  id: "design-001",
  name: "Salon Penceresi",
  totalWidth: 1800,
  totalHeight: 1700,
  outerFrameThickness: 70,
  mullionThickness: 60,
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
        {
          id: "bottom-left",
          width: 600,
          openingType: "fixed",
          label: "Sabit"
        },
        {
          id: "bottom-center",
          width: 600,
          openingType: "turn-right",
          label: "Sag Acilim"
        },
        {
          id: "bottom-right",
          width: 600,
          openingType: "fixed",
          label: "Sabit"
        }
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
    transoms: [
      {
        id: "single-main",
        height: 1400,
        panels: [
          {
            id: "single-panel",
            width: 900,
            openingType: "turn-right",
            label: "Sag Acilim"
          }
        ]
      }
    ]
  },
  {
    id: "design-003",
    name: "Balkon Kapisi",
    totalWidth: 1600,
    totalHeight: 2200,
    outerFrameThickness: 70,
    mullionThickness: 60,
    transoms: [
      {
        id: "door-top",
        height: 400,
        panels: [
          { id: "door-top-left", width: 800, openingType: "fixed", label: "Sabit" },
          { id: "door-top-right", width: 800, openingType: "fixed", label: "Sabit" }
        ]
      },
      {
        id: "door-main",
        height: 1800,
        panels: [
          { id: "door-left", width: 800, openingType: "fixed", label: "Sabit" },
          { id: "door-right", width: 800, openingType: "turn-right", label: "Kapi" }
        ]
      }
    ]
  },
  {
    id: "design-004",
    name: "Surme Seri",
    totalWidth: 2400,
    totalHeight: 2100,
    outerFrameThickness: 80,
    mullionThickness: 60,
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
  }
];
