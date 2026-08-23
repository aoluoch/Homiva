import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PRODUCT_PLACEHOLDER } from "@/components/marketplace/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useCart, type CartItem } from "@/context/CartContext";
import {
  useCheckoutCart,
  useMarketplaceDeliveryFee,
} from "@/hooks/useMarketplace";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { formatKES } from "@/lib/utils";

function cartImage(item: CartItem) {
  if (!item.coverImageId) return PRODUCT_PLACEHOLDER;
  return filePreview(appwriteConfig.buckets.productImages, item.coverImageId, {
    width: 180,
    height: 140,
  });
}

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { data: deliveryFee = 0, isLoading: loadingFee } =
    useMarketplaceDeliveryFee();
  const checkout = useCheckoutCart();
  const [phone, setPhone] = useState("");
  const [secureAddress, setSecureAddress] = useState("");

  const total = subtotal + deliveryFee;

  const submit = () => {
    if (!user) {
      toast.error("Log in to checkout.");
      navigate("/login");
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter a contact phone number.");
      return;
    }
    if (!secureAddress.trim()) {
      toast.error("Enter a secure delivery address.");
      return;
    }
    checkout.mutate(
      { items, phone, secureAddress, deliveryFee },
      {
        onSuccess: () => {
          toast.success("Order paid. Your marketplace order is ready.");
          clearCart();
          navigate("/orders");
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="container max-w-6xl py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">Shopping cart</h1>
          <p className="text-muted-foreground">
            Buy furniture, appliances and home goods in one checkout.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={clearCart}>
            <Trash2 className="h-4 w-4" /> Clear cart
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add marketplace products, then checkout when you are ready."
          action={
            <Button asChild>
              <Link to="/marketplace">Browse marketplace</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-3">
            {items.map((item) => (
              <Card key={item.productId}>
                <CardContent className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <Link
                    to={`/marketplace/${item.productId}`}
                    className="aspect-[4/3] overflow-hidden rounded-md border bg-muted"
                  >
                    <img
                      src={cartImage(item)}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.src = PRODUCT_PLACEHOLDER)}
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/marketplace/${item.productId}`}
                      className="font-semibold hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.storeName || "Homiva"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatKES(item.price)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.stock} in stock
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatKES(item.price * item.quantity)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="h-fit min-w-0">
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-lg font-semibold">Checkout</h2>
                <p className="text-sm text-muted-foreground">
                  Delivery address is collected securely for this order.
                </p>
              </div>
              <div>
                <Label htmlFor="cart-phone">Contact phone</Label>
                <Input
                  id="cart-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                  placeholder="07xx xxx xxx"
                />
              </div>
              <div>
                <Label htmlFor="secure-address">Secure delivery address</Label>
                <div className="relative mt-1">
                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="secure-address"
                    value={secureAddress}
                    onChange={(e) => setSecureAddress(e.target.value)}
                    className="min-h-24 pl-9"
                    placeholder="Private delivery details: estate, building, apartment, gate instructions"
                  />
                </div>
              </div>
              <div className="space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatKES(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fee</span>
                  {loadingFee ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <span>{formatKES(deliveryFee)}</span>
                  )}
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatKES(total)}</span>
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={submit}
                disabled={checkout.isPending || loadingFee}
              >
                {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Pay with Paystack
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
