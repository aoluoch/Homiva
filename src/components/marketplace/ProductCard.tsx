import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { formatKES } from "@/lib/utils";
import type { Product } from "@/types/models";

export const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' font-family='sans-serif' font-size='18' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'>No image</text></svg>`,
  );

export function productImage(product: Product, w = 500, h = 400): string {
  if (!product.coverImageId) return PRODUCT_PLACEHOLDER;
  return filePreview(appwriteConfig.buckets.productImages, product.coverImageId, {
    width: w,
    height: h,
  });
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/marketplace/${product.$id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={productImage(product)}
          alt={product.title}
          loading="lazy"
          onError={(e) => (e.currentTarget.src = PRODUCT_PLACEHOLDER)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Badge variant="secondary" className="absolute left-3 top-3 capitalize shadow">
          {product.condition}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-lg font-bold text-primary">
          {formatKES(product.price)}
        </p>
        <h3 className="line-clamp-1 font-semibold">{product.title}</h3>
        {product.storeName && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {product.storeName}
          </p>
        )}
        <p className="mt-auto pt-2 text-xs text-muted-foreground">
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </p>
      </div>
    </Link>
  );
}
