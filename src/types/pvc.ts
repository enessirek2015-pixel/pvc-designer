export type OpeningType =
  | "fixed"
  | "turn-right"
  | "turn-left"
  | "tilt-turn-right"
  | "tilt-turn-left"
  | "sliding";

export interface PanelDefinition {
  id: string;
  width: number;
  openingType: OpeningType;
  label: string;
}

export type FrameColor =
  | "white"
  | "cream"
  | "anthracite"
  | "black"
  | "golden-oak"
  | "walnut"
  | "mahogany"
  | "silver";

export type GlassType =
  | "single-clear"
  | "double-clear"
  | "triple-clear"
  | "double-low-e"
  | "triple-low-e"
  | "tempered-clear"
  | "laminated-clear"
  | "reflective-blue"
  | "reflective-smoke"
  | "frosted";

export type ProfileSeries =
  | "standard-58"
  | "comfort-70"
  | "premium-76"
  | "elite-82"
  | "veka-softline"
  | "rehau-synego";

export type MaterialSystem =
  | "aldoks"
  | "c60"
  | "thermal-insulation"
  | "sliding-system"
  | "system-series";

export type HardwareQuality = "economy" | "standard" | "premium";

export interface DesignMaterials {
  frameColor: FrameColor;
  glassType: GlassType;
  profileSeries: ProfileSeries;
  materialSystem: MaterialSystem;
  hardwareQuality: HardwareQuality;
}

export interface CustomerInfo {
  customerName: string;
  projectCode: string;
  address: string;
  notes: string;
}

export type LinkedWallType = "interior" | "exterior" | "partition" | "curtain";

export interface DesignProjectLink {
  source: "free-draw-opening" | "free-draw-facade" | "free-draw-facade-bundle";
  bundleId?: string;
  bundleName?: string;
  chainId?: string;
  wallId?: string;
  roomName?: string;
  wallType?: LinkedWallType;
  facadeTitle?: string;
  segmentLabel?: string;
  openingCount?: number;
  importedAt?: string;
}

export interface DesignRevisionEntry {
  id: string;
  createdAt: string;
  source: "import" | "sync" | "bulk-material" | "manual";
  label: string;
  detail: string;
}

export interface TransomDefinition {
  id: string;
  height: number;
  panels: PanelDefinition[];
}

export type GuideOrientation = "vertical" | "horizontal";

export interface ReferenceGuide {
  id: string;
  orientation: GuideOrientation;
  positionMm: number;
  locked: boolean;
  label: string;
}

export interface PvcDesign {
  id: string;
  name: string;
  totalWidth: number;
  totalHeight: number;
  outerFrameThickness: number;
  mullionThickness: number;
  transoms: TransomDefinition[];
  guides: ReferenceGuide[];
  materials: DesignMaterials;
  customer: CustomerInfo;
  projectLink?: DesignProjectLink;
  revisionHistory?: DesignRevisionEntry[];
}

export interface SaveDesignPayload {
  suggestedName: string;
  content: PvcDesign;
}

export interface DesktopApi {
  saveProject: (payload: SaveDesignPayload) => Promise<{ canceled: boolean; path?: string }>;
  openProject: () => Promise<{ canceled: boolean; content?: PvcDesign; path?: string }>;
  openProjectPath?: (path: string) => Promise<{ canceled: boolean; content?: PvcDesign; path?: string; error?: string }>;
  printBom: (html: string) => Promise<void>;
  printTechnical: (html: string) => Promise<void>;
}
