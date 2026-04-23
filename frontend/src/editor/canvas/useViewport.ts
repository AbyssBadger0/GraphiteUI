import { computed, reactive } from "vue";

type PanState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export function useViewport() {
  const viewport = reactive({
    x: 0,
    y: 0,
    scale: 1,
  });

  const panState = reactive<PanState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const isPanning = computed(() => panState.pointerId !== null);

  function beginPan(event: PointerEvent) {
    panState.pointerId = event.pointerId;
    panState.startX = event.clientX;
    panState.startY = event.clientY;
    panState.originX = viewport.x;
    panState.originY = viewport.y;
  }

  function movePan(event: PointerEvent) {
    if (panState.pointerId !== event.pointerId) {
      return;
    }
    viewport.x = panState.originX + (event.clientX - panState.startX);
    viewport.y = panState.originY + (event.clientY - panState.startY);
  }

  function endPan(event?: PointerEvent) {
    if (event && panState.pointerId !== event.pointerId) {
      return;
    }
    panState.pointerId = null;
  }

  function zoomBy(deltaY: number) {
    const direction = deltaY > 0 ? -0.08 : 0.08;
    viewport.scale = clamp(viewport.scale + direction, 0.4, 2.2);
  }

  function zoomAt(input: { clientX: number; clientY: number; canvasLeft: number; canvasTop: number; nextScale: number }) {
    const currentScale = viewport.scale || 1;
    const nextScale = clamp(input.nextScale, 0.4, 2.2);
    const anchorX = input.clientX - input.canvasLeft;
    const anchorY = input.clientY - input.canvasTop;
    const worldX = (anchorX - viewport.x) / currentScale;
    const worldY = (anchorY - viewport.y) / currentScale;

    viewport.scale = nextScale;
    viewport.x = anchorX - worldX * nextScale;
    viewport.y = anchorY - worldY * nextScale;
  }

  function setViewport(nextViewport: { x: number; y: number; scale: number }) {
    viewport.x = nextViewport.x;
    viewport.y = nextViewport.y;
    viewport.scale = clamp(nextViewport.scale, 0.4, 2.2);
  }

  return {
    viewport,
    isPanning,
    beginPan,
    movePan,
    endPan,
    zoomBy,
    zoomAt,
    setViewport,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
