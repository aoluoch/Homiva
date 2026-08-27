import { filePreview, fileView } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import type { Property } from "@/types/models";

export const PROPERTY_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
       <rect width='100%' height='100%' fill='hsl(150,16%,94%)'/>
       <text x='50%' y='50%' font-family='sans-serif' font-size='28'
         fill='hsl(155,8%,55%)' text-anchor='middle' dominant-baseline='middle'>
         Homiva
       </text>
     </svg>`,
  );

export function propertyGallery(
  property?: Pick<Property, "coverImageId" | "imageIds"> | null,
): string[] {
  if (!property) return [];
  const raw = property.imageIds as unknown;
  let ids: string[] = [];
  if (Array.isArray(raw)) {
    ids = raw.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        ids = parsed.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        );
      }
    } catch {
      ids = raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }
  const cover =
    typeof property.coverImageId === "string" ? property.coverImageId.trim() : "";
  if (cover && !ids.includes(cover)) ids.unshift(cover);
  return [...new Set(ids)];
}

export function propertyImagePreview(
  fileId: string,
  opts: { width?: number; height?: number } = {},
) {
  return filePreview(appwriteConfig.buckets.propertyImages, fileId, {
    width: opts.width ?? 800,
    height: opts.height ?? 600,
  });
}

export function propertyImageView(fileId: string) {
  return fileView(appwriteConfig.buckets.propertyImages, fileId);
}

export function propertyCover(
  property: Pick<Property, "coverImageId" | "imageIds">,
  opts: { width?: number; height?: number } = {},
): string {
  const fileId = propertyGallery(property)[0];
  if (!fileId) return PROPERTY_PLACEHOLDER;
  return propertyImagePreview(fileId, opts);
}
