"use client";

import { useState } from "react";
import { PhotoCarousel } from "@/components/business/photo-carousel";
import { commercialSlots } from "@/lib/risk-commercial";
import { cloudinaryImageUrl } from "@/lib/damage-photo";
import { PublicCommercialGallery } from "@/types/risk";

export function CommercialGallery({
  photos,
}: {
  photos: PublicCommercialGallery["photos"];
}) {
  const [index, setIndex] = useState<number | null>(null);
  const items = commercialSlots.flatMap((slot) =>
    photos
      .filter((photo) => photo.slotKey === slot.key)
      .map((photo) => ({
        id: photo.id,
        label: slot.label,
        section: slot.group,
        previewUrl: cloudinaryImageUrl(photo.secureUrl),
        thumbnailUrl: cloudinaryImageUrl(
          photo.secureUrl.replace(
            "/upload/",
            "/upload/f_auto,q_auto,c_limit,w_600/",
          ),
        ),
      })),
  );
  return (
    <div className="space-y-6">
      {[...new Set(items.map((item) => item.section))].map((group) => (
        <section key={group}>
          <h3 className="mb-3 font-semibold text-slate-900">{group}</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {items
              .filter((item) => item.section === group)
              .map((item) => (
                <div key={item.id}>
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left hover:border-teal-500"
                    onClick={() => setIndex(items.indexOf(item))}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={item.label}
                      src={item.thumbnailUrl}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <span className="block p-3 text-sm font-medium">
                      {item.label}
                    </span>
                  </button>
                  <a
                    className="mt-1 inline-block text-xs text-teal-700 underline"
                    href={item.previewUrl.replace(
                      "/upload/",
                      "/upload/fl_attachment/",
                    )}
                  >
                    Télécharger la photo
                  </a>
                </div>
              ))}
          </div>
        </section>
      ))}
      {index !== null && (
        <PhotoCarousel
          currentIndex={index}
          items={items}
          onClose={() => setIndex(null)}
          onIndexChange={setIndex}
          title="Photos commerciales"
        />
      )}
    </div>
  );
}
