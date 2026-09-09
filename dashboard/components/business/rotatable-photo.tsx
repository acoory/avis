"use client";

import { SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Size = {
  height: number;
  width: number;
};

type RotatablePhotoProps = {
  alt: string;
  className?: string;
  decoding?: "async" | "auto" | "sync";
  onError?: () => void;
  onLoad?: () => void;
  rotation: number;
  src: string;
  zoom?: number;
};

export function RotatablePhoto({
  alt,
  className,
  decoding = "async",
  onError,
  onLoad,
  rotation,
  src,
  zoom = 1,
}: RotatablePhotoProps) {
  const [pan, setPan] = useState({ x: 0, y: 0, zoom, rotation, src });
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<Size>({
    height: 0,
    width: 0,
  });
  const [imageSize, setImageSize] = useState<Size>({ height: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const bounds = container.getBoundingClientRect();
      setContainerSize({ height: bounds.height, width: bounds.width });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const dimensions = useMemo(() => {
    if (
      !containerSize.width ||
      !containerSize.height ||
      !imageSize.width ||
      !imageSize.height
    ) {
      return null;
    }

    const availableWidth = Math.max(1, containerSize.width - 8);
    const availableHeight = Math.max(1, containerSize.height - 8);
    const isQuarterTurn = rotation % 180 !== 0;
    const rotatedWidth = isQuarterTurn ? imageSize.height : imageSize.width;
    const rotatedHeight = isQuarterTurn ? imageSize.width : imageSize.height;
    const scale = Math.min(
      availableWidth / rotatedWidth,
      availableHeight / rotatedHeight,
    );

    return {
      height: imageSize.height * scale,
      width: imageSize.width * scale,
    };
  }, [containerSize, imageSize, rotation]);

  const quarterTurn = rotation % 180 !== 0;
  const limitX = dimensions
    ? Math.max(
        0,
        ((quarterTurn ? dimensions.height : dimensions.width) * zoom -
          containerSize.width) /
          2,
      )
    : 0;
  const limitY = dimensions
    ? Math.max(
        0,
        ((quarterTurn ? dimensions.width : dimensions.height) * zoom -
          containerSize.height) /
          2,
      )
    : 0;
  const sameView =
    pan.zoom === zoom && pan.rotation === rotation && pan.src === src;
  if (!sameView) {
    setPan({ x: 0, y: 0, zoom, rotation, src });
  }
  const offsetX = sameView ? Math.max(-limitX, Math.min(limitX, pan.x)) : 0;
  const offsetY = sameView ? Math.max(-limitY, Math.min(limitY, pan.y)) : 0;

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    setImageSize({ height: image.naturalHeight, width: image.naturalWidth });
    onLoad?.();
  }

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center overflow-hidden",
        zoom > 1 && "cursor-grab active:cursor-grabbing",
      )}
      style={{ touchAction: zoom > 1 ? "none" : "auto" }}
      onPointerDown={(event) => {
        if (zoom <= 1 || !dimensions || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          originX: offsetX,
          originY: offsetY,
        };
      }}
      onPointerMove={(event) => {
        const origin = drag.current;
        if (!origin || origin.pointerId !== event.pointerId || zoom <= 1)
          return;
        setPan({
          x: Math.max(
            -limitX,
            Math.min(limitX, origin.originX + event.clientX - origin.x),
          ),
          y: Math.max(
            -limitY,
            Math.min(limitY, origin.originY + event.clientY - origin.y),
          ),
          zoom,
          rotation,
          src,
        });
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      ref={containerRef}
    >
      <img
        alt={alt}
        className={cn(
          "max-h-none max-w-none select-none object-contain",
          dimensions ? "opacity-100" : "opacity-0",
          className,
        )}
        draggable={false}
        decoding={decoding}
        src={src}
        style={{
          height: dimensions?.height,
          transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${zoom})`,
          width: dimensions?.width,
        }}
        onError={onError}
        onLoad={handleLoad}
      />
    </div>
  );
}
