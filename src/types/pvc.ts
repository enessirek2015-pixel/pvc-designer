export type OpeningType =
  | "fixed"
  | "turn-right"
  | "turn-left"
  | "tilt-turn-right"
  | "sliding";

export interface PanelDefinition {
  id: string;
  width: number;
  openingType: OpeningType;
  label: string;
}

export interface TransomDefinition {
  id: string;
  height: number;
  panels: PanelDefinition[];
}

export interface PvcDesign {
  id: string;
  name: string;
  totalWidth: number;
  totalHeight: number;
  outerFrameThickness: number;
  mullionThickness: number;
  transoms: TransomDefinition[];
}

export interface SaveDesignPayload {
  suggestedName: string;
  content: PvcDesign;
}

export interface DesktopApi {
  saveProject: (payload: SaveDesignPayload) => Promise<{ canceled: boolean; path?: string }>;
  openProject: () => Promise<{ canceled: boolean; content?: PvcDesign; path?: string }>;
}
