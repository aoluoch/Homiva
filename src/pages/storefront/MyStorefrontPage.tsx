import { useState } from "react";
import {
  BarChart3,
  Check,
  Loader2,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MARKETPLACE_CATEGORIES,
  PRODUCT_CONDITIONS,
  STOREFRONT_CATEGORIES,
  SUBSCRIPTION_PLANS,
  KENYA_COUNTIES,
} from "@/lib/config";
import { cn, formatKES } from "@/lib/utils";
import {
  useCreateProduct,
  useCreateStorefront,
  useDeleteProduct,
  useMyProducts,
  useMyStorefront,
  useSellerOrders,
  useSubscribe,
  useUpdateOrderStatus,
  type ProductInput,
} from "@/hooks/useStore";
import type { Storefront } from "@/types/models";

export default function MyStorefrontPage() {
  const { data: store, isLoading } = useMyStorefront();

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      {!store ? <CreateStorefrontForm /> : <StorefrontManager store={store} />}
    </div>
  );
}

function CreateStorefrontForm() {
  const create = useCreateStorefront();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);

  const submit = () => {
    if (!name || !category) {
      toast.error("Store name and category are required.");
      return;
    }
    create.mutate(
      {
        values: { name, description, category, phone, email, county, town },
        logo,
        banner,
      },
      {
        onSuccess: () =>
          toast.success("Storefront created! It's pending admin approval."),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Open your storefront</h1>
        <p className="text-muted-foreground">
          Sell furniture, appliances, décor and materials to Homiva customers.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Store name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {STOREFRONT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>County</Label>
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {KENYA_COUNTIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="town">Town</Label>
            <Input
              id="town"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="logo">Logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              className="mt-1"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label htmlFor="banner">Banner</Label>
            <Input
              id="banner"
              type="file"
              accept="image/*"
              className="mt-1"
              onChange={(e) => setBanner(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={submit} disabled={create.isPending} className="w-full">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create storefront
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StorefrontManager({ store }: { store: Storefront }) {
  const { data: products } = useMyProducts(store.$id);
  const { data: orders } = useSellerOrders();
  const subscribe = useSubscribe();
  const updateOrder = useUpdateOrderStatus();

  const plan =
    SUBSCRIPTION_PLANS.find((p) => p.key === store.plan) ?? SUBSCRIPTION_PLANS[0];
  const productCount = products?.length ?? 0;
  const revenue =
    orders?.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.amount, 0) ?? 0;

  const onSubscribe = (planKey: string, amount: number) => {
    if (amount === 0) {
      toast.info("The Starter plan is free and already active.");
      return;
    }
    subscribe.mutate(
      { plan: planKey, amountKES: amount, storefrontId: store.$id },
      {
        onSuccess: () => toast.success("Subscription activated!"),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{store.name}</h1>
            <Badge
              variant={
                store.status === "approved"
                  ? "success"
                  : store.status === "rejected"
                    ? "destructive"
                    : "warning"
              }
            >
              {store.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {plan.label} plan · {productCount}/{plan.productLimit} products
          </p>
        </div>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="mb-6">
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-1 h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-1 h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="mr-1 h-4 w-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="plan">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Products" value={String(productCount)} />
            <StatCard label="Orders" value={String(orders?.length ?? 0)} />
            <StatCard label="Revenue" value={formatKES(revenue)} />
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="mb-4 flex justify-end">
            <AddProductDialog store={store} disabled={productCount >= plan.productLimit} />
          </div>
          {products && products.length > 0 ? (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductRow key={p.$id} id={p.$id} title={p.title} price={p.price} status={p.status} stock={p.stock} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No products yet. Add your first product.
            </p>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {orders && orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((o) => (
                <Card key={o.$id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">{o.productTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {o.buyerName} · Qty {o.quantity} · {formatKES(o.amount)}
                      </p>
                      {o.phone && (
                        <p className="text-xs text-muted-foreground">
                          {o.phone} {o.address ? `· ${o.address}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{o.status}</Badge>
                      {o.status === "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateOrder.mutate({ id: o.$id, status: "shipped" })
                          }
                        >
                          Mark shipped
                        </Button>
                      )}
                      {o.status === "shipped" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateOrder.mutate({ id: o.$id, status: "delivered" })
                          }
                        >
                          Mark delivered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          )}
        </TabsContent>

        <TabsContent value="plan">
          <div className="grid gap-4 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((p) => (
              <Card
                key={p.key}
                className={cn(
                  "relative",
                  store.plan === p.key && "border-primary ring-1 ring-primary",
                )}
              >
                {p.featured && (
                  <Badge className="absolute -top-2 right-4">Popular</Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold">{p.label}</h3>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {p.price === 0 ? "Free" : `${formatKES(p.price)}`}
                    {p.price > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    )}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={store.plan === p.key ? "outline" : "default"}
                    disabled={store.plan === p.key || subscribe.isPending}
                    onClick={() => onSubscribe(p.key, p.price)}
                  >
                    {store.plan === p.key ? "Current plan" : "Choose plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ProductRow({
  id,
  title,
  price,
  status,
  stock,
}: {
  id: string;
  title: string;
  price: number;
  status: string;
  stock: number;
}) {
  const del = useDeleteProduct();
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">
            {formatKES(price)} · {stock} in stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              status === "approved"
                ? "success"
                : status === "rejected"
                  ? "destructive"
                  : "warning"
            }
          >
            {status}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              del.mutate(id, {
                onSuccess: () => toast.success("Product deleted."),
              })
            }
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddProductDialog({
  store,
  disabled,
}: {
  store: Storefront;
  disabled: boolean;
}) {
  const create = useCreateProduct();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ProductInput>({
    title: "",
    description: "",
    category: MARKETPLACE_CATEGORIES[0].key,
    condition: "new",
    price: 0,
    stock: 1,
    county: "",
    town: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const submit = () => {
    if (!values.title || values.price <= 0) {
      toast.error("Title and a valid price are required.");
      return;
    }
    create.mutate(
      { storefront: store, values, files },
      {
        onSuccess: () => {
          toast.success("Product added! Pending approval.");
          setOpen(false);
          setValues({
            title: "",
            description: "",
            category: MARKETPLACE_CATEGORIES[0].key,
            condition: "new",
            price: 0,
            stock: 1,
            county: "",
            town: "",
          });
          setFiles([]);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Title</Label>
            <Input
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={values.category}
                onValueChange={(v) => set("category", v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETPLACE_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select
                value={values.condition}
                onValueChange={(v) =>
                  set("condition", v as ProductInput["condition"])
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price (KES)</Label>
              <Input
                type="number"
                value={values.price || ""}
                onChange={(e) => set("price", Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={values.stock || ""}
                onChange={(e) => set("stock", Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Photos</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              className="mt-1"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
