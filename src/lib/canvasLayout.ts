import type { PvcDesign } from "../types/pvc";

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasPanelLayout {
  transomId: string;
  transomIndex: number;
  panelId: string;
  panelIndex: number;
  widthMm: number;
  heightMm: number;
  cellBounds: CanvasRect;
  bounds: CanvasRect;
  centerX: number;
  centerY: number;
}

export interface CanvasMullionLayout {
  transomId: string;
  transomIndex: number;
  panelId: string;
  panelIndex: number;
  rect: CanvasRect;
  centerX: number;
}

export interface CanvasHorizontalBarLayout {
  aboveTransomId: string;
  transomIndex: number;
  rect: CanvasRect;
  centerY: number;
}

export interface CanvasRowLayout {
  transomId: string;
  transomIndex: number;
  heightMm: number;
  cellBounds: CanvasRect;
  bounds: CanvasRect;
  centerY: number;
  panels: CanvasPanelLayout[];
  mullions: CanvasMullionLayout[];
}

export interface CanvasLayout {
  outerRect: CanvasRect;
  innerRect: CanvasRect;
  frameInset: number;
  mullionSize: number;
  rows: CanvasRowLayout[];
  verticalBars: CanvasMullionLayout[];
  horizontalBars: CanvasHorizontalBarLayout[];
}

export function buildCanvasLayout(
  design: PvcDesign,
  outerRect: CanvasRect,
  scale: number
): CanvasLayout {
  const frameInset = design.outerFrameThickness * scale;
  const mullionSize = design.mullionThickness * scale;
  const halfMullion = mullionSize / 2;
  const innerRect = {
    x: outerRect.x + frameInset,
    y: outerRect.y + frameInset,
    width: Math.max(24, outerRect.width - frameInset * 2),
    height: Math.max(24, outerRect.height - frameInset * 2)
  };

  let currentY = innerRect.y;
  const rows: CanvasRowLayout[] = [];
  const verticalBars: CanvasMullionLayout[] = [];
  const horizontalBars: CanvasHorizontalBarLayout[] = [];

  design.transoms.forEach((transom, transomIndex) => {
    const cellHeight = transom.height * scale;
    const topInset = transomIndex === 0 ? 0 : halfMullion;
    const bottomInset = transomIndex === design.transoms.length - 1 ? 0 : halfMullion;
    const rowCellBounds = {
      x: innerRect.x,
      y: currentY,
      width: innerRect.width,
      height: cellHeight
    };
    const rowBounds = {
      x: rowCellBounds.x,
      y: rowCellBounds.y + topInset,
      width: rowCellBounds.width,
      height: Math.max(18, rowCellBounds.height - topInset - bottomInset)
    };

    let currentX = innerRect.x;
    const panels: CanvasPanelLayout[] = [];
    const mullions: CanvasMullionLayout[] = [];

    transom.panels.forEach((panel, panelIndex) => {
      const cellWidth = panel.width * scale;
      const leftInset = panelIndex === 0 ? 0 : halfMullion;
      const rightInset = panelIndex === transom.panels.length - 1 ? 0 : halfMullion;
      const cellBounds = {
        x: currentX,
        y: currentY,
        width: cellWidth,
        height: cellHeight
      };
      const bounds = {
        x: cellBounds.x + leftInset,
        y: rowBounds.y,
        width: Math.max(18, cellBounds.width - leftInset - rightInset),
        height: rowBounds.height
      };

      panels.push({
        transomId: transom.id,
        transomIndex,
        panelId: panel.id,
        panelIndex,
        widthMm: panel.width,
        heightMm: transom.height,
        cellBounds,
        bounds,
        centerX: bounds.x + bounds.width / 2,
        centerY: bounds.y + bounds.height / 2
      });

      if (panelIndex < transom.panels.length - 1) {
        const centerX = currentX + cellWidth;
        const bar = {
          transomId: transom.id,
          transomIndex,
          panelId: panel.id,
          panelIndex,
          rect: {
            x: centerX - halfMullion,
            y: rowBounds.y,
            width: mullionSize,
            height: rowBounds.height
          },
          centerX
        };
        mullions.push(bar);
        verticalBars.push(bar);
      }

      currentX += cellWidth;
    });

    rows.push({
      transomId: transom.id,
      transomIndex,
      heightMm: transom.height,
      cellBounds: rowCellBounds,
      bounds: rowBounds,
      centerY: rowBounds.y + rowBounds.height / 2,
      panels,
      mullions
    });

    currentY += cellHeight;

    if (transomIndex < design.transoms.length - 1) {
      horizontalBars.push({
        aboveTransomId: transom.id,
        transomIndex,
        rect: {
          x: innerRect.x,
          y: currentY - halfMullion,
          width: innerRect.width,
          height: mullionSize
        },
        centerY: currentY
      });
    }
  });

  return {
    outerRect,
    innerRect,
    frameInset,
    mullionSize,
    rows,
    verticalBars,
    horizontalBars
  };
}

export function getCanvasRowLayout(layout: CanvasLayout, transomId: string) {
  return layout.rows.find((row) => row.transomId === transomId) ?? null;
}

export function getCanvasPanelLayout(layout: CanvasLayout, transomId: string, panelId: string) {
  const row = getCanvasRowLayout(layout, transomId);
  if (!row) {
    return null;
  }
  return row.panels.find((panel) => panel.panelId === panelId) ?? null;
}

export function getCanvasMullionLayout(layout: CanvasLayout, transomId: string, panelId: string) {
  return layout.verticalBars.find((bar) => bar.transomId === transomId && bar.panelId === panelId) ?? null;
}

export function getCanvasHorizontalBarLayout(layout: CanvasLayout, aboveTransomId: string) {
  return layout.horizontalBars.find((bar) => bar.aboveTransomId === aboveTransomId) ?? null;
}
