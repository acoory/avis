import { DamagePhoto } from "@/types/business";

export async function optimizeDamagePhoto(file: File) {
  const image = await loadImage(file);
  const maximumDimension = 1600;
  const scale = Math.min(
    1,
    maximumDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image compression unavailable");
  context.drawImage(image, 0, 0, width, height);

  const webp = await canvasToBlob(canvas, "image/webp", 0.75);
  const blob = webp ?? (await canvasToBlob(canvas, "image/jpeg", 0.78));
  if (!blob) throw new Error("Image compression failed");

  return new File(
    [blob],
    `damage-${Date.now()}.${blob.type === "image/webp" ? "webp" : "jpg"}`,
    {
      type: blob.type,
    },
  );
}

export function cloudinaryThumbnailUrl(photo: DamagePhoto, width = 320) {
  return cloudinaryProxyUrl(
    photo.secureUrl.replace(
      "/upload/",
      `/upload/f_auto,q_auto,c_limit,w_${width}/`,
    ),
  );
}

export function cloudinaryPreviewUrl(photo: DamagePhoto, width = 1200) {
  return cloudinaryProxyUrl(
    photo.secureUrl.replace(
      "/upload/",
      `/upload/f_auto,q_auto,c_limit,w_${width}/`,
    ),
  );
}

export function cloudinaryOriginalUrl(photo: DamagePhoto) {
  return cloudinaryProxyUrl(photo.secureUrl);
}

export function cloudinaryImageUrl(url: string) {
  return cloudinaryProxyUrl(url);
}

export function cloudinaryAssetUrl(url: string) {
  if (url.startsWith("/documents/")) {
    return url;
  }

  const parsedUrl = parseUrl(url);
  if (!parsedUrl || parsedUrl.hostname !== "res.cloudinary.com") {
    return url;
  }

  return `/documents${parsedUrl.pathname}${parsedUrl.search}`;
}

export function cloudinaryStorageUrl(url: string) {
  if (url.startsWith("/cloudinary/")) {
    return `https://res.cloudinary.com/${url.slice("/cloudinary/".length)}`;
  }

  return url;
}

function cloudinaryProxyUrl(url: string) {
  if (url.startsWith("/cloudinary/")) {
    return url;
  }

  const parsedUrl = parseUrl(url);
  if (!parsedUrl || parsedUrl.hostname !== "res.cloudinary.com") {
    return url;
  }

  return `/cloudinary${parsedUrl.pathname}${parsedUrl.search}`;
}

function parseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}
