export type CanvasScreenPoint = {
  x: number;
  y: number;
};

export function getCanvasClientPoint(
  clientX: number,
  clientY: number,
  host: HTMLElement,
  viewBoxWidth: number,
  viewBoxHeight: number
): CanvasScreenPoint {
  const rect = host.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const safeWidth = Math.max(rect.width * pixelRatio, 1);
  const safeHeight = Math.max(rect.height * pixelRatio, 1);
  const localX = (clientX - rect.left) * pixelRatio;
  const localY = (clientY - rect.top) * pixelRatio;

  return {
    x: (localX / safeWidth) * viewBoxWidth,
    y: (localY / safeHeight) * viewBoxHeight
  };
}

export function getCanvasWorldPoint(
  clientX: number,
  clientY: number,
  host: HTMLElement,
  viewBoxWidth: number,
  viewBoxHeight: number,
  pan: { x: number; y: number },
  zoom: number
) {
  const point = getCanvasClientPoint(clientX, clientY, host, viewBoxWidth, viewBoxHeight);

  return {
    x: (point.x - pan.x) / zoom,
    y: (point.y - pan.y) / zoom
  };
}
