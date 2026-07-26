/** Shared shape for every TablesDB row. */
export interface BaseRow {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
}

export type ListingType = "sale" | "rent" | "airbnb";
export type PropertyStatus = "draft" | "pending" | "approved" | "rejected";
export type LocationVerificationStatus = "pending" | "verified" | "rejected";
export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";
export type PaymentStatus = "pending" | "paid" | "failed";
export type PaymentPurpose =
  | "viewing_fee"
  | "service"
  | "booking"
  | "order"
  | "subscription";
export type PaymentMethod = "mock" | "paystack";

export interface Profile extends BaseRow {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatarFileId?: string;
  roles: string[]; // cached list of active role keys
  bio?: string;
}

export interface RoleApplication extends BaseRow {
  userId: string;
  userName: string;
  userEmail: string;
  role: string; // team id, e.g. "agents"
  roleLabel: string;
  status: ApplicationStatus;
  message?: string;
  phone?: string;
  county?: string;
  town?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  documentIds?: string[];
  documentLabels?: string[];
  reviewedBy?: string;
  reviewNote?: string;
}

export interface Property extends BaseRow {
  title: string;
  description: string;
  listingType: ListingType;
  price: number;
  county: string;
  town: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqft?: number;
  amenities: string[];
  coverImageId?: string;
  imageIds: string[];
  status: PropertyStatus;
  locationVerificationStatus?: LocationVerificationStatus;
  locationVerifiedAt?: string;
  locationVerifiedBy?: string;
  locationVerificationNote?: string;
  ownerId: string;
  ownerName: string;
  ownerRole: string;
  contactPhone?: string;
  contactEmail?: string;
  featured: boolean;
  rejectionReason?: string;
}

export interface PropertyImage extends BaseRow {
  propertyId: string;
  fileId: string;
  order: number;
}

export interface ViewingPayment extends BaseRow {
  userId: string;
  propertyId: string;
  amount: number;
  status: PaymentStatus;
  paymentId?: string;
  unlockedAt?: string;
}

export interface RecentlyViewed extends BaseRow {
  userId: string;
  propertyId: string;
  viewedAt: string;
}

export interface Favorite extends BaseRow {
  userId: string;
  propertyId: string;
}

export interface Inquiry extends BaseRow {
  userId: string;
  userName: string;
  propertyId: string;
  propertyTitle: string;
  message: string;
  phone?: string;
  status: "open" | "responded" | "closed";
}

export interface Payment extends BaseRow {
  userId: string;
  amount: number;
  currency: string;
  purpose: PaymentPurpose;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  relatedId?: string;
}

// --- Phase 2/3 tables (schema provisioned, UI added later) ---

export type ServiceStatus =
  | "requested"
  | "reviewed"
  | "quoted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "paid"
  | "cancelled";

export interface ServiceRequest extends BaseRow {
  userId: string;
  userName?: string;
  category: string;
  problem?: string;
  description: string;
  propertyType?: string;
  size?: string;
  urgency?: string;
  photoIds: string[];
  county?: string;
  town?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  contactPhone?: string;
  scheduledDate?: string;
  estimatedMin?: number;
  estimatedMax?: number;
  status: ServiceStatus | string;
  assignedTo?: string;
  adminNote?: string;
  quotedAmount?: number;
  emergency: boolean;
  paymentRef?: string;
}

export interface ServiceProvider extends BaseRow {
  userId: string;
  businessName: string;
  categories: string[];
  county?: string;
  verified: boolean;
  rating?: number;
}

export interface AuditLog extends BaseRow {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
}

export type InvoiceStatus = "unpaid" | "paid" | "cancelled";

export interface Invoice extends BaseRow {
  userId: string; // the customer the invoice is billed to
  serviceRequestId?: string;
  invoiceNumber?: string;
  title?: string;
  customerName?: string;
  providerId?: string;
  providerName?: string;
  baseFee: number;
  labour: number;
  materials: number;
  transport: number;
  emergencySurcharge: number;
  total: number;
  currency?: string;
  status: InvoiceStatus | string;
}

export interface Review extends BaseRow {
  userId: string;
  userName: string;
  targetType:
    | "property"
    | "provider"
    | "service"
    | "product"
    | "storefront"
    | "partner_company";
  targetId: string;
  rating: number;
  comment?: string;
}

