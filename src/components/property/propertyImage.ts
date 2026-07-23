import { filePreview } from "@/lib/appwrite";
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

export function propertyCover(
  property: Pick<Property, "coverImageId" | "imageIds">,
  opts: { width?: number; height?: number } = {},
): string {
  const fileId = property.coverImageId ?? property.imageIds?.[0];
  if (!fileId) return PROPERTY_PLACEHOLDER;
  return filePreview(appwriteConfig.buckets.propertyImages, fileId, {
    width: opts.width ?? 800,
    height: opts.height ?? 600,
  });
}
