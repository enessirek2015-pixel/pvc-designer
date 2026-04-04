import type { PvcDesign } from "../types/pvc";
import type { CanvasLayout } from "./canvasLayout";

export function buildDesignSvg(design: PvcDesign, layout: CanvasLayout, scale = 0.5): string {
  const W = Math.round(design.totalWidth * scale);
  const H = Math.round(design.totalHeight * scale);
  const pad = 40;
  const svgW = W + pad * 2;
  const svgH = H + pad * 2;

  const lines: string[] = [];

  // Outer frame
  lines.push(`<rect x="${pad}" y="${pad}" width="${W}" height="${H}" fill="none" stroke="#1a2332" stroke-width="3"/>`);

  // Mullions (vertical) — derive position relative to outer frame
  const originX = layout.outerRect.x;
  const originY = layout.outerRect.y;
  const outerW = layout.outerRect.width;
  const outerH = layout.outerRect.height;
  for (const bar of layout.verticalBars) {
    const relX = bar.centerX - originX;
    const x = pad + Math.round((relX / outerW) * W);
    lines.push(`<line x1="${x}" y1="${pad}" x2="${x}" y2="${pad + H}" stroke="#1a2332" stroke-width="2"/>`);
  }

  // Transoms (horizontal)
  let yOffset = pad;
  for (let ri = 0; ri < layout.rows.length - 1; ri++) {
    const rowH = layout.rows[ri].bounds.height;
    const relH = rowH / outerH;
    yOffset += Math.round(relH * H);
    lines.push(`<line x1="${pad}" y1="${yOffset}" x2="${pad + W}" y2="${yOffset}" stroke="#1a2332" stroke-width="2"/>`);
  }

  void originY; // used for reference, suppress unused warning

  // Dimension labels
  lines.push(`<text x="${pad + W / 2}" y="${pad - 8}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#2a4a8a">${design.totalWidth} mm</text>`);
  lines.push(`<text x="${pad - 10}" y="${pad + H / 2}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#2a4a8a" transform="rotate(-90, ${pad - 10}, ${pad + H / 2})">${design.totalHeight} mm</text>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="#f4f7fb"/>
  ${lines.join("\n  ")}
  <text x="${svgW / 2}" y="${svgH - 8}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#8a96a8">${design.name} — PVC Designer</text>
</svg>`;
}

export function downloadSvg(svgContent: string, fileName: string) {
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