// --- New module models ------------------------------------------------------

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface Booking extends BaseRow {
  propertyId: string;
  propertyTitle: string;
  guestId: string;
  guestName: string;
  hostId: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  nights: number;
  guests: number;
  amount: number;
  status: BookingStatus;
  paymentRef?: string;
}

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "none";

export interface Storefront extends BaseRow {
  ownerId: string;
  name: string;
  description: string;
  category: string;
  logoFileId?: string;
  bannerFileId?: string;
  phone?: string;
  email?: string;
  county?: string;
  town?: string;
  plan: string; // subscription plan key
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry?: string;
  verified: boolean;
  featured: boolean;
  status: "pending" | "approved" | "rejected";
  rating?: number;
}

export type PartnerCategory =
  | "movers"
  | "cleaning_company"
  | "interior_design_decor";

export interface PartnerCompany extends BaseRow {
  ownerId: string;
  role: string;
  name: string;
  description: string;
  category: PartnerCategory;
  logoFileId?: string;
  bannerFileId?: string;
  phone?: string;
  email?: string;
  county?: string;
  town?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  verified: boolean;
  featured: boolean;
  plan: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry?: string;
  rating?: number;
}

export interface PartnerPortfolioImage extends BaseRow {
  partnerCompanyId: string;
  ownerId: string;
  fileId: string;
  caption?: string;
  order: number;
}

export type ProductStatus = "pending" | "approved" | "rejected";

export interface Product extends BaseRow {
  storefrontId: string;
  sellerId: string;
  storeName?: string;
  title: string;
  description: string;
  category: string;
  condition: "new" | "refurbished" | "used";
  price: number;
  stock: number;
  county?: string;
  town?: string;
  coverImageId?: string;
  imageIds: string[];
  status: ProductStatus;
  featured: boolean;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order extends BaseRow {
  buyerId: string;
  buyerName: string;
  sellerId: string;
  productId: string;
  productTitle: string;
  quantity: number;
  amount: number;
  deliveryFee?: number;
  subtotal?: number;
  orderGroupId?: string;
  status: OrderStatus;
  phone?: string;
  address?: string;
  secureAddress?: string;
  paymentRef?: string;
}

export interface AppSetting extends BaseRow {
  key: string;
  value: string;
  label?: string;
}

export interface Subscription extends BaseRow {
  userId: string;
  storefrontId?: string;
  targetType?: "partner_company" | "storefront";
  targetId?: string;
  plan: string;
  amount: number;
  status: SubscriptionStatus;
  reference?: string;
  startedAt?: string;
  expiresAt?: string;
}

export interface Message extends BaseRow {
  threadId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  body: string;
  contextType?: string; // e.g. "property", "service", "product"
  contextId?: string;
  read: boolean;
}

export interface Notification extends BaseRow {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
}

// --- Module C: Property Buying ----------------------------------------------

export type MortgageEnquiryStatus = "new" | "contacted" | "closed";

export interface MortgageEnquiry extends BaseRow {
  userId: string;
  userName: string;
  userEmail?: string;
  phone?: string;
  propertyId: string;
  propertyTitle: string;
  propertyPrice: number;
  deposit: number;
  loanAmount: number;
  termYears: number;
  interestRate: number;
  monthlyRepayment: number;
  monthlyIncome?: number;
  message?: string;
  status: MortgageEnquiryStatus | string;
  note?: string;
}

export type ViewingRequestStatus =
  | "requested"
  | "confirmed"
  | "declined"
  | "completed";

export interface ViewingRequest extends BaseRow {
  userId: string;
  userName: string;
  phone?: string;
  propertyId: string;
  propertyTitle: string;
  ownerId: string;
  preferredDate: string; // ISO
  alternateDate?: string; // ISO
  message?: string;
  status: ViewingRequestStatus | string;
  note?: string;
}

// --- Module G: Disputes -----------------------------------------------------

export type DisputeStatus = "open" | "investigating" | "resolved" | "rejected";

export interface Dispute extends BaseRow {
  raisedBy: string;
  raisedByName: string;
  subjectType: string; // order | service | booking | property | other
  subjectId?: string;
  subjectTitle?: string;
  category: string;
  description: string;
  status: DisputeStatus | string;
  resolution?: string;
  handledBy?: string;
}
