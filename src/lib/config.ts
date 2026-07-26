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
    verificationDocuments:
      import.meta.env.VITE_APPWRITE_BUCKET_VERIFICATION_DOCUMENTS ??
      "verification-documents",
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
  partnerCompanies: "partner_companies",
  partnerPortfolioImages: "partner_portfolio_images",
  invoices: "invoices",
  payments: "payments",
  reviews: "reviews",
  auditLogs: "audit_logs",
  // --- New modules ---
  bookings: "bookings",
  storefronts: "storefronts",
  products: "products",
  orders: "orders",
  subscriptions: "subscriptions",
  messages: "messages",
  notifications: "notifications",
  appSettings: "app_settings",
  // --- Module C (buying) + Module G (disputes) ---
  disputes: "disputes",
  mortgageEnquiries: "mortgage_enquiries",
  viewingRequests: "viewing_requests",
} as const;

/** Role teams. Membership in a team activates that role for the account. */
export const TEAMS = {
  admins: "admins",
  agents: "agents",
  landlords: "landlords",
  airbnbOwners: "airbnb_owners",
  movers: "movers",
  cleaningCompanies: "cleaning_companies",
  interiorDesigners: "interior_designers",
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
    key: "movers" as const,
    team: TEAMS.movers,
    label: "Moving Company",
    description:
      "Apply to publish a verified moving company profile and work portfolio.",
  },
  {
    key: "cleaningCompanies" as const,
    team: TEAMS.cleaningCompanies,
    label: "Cleaning Company",
    description:
      "Apply to publish a cleaning company profile and customer work portfolio.",
  },
  {
    key: "interiorDesigners" as const,
    team: TEAMS.interiorDesigners,
    label: "Interior Design & Decor",
    description:
      "Apply to publish an interior design or decor company profile and portfolio.",
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
    key: "mama_fua",
    label: "Cleaning (Mama Fua)",
    icon: "Sparkles",
    baseFee: 800,
    problems: ["Laundry & ironing", "House cleaning", "Deep cleaning", "Move-in / move-out"],
  },
  {
    key: "plumbing",
    label: "Plumbing",
    icon: "Wrench",
    baseFee: 1200,
    problems: ["Leaking pipe", "Blocked drain", "Toilet repair", "Water heater", "Tap / faucet install"],
  },
  {
    key: "maintenance",
    label: "Repairs & Maintenance",
    icon: "Hammer",
    baseFee: 1000,
    problems: ["Electrical repair", "Carpentry", "Painting", "Door / lock", "Tiling", "General repair"],
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

export const ROLE_DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
  [TEAMS.agents]: [
    "National ID or passport",
    "Real estate agency license or company authorization",
    "KRA PIN certificate",
  ],
  [TEAMS.landlords]: [
    "National ID or passport",
    "Proof of property ownership or property management authorization",
  ],
  [TEAMS.airbnbOwners]: [
    "National ID or passport",
    "Proof of ownership, lease agreement, or written owner authorization",
  ],
  [TEAMS.movers]: [
    "National ID or passport",
    "Business registration certificate or business permit",
    "KRA PIN certificate",
    "Vehicle logbook, lease agreement, or fleet ownership proof",
  ],
  [TEAMS.cleaningCompanies]: [
    "National ID or passport",
    "Business registration certificate or business permit",
    "KRA PIN certificate",
  ],
  [TEAMS.interiorDesigners]: [
    "National ID or passport",
    "Business registration certificate or business permit",
    "KRA PIN certificate",
    "Portfolio or company profile document",
  ],
};

export const PARTNER_CATEGORIES = [
  { key: "movers", label: "Movers" },
  { key: "cleaning_company", label: "Cleaning Company" },
  { key: "interior_design_decor", label: "Interior Design & Decor" },
] as const;

export const PARTNER_ROLE_CATEGORY: Record<string, (typeof PARTNER_CATEGORIES)[number]["key"]> = {
  [TEAMS.movers]: "movers",
  [TEAMS.cleaningCompanies]: "cleaning_company",
  [TEAMS.interiorDesigners]: "interior_design_decor",
};

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

export const MARKETPLACE_DELIVERY_FEE_SETTING = "marketplace_delivery_fee_kes";
export const MARKETPLACE_DELIVERY_FEE_ROW_ID = "marketplace_delivery_fee";
export const DEFAULT_MARKETPLACE_DELIVERY_FEE_KES = 300;

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
    key: "basic",
    label: "Basic",
    price: 2500,
    productLimit: 0,
    features: ["Published company profile", "Contact details", "Customer reviews"],
    featured: false,
  },
  {
    key: "pro",
    label: "Pro",
    price: 5000,
    productLimit: 0,
    features: [
      "Published company profile",
      "Portfolio gallery",
      "Priority directory placement",
      "Priority support",
    ],
    featured: true,
  },
  {
    key: "premium",
    label: "Premium",
    price: 9000,
    productLimit: 0,
    features: [
      "Everything in Pro",
      "Promoted / featured placement",
      "Verified badge",
    ],
    featured: false,
  },
];

/** Legacy storefront categories retained for old unmounted storefront screens. */
export const STOREFRONT_CATEGORIES = [
  "Furniture Vendor",
  "Appliance Store",
  "Home Decor",
  "Building Supplies",
] as const;

// ---------------------------------------------------------------------------
// Property Buying (Module C): mortgage enquiry + scheduled viewing requests
// ---------------------------------------------------------------------------

/** Indicative annual mortgage interest rate (%) used by the calculator. */
export const MORTGAGE_DEFAULT_RATE = 13.5;

/** Selectable repayment terms (years). */
export const MORTGAGE_TERMS = [5, 10, 15, 20, 25] as const;

/** Default deposit as a fraction of the property price. */
export const MORTGAGE_DEFAULT_DEPOSIT_PCT = 0.1;

/**
 * Standard amortised monthly repayment.
 * principal = loan amount, annualRate in %, years = term.
 */
export function monthlyRepayment(
  principal: number,
  annualRatePct: number,
  years: number,
): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export const VIEWING_REQUEST_STATUSES = [
  "requested",
  "confirmed",
  "declined",
  "completed",
] as const;

export const MORTGAGE_ENQUIRY_STATUSES = ["new", "contacted", "closed"] as const;

// ---------------------------------------------------------------------------
// Disputes (Module G)
// ---------------------------------------------------------------------------

export const DISPUTE_SUBJECT_TYPES = [
  { key: "order", label: "Marketplace order" },
  { key: "service", label: "Home service" },
  { key: "booking", label: "Airbnb booking" },
  { key: "property", label: "Property listing" },
  { key: "other", label: "Other" },
] as const;

export const DISPUTE_CATEGORIES = [
  "Item not received",
  "Not as described",
  "Damaged / faulty",
  "Poor service quality",
  "Refund not processed",
  "Fraud / scam",
  "Other",
] as const;

export const DISPUTE_STATUSES = [
  "open",
  "investigating",
  "resolved",
  "rejected",
] as const;
