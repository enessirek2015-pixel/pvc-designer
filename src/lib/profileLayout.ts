import type { OpeningType, PvcDesign } from "../types/pvc";
import { profileSeriesCatalog } from "./systemCatalog";

export interface ProfileLayout {
  frameRect: { x: number; y: number; width: number; height: number };
  sashRect: { x: number; y: number; width: number; height: number } | null;
  glassRect: { x: number; y: number; width: number; height: number };
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

  const frameRect = { x, y, width, height };

  if (openingType === "fixed") {
    return {
      frameRect,
      sashRect: null,
      glassRect: insetRect(frameRect, fixedInset + beadInset)
    };
  }

  const sashRect = insetRect(frameRect, sashInset);
  return {
    frameRect,
    sashRect,
    glassRect: insetRect(sashRect, beadInset)
  };
}

function insetRect(
  rect: { x: number; y: number; width: number; height: number },
  inset: number
) {
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(24, rect.width - inset * 2),
    height: Math.max(24, rect.height - inset * 2)
  };
}
