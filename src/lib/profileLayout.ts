import type { OpeningType, PvcDesign } from "../types/pvc";
import { profileSeriesCatalog } from "./systemCatalog";

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ProfileLayout {
  frameRect: LayoutRect;
  sashRect: LayoutRect | null;
  glassRect: LayoutRect;
  beadRect: LayoutRect;
  frameDetailRects: LayoutRect[];
  sashDetailRects: LayoutRect[];
  reinforcementLines: LayoutLine[];
  thermalChamberLines: LayoutLine[];
  gasketLines: LayoutLine[];
  drainageSlots: LayoutRect[];
}

export function buildProfileLayout(
  design: PvcDesign,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  openingType: OpeningType
): ProfileLayout {
  const profileSpec = profileSeriesCatalog[design.materials.profileSeries];
  const fixedInset = Math.max(10, Math.round(profileSpec.depthMm * 0.18 * scale));
  const sashInset = Math.max(14, Math.round(profileSpec.depthMm * 0.28 * scale));
  const beadInset = Math.max(8, Math.round(profileSpec.depthMm * 0.12 * scale));
  const frameChannelInset = Math.max(4, Math.round(fixedInset * 0.45));
  const frameCoreInset = Math.max(frameChannelInset + 3, Math.round(fixedInset * 0.72));
  const sashChannelInset = Math.max(4, Math.round(sashInset * 0.42));
  const sashCoreInset = Math.max(sashChannelInset + 3, Math.round(sashInset * 0.68));

  const frameRect = { x, y, width, height };
  const frameDetailRects = [
    insetRect(frameRect, frameChannelInset),
    insetRect(frameRect, frameCoreInset)
  ].filter((rect) => rect.width > 26 && rect.height > 26);

  if (openingType === "fixed") {
    const glassRect = insetRect(frameRect, fixedInset + beadInset);
    const beadRect = insetRect(glassRect, Math.max(3, Math.round(beadInset * 0.38)));
    return {
      frameRect,
      sashRect: null,
      glassRect,
      beadRect,
      frameDetailRects,
      sashDetailRects: [],
      reinforcementLines: buildReinforcementLines(frameRect, null),
      thermalChamberLines: buildThermalChamberLines(frameRect, null, profileSpec.depthMm),
      gasketLines: buildGasketLines(beadRect),
      drainageSlots: buildDrainageSlots(frameRect)
    };
  }

  const sashRect = insetRect(frameRect, sashInset);
  const glassRect = insetRect(sashRect, beadInset);
  const beadRect = insetRect(glassRect, Math.max(3, Math.round(beadInset * 0.36)));
  return {
    frameRect,
    sashRect,
    glassRect,
    beadRect,
    frameDetailRects,
    sashDetailRects: [
      insetRect(sashRect, sashChannelInset),
      insetRect(sashRect, sashCoreInset)
    ].filter((rect) => rect.width > 22 && rect.height > 22),
    reinforcementLines: buildReinforcementLines(frameRect, sashRect),
    thermalChamberLines: buildThermalChamberLines(frameRect, sashRect, profileSpec.depthMm),
    gasketLines: buildGasketLines(beadRect),
    drainageSlots: buildDrainageSlots(frameRect)
  };
}

function insetRect(rect: LayoutRect, inset: number): LayoutRect {
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(24, rect.width - inset * 2),
    height: Math.max(24, rect.height - inset * 2)
  };
}

function buildReinforcementLines(frameRect: LayoutRect, sashRect: LayoutRect | null): LayoutLine[] {
  const lines: LayoutLine[] = [
    {
      x1: frameRect.x + 10,
      y1: frameRect.y + frameRect.height * 0.28,
      x2: frameRect.x + frameRect.width - 10,
      y2: frameRect.y + frameRect.height * 0.28
    },
    {
      x1: frameRect.x + 10,
      y1: frameRect.y + frameRect.height * 0.72,
      x2: frameRect.x + frameRect.width - 10,
      y2: frameRect.y + frameRect.height * 0.72
    }
  ];

  if (sashRect) {
    lines.push(
      {
        x1: sashRect.x + sashRect.width * 0.22,
        y1: sashRect.y + 8,
        x2: sashRect.x + sashRect.width * 0.22,
        y2: sashRect.y + sashRect.height - 8
      },
      {
        x1: sashRect.x + sashRect.width * 0.78,
        y1: sashRect.y + 8,
        x2: sashRect.x + sashRect.width * 0.78,
        y2: sashRect.y + sashRect.height - 8
      }
    );
  }

  return lines;
}

function buildGasketLines(beadRect: LayoutRect): LayoutLine[] {
  const inset = 4;
  return [
    {
      x1: beadRect.x + inset,
      y1: beadRect.y + inset,
      x2: beadRect.x + beadRect.width - inset,
      y2: beadRect.y + inset
    },
    {
      x1: beadRect.x + inset,
      y1: beadRect.y + beadRect.height - inset,
      x2: beadRect.x + beadRect.width - inset,
      y2: beadRect.y + beadRect.height - inset
    }
  ];
}

function buildThermalChamberLines(frameRect: LayoutRect, sashRect: LayoutRect | null, depthMm: number): LayoutLine[] {
  const chamberCount = depthMm >= 82 ? 5 : depthMm >= 76 ? 4 : depthMm >= 70 ? 3 : 2;
  const lines: LayoutLine[] = [];

  for (let index = 1; index <= chamberCount; index += 1) {
    const ratio = index / (chamberCount + 1);
    lines.push({
      x1: frameRect.x + frameRect.width * ratio,
      y1: frameRect.y + 12,
      x2: frameRect.x + frameRect.width * ratio,
      y2: frameRect.y + frameRect.height - 12
    });
  }

  if (sashRect) {
    for (let index = 1; index <= Math.max(2, chamberCount - 1); index += 1) {
      const ratio = index / Math.max(3, chamberCount);
      lines.push({
        x1: sashRect.x + 10,
        y1: sashRect.y + sashRect.height * ratio,
        x2: sashRect.x + sashRect.width - 10,
        y2: sashRect.y + sashRect.height * ratio
      });
    }
  }

  return lines;
}

function buildDrainageSlots(frameRect: LayoutRect): LayoutRect[] {
  const slotWidth = Math.max(10, Math.round(frameRect.width * 0.05));
  const slotHeight = 4;
  const y = frameRect.y + frameRect.height - 10;
  return [0.28, 0.5, 0.72].map((ratio) => ({
    x: frameRect.x + frameRect.width * ratio - slotWidth / 2,
    y,
    width: slotWidth,
    height: slotHeight
  }));
}
