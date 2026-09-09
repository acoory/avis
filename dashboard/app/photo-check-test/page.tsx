"use client";
import { useState } from "react";
import { PhotoCarousel } from "@/components/business/photo-carousel";
const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#0f766e"/><path d="M0 300H800M400 0V600" stroke="white" stroke-width="8"/><text x="80" y="150" fill="white" font-size="48">Détails du véhicule</text></svg>');
const items = ["Photo A", "Photo B"].map(id => ({id,label:id,previewUrl:svg,thumbnailUrl:svg}));
export default function Check() {
 const [index,setIndex] = useState(0);
 const [open,setOpen] = useState(true);
 return <main><h1>Test local zoom</h1>{open && <PhotoCarousel currentIndex={index} items={items} onIndexChange={setIndex} onClose={() => setOpen(false)} />}</main>;
}
