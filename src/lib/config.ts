/**
 * Central Appwrite configuration for the Homiva client.
 * IDs are stable slugs created by `scripts/setup-appwrite.ts`.
 */

export const appwriteConfig = {
  endpoint:
    import.meta.env.VITE_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1",
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "6a56af86002ae69ae1fc",
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID ?? "homiva",
  buckets: {
    propertyImages:
      import.meta.env.VITE_APPWRITE_BUCKET_PROPERTY_IMAGES ?? "property-images",
    avatars: import.meta.env.VITE_APPWRITE_BUCKET_AVATARS ?? "avatars",
    productImages:
      import.meta.env.VITE_APPWRITE_BUCKET_PRODUCT_IMAGES ?? "product-images",
    storeAssets:
      import.meta.env.VITE_APPWRITE_BUCKET_STORE_ASSETS ?? "store-assets",
    servicePhotos:
      import.meta.env.VITE_APPWRITE_BUCKET_SERVICE_PHOTOS ?? "service-photos",
  },
  functions: {
    admin: import.meta.env.VITE_APPWRITE_FUNCTION_ADMIN ?? "homiva-admin",
    payments: import.meta.env.VITE_APPWRITE_FUNCTION_PAYMENTS ?? "homiva-payments",
  },
} as const;

/** Paystack client configuration (public key is safe to expose). */
export const paystackConfig = {
  publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "",
  /** Paystack processes in the smallest currency unit (KES cents). */
  currency: "KES",
} as const;

/** Table (collection) IDs. */
export const TABLES = {
  profiles: "profiles",
  roleApplications: "role_applications",
  properties: "properties",
  propertyImages: "property_images",
  viewingPayments: "viewing_payments",
  recentlyViewed: "recently_viewed",
  favorites: "favorites",
  inquiries: "inquiries",
  serviceRequests: "service_requests",
  serviceProviders: "service_providers",
  invoices: "invoices",
  payments: "payments",
  reviews: "reviews",
  // --- New modules ---
  bookings: "bookings",
  storefronts: "storefronts",
  products: "products",
  orders: "orders",
  subscriptions: "subscriptions",
  messages: "messages",
  notifications: "notifications",
} as const;

/** Role teams. Membership in a team activates that role for the account. */
export const TEAMS = {
  admins: "admins",
  agents: "agents",
  landlords: "landlords",
  airbnbOwners: "airbnb_owners",
  providers: "providers",
} as const;

export type RoleKey = keyof typeof TEAMS;

/** Roles a user can apply for (admins are assigned manually, not via application). */
export const APPLICABLE_ROLES = [
  {
    key: "agents" as const,
    team: TEAMS.agents,
    label: "Real Estate Agent",
    description:
      "Create and manage property listings across sale, rental and short-stay categories.",
  },
  {
    key: "landlords" as const,
    team: TEAMS.landlords,
    label: "Landlord",
    description: "Manage your rental properties and respond to tenant inquiries.",
  },
  {
    key: "airbnbOwners" as const,
    team: TEAMS.airbnbOwners,
    label: "Airbnb Owner",
    description: "List and manage short-stay properties and bookings.",
  },
  {
    key: "providers" as const,
    team: TEAMS.providers,
    label: "Service Provider",
    description:
      "Offer maintenance and cleaning services to Homiva customers after verification.",
  },
];

/** The viewing fee charged (in KES) to unlock full property details. */
export const VIEWING_FEE_KES = 200;

export const KENYA_COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Kiambu",
  "Machakos",
  "Kajiado",
  "Uasin Gishu",
  "Nyeri",
  "Kilifi",
  "Meru",
  "Kakamega",
];

// ---------------------------------------------------------------------------
// Home Services (Module D) + Maintenance workflow (PRD section 7)
// ---------------------------------------------------------------------------

