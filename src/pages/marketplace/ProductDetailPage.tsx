import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Minus, Plus, ShoppingCart, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { formatKES } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useProduct } from "@/hooks/useMarketplace";
import { PRODUCT_PLACEHOLDER } from "@/components/marketplace/ProductCard";
import { ReviewSection } from "@/components/reviews/ReviewSection";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const { addProduct } = useCart();

  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="container grid gap-8 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/marketplace">Back to marketplace</Link>
        </Button>
      </div>
    );
  }

  const images = product.imageIds?.length
    ? product.imageIds
    : product.coverImageId
      ? [product.coverImageId]
      : [];

  const imgUrl = (fid: string) =>
    filePreview(appwriteConfig.buckets.productImages, fid, {
      width: 800,
      height: 800,
    });

  const addToCart = (goToCart = false) => {
    addProduct(product, qty);
    toast.success("Added to cart.");
    if (goToCart) navigate("/cart");
  };

  return (
    <div className="container py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
            <img
              src={images[active] ? imgUrl(images[active]) : PRODUCT_PLACEHOLDER}
              alt={product.title}
              onError={(e) => (e.currentTarget.src = PRODUCT_PLACEHOLDER)}
              className="h-full w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((fid, i) => (
                <button
                  key={fid}
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === active ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img
                    src={imgUrl(fid)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Badge variant="secondary" className="mb-2 capitalize">
            {product.condition}
          </Badge>
          <h1 className="text-2xl font-bold md:text-3xl">{product.title}</h1>
          <p className="mt-2 text-3xl font-bold text-primary">
            {formatKES(product.price)}
          </p>

          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Store className="h-4 w-4" /> {product.storeName ?? "Homiva"}
          </p>

          {(product.town || product.county) && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {product.town}
              {product.town && product.county ? ", " : ""}
              {product.county}
            </p>
          )}

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">
            {product.description}
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            {product.stock > 0
              ? `${product.stock} available`
              : "Currently out of stock"}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-md border bg-card p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                disabled={qty >= product.stock}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="lg"
              disabled={product.stock <= 0}
              onClick={() => addToCart(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              Buy now
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={product.stock <= 0}
              onClick={() => addToCart(false)}
            >
              Add to cart
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-2xl">
        <ReviewSection targetType="product" targetId={product.$id} />
      </div>
    </div>
  );
}
