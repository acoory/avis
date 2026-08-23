"use client";

import { useMemo } from "react";
import {
  PhotoCarousel,
  PhotoCarouselItem,
} from "@/components/business/photo-carousel";
import {
  cloudinaryPreviewUrl,
  cloudinaryThumbnailUrl,
} from "@/lib/damage-photo";
import { DamagePhoto } from "@/types/business";

type DamagePhotoGalleryProps = {
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  photos: DamagePhoto[];
  title?: string;
};

export function DamagePhotoGallery({
  index,
  onClose,
  onIndexChange,
  photos,
  title = "Photo",
}: DamagePhotoGalleryProps) {
  const items = useMemo<PhotoCarouselItem[]>(
    () =>
      photos.map((photo, photoIndex) => ({
        id: photo.id ?? photo.publicId,
        label: `Photo ${photoIndex + 1}`,
        previewUrl: cloudinaryPreviewUrl(photo),
        thumbnailUrl: cloudinaryThumbnailUrl(photo, 200),
      })),
    [photos],
  );
  const safeIndex = items.length
    ? Math.min(Math.max(index, 0), items.length - 1)
    : 0;

  if (!items.length) return null;

  return (
    <PhotoCarousel
      currentIndex={safeIndex}
      items={items}
      title={title}
      onClose={onClose}
      onIndexChange={onIndexChange}
    />
  );
}