export interface ServiceCategory {
  key: string;
  label: string;
  /** Lucide icon name for display. */
  icon: string;
  /** Base call-out fee in KES. */
  baseFee: number;
  /** Problem categories users can pick from. */
  problems: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    key: "cleaning",
    label: "Cleaning (Mama Fua)",
    icon: "Sparkles",
    baseFee: 800,
    problems: ["General cleaning", "Deep cleaning", "Laundry & ironing", "Post-construction", "Move-in / move-out"],
  },
  {
    key: "plumbing",
    label: "Plumbing",
    icon: "Wrench",
    baseFee: 1200,
    problems: ["Leaking pipe", "Blocked drain", "Toilet repair", "Water heater", "Tap / faucet install"],
  },
  {
    key: "electrical",
    label: "Electrical",
    icon: "Zap",
    baseFee: 1200,
    problems: ["Wiring fault", "Socket / switch", "Lighting install", "Backup / inverter", "Appliance connection"],
  },
  {
    key: "painting",
    label: "Painting",
    icon: "PaintRoller",
    baseFee: 1500,
    problems: ["Interior painting", "Exterior painting", "Touch-ups", "Waterproofing"],
  },
  {
    key: "pest_control",
    label: "Pest Control",
    icon: "Bug",
    baseFee: 1500,
    problems: ["Cockroaches", "Bedbugs", "Rodents", "Termites", "Fumigation"],
  },
  {
    key: "movers",
    label: "Movers",
    icon: "Truck",
    baseFee: 3000,
    problems: ["Local move", "Long-distance move", "Office relocation", "Single item"],
  },
  {
    key: "gardening",
    label: "Gardening & Landscaping",
    icon: "Trees",
    baseFee: 1000,
    problems: ["Lawn mowing", "Hedge trimming", "Landscaping", "Tree cutting"],
  },
  {
    key: "repairs",
    label: "General Repairs",
    icon: "Hammer",
    baseFee: 1000,
    problems: ["Carpentry", "Masonry", "Door / lock", "Furniture assembly", "Tiling"],
  },
  {
    key: "security",
    label: "Security",
    icon: "ShieldCheck",
    baseFee: 2000,
    problems: ["CCTV install", "Alarm system", "Electric fence", "Access control"],
  },
  {
    key: "interior_design",
    label: "Interior Design",
    icon: "Armchair",
    baseFee: 5000,
    problems: ["Consultation", "Space planning", "Full design", "Staging"],
  },
];

export const PROPERTY_TYPES = [
  "Apartment",
  "Bedsitter",
  "Studio",
  "Maisonette",
  "Bungalow",
  "Townhouse",
  "Office",
  "Commercial space",
] as const;

/** Size multiplier applied to the price estimate. */
export const SERVICE_SIZE_TIERS = [
  { key: "small", label: "Small (1 room / bedsitter)", multiplier: 1 },
  { key: "medium", label: "Medium (2-3 bedrooms)", multiplier: 1.6 },
  { key: "large", label: "Large (4+ bedrooms / big space)", multiplier: 2.4 },
] as const;

export const SERVICE_URGENCY = [
  { key: "standard", label: "Standard (within a few days)", surcharge: 0 },
  { key: "soon", label: "Soon (within 24 hours)", surcharge: 0.25 },
  { key: "emergency", label: "Emergency (ASAP)", surcharge: 0.6 },
] as const;

export type ServiceSizeKey = (typeof SERVICE_SIZE_TIERS)[number]["key"];
export type ServiceUrgencyKey = (typeof SERVICE_URGENCY)[number]["key"];

// ---------------------------------------------------------------------------
// Home Marketplace (Module E)
// ---------------------------------------------------------------------------

export const MARKETPLACE_CATEGORIES = [
  { key: "furniture", label: "Furniture" },
  { key: "appliances", label: "Appliances" },
  { key: "decor", label: "Décor" },
  { key: "building_materials", label: "Building Materials" },
  { key: "lighting", label: "Lighting" },
  { key: "kitchen", label: "Kitchen & Dining" },
  { key: "outdoor", label: "Outdoor & Garden" },
] as const;

export const PRODUCT_CONDITIONS = ["new", "refurbished", "used"] as const;

// ---------------------------------------------------------------------------
// Business Storefronts + Subscriptions (Module F)
// ---------------------------------------------------------------------------

export interface SubscriptionPlan {
  key: string;
  label: string;
  /** Monthly price in KES (0 = free). */
  price: number;
  productLimit: number;
  features: string[];
  featured: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    key: "free",
    label: "Starter",
    price: 0,
    productLimit: 5,
    features: ["Basic storefront", "Up to 5 products", "Customer reviews"],
    featured: false,
  },
  {
    key: "pro",
    label: "Pro",
    price: 2500,
    productLimit: 50,
    features: [
      "Branded storefront",
      "Up to 50 products",
      "Analytics dashboard",
      "Priority support",
    ],
    featured: true,
  },
  {
    key: "premium",
    label: "Premium",
    price: 6000,
    productLimit: 500,
    features: [
      "Everything in Pro",
      "Up to 500 products",
      "Promoted / featured placement",
      "Verified badge",
    ],
    featured: false,
  },
];

export const STOREFRONT_CATEGORIES = [
  "Furniture Vendor",
  "Appliance Store",
  "Home Décor",
  "Building Supplies",
  "Interior Design Studio",
  "Movers & Logistics",
  "Cleaning Company",
  "General Contractor",
] as const;
