export function resolveCanvasSurfaceStyle(viewport: { x: number; y: number; scale: number }) {
  const gridSize = 28 * viewport.scale;

  return {
    backgroundPosition: `${viewport.x}px ${viewport.y}px, 0 0`,
    backgroundSize: `${gridSize}px ${gridSize}px, auto auto`,
  };
}
