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
};

export function RotatablePhoto({
  alt,
  className,
  decoding = "async",
  onError,
  onLoad,
  rotation,
  src,
}: RotatablePhotoProps) {
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

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    setImageSize({ height: image.naturalHeight, width: image.naturalWidth });
    onLoad?.();
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      ref={containerRef}
    >
      <img
        alt={alt}
        className={cn(
          "max-h-none max-w-none object-contain transition-transform duration-200",
          dimensions ? "opacity-100" : "opacity-0",
          className,
        )}
        decoding={decoding}
        src={src}
        style={{
          height: dimensions?.height,
          transform: `rotate(${rotation}deg)`,
          width: dimensions?.width,
        }}
        onError={onError}
        onLoad={handleLoad}
      />
    </div>
  );
}
