import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const STEP = 0.25;

/**
 * Reproduces the zoom in / zoom out / reset + ctrl-wheel-zoom + drag-to-pan
 * behaviour from the original script.js, scoped to a wrap/img element pair.
 */
export function useChequeZoom() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScaleState] = useState(1);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeftStart = useRef(0);
  const scrollTopStart = useRef(0);

  const setScale = useCallback((next: number) => {
    setScaleState(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
  }, []);

  const zoomIn = useCallback(() => setScale(scale + STEP), [scale, setScale]);
  const zoomOut = useCallback(() => setScale(scale - STEP), [scale, setScale]);
  const zoomReset = useCallback(() => {
    setScale(1);
    const wrap = wrapRef.current;
    if (wrap) {
      wrap.scrollLeft = 0;
      wrap.scrollTop = 0;
    }
  }, [setScale]);

  // Ctrl/Cmd + wheel to zoom; plain wheel still scrolls normally.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(scale + (e.deltaY < 0 ? STEP : -STEP));
      }
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [scale, setScale]);

  // Click-and-drag panning.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      wrap.classList.add("grabbing");
      startX.current = e.pageX;
      startY.current = e.pageY;
      scrollLeftStart.current = wrap.scrollLeft;
      scrollTopStart.current = wrap.scrollTop;
    };

    const onMouseUp = () => {
      isDragging.current = false;
      wrap.classList.remove("grabbing");
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      wrap.scrollLeft = scrollLeftStart.current - (e.pageX - startX.current);
      wrap.scrollTop = scrollTopStart.current - (e.pageY - startY.current);
    };

    wrap.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      wrap.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return {
    wrapRef,
    imgRef,
    scale,
    zoomLevelLabel: `${Math.round(scale * 100)}%`,
    zoomIn,
    zoomOut,
    zoomReset,
  };
}
