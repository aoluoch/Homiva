/**
 * Idempotent Appwrite provisioning for Homiva.
 *
 * Creates: the `homiva` database, all core tables (PRD section 11) with columns
 * and indexes, storage buckets, web platforms (CORS hostnames), and the role
 * teams. Optionally bootstraps admins (ADMIN_EMAIL / ADMIN_EMAILS) into the
 * `admins` team.
 *
 * Usage:  npm run setup:appwrite
 * Requires .env with APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY.
 */
import "dotenv/config";
import {
  Client,
  TablesDBIndexType as IndexType,
  Permission,
  Project,
  Role,
  Storage,
  TablesDB,
  Teams,
  Users,
  Query,
} from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT!;
const projectId = process.env.APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

/** Comma/semicolon/newline-separated emails from ADMIN_EMAIL and/or ADMIN_EMAILS. */
function parseAdminEmails(): string[] {
  const raw = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .join(",");
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

const adminEmails = parseAdminEmails();

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID or APPWRITE_API_KEY in .env",
  );
  process.exit(1);
}

const DB = "homiva";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const tablesDB = new TablesDB(client);
const storage = new Storage(client);
const teams = new Teams(client);
const users = new Users(client);
const project = new Project(client);

/** Hostnames the Vite/browser client may call Appwrite from (CORS / platforms). */
const WEB_PLATFORMS: Array<{ id: string; name: string; hostname: string }> = [
  { id: "localhost", name: "Local Vite Dev", hostname: "localhost" },
  { id: "127-0-0-1", name: "Local Vite 127", hostname: "127.0.0.1" },
  {
    id: "homiva-appwrite-network",
    name: "Homiva Appwrite Network",
    hostname: "homiva.appwrite.network",
  },
  {
    id: "www-homiva-appwrite-network",
    name: "Homiva WWW",
    hostname: "www.homiva.appwrite.network",
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run a create call, ignoring "already exists" (409) errors. */
async function safe(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`  + ${label}`);
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 409) {
      console.log(`  = ${label} (exists)`);
    } else {
      console.warn(`  ! ${label}: ${e.message ?? err}`);
    }
  }
}

// --- Column helpers ---------------------------------------------------------
const str = (
  tableId: string,
  key: string,
  size: number,
  required = false,
  array = false,
) =>
  safe(`${tableId}.${key}`, () =>
    tablesDB.createStringColumn({ databaseId: DB, tableId, key, size, required, array }),
  );

const int = (
  tableId: string,
  key: string,
  required = false,
  def?: number,
) =>
  safe(`${tableId}.${key}`, () =>
    tablesDB.createIntegerColumn({
      databaseId: DB,
      tableId,
      key,
      required,
      xdefault: required ? undefined : def,
    }),
  );

const bool = (tableId: string, key: string, def = false) =>
  safe(`${tableId}.${key}`, () =>
    tablesDB.createBooleanColumn({ databaseId: DB, tableId, key, required: false, xdefault: def }),
  );

const dt = (tableId: string, key: string) =>
  safe(`${tableId}.${key}`, () =>
    tablesDB.createDatetimeColumn({ databaseId: DB, tableId, key, required: false }),
  );

const enumCol = (
  tableId: string,
  key: string,
  elements: string[],
  def?: string,
) =>
  safe(`${tableId}.${key}`, () =>
    tablesDB.createEnumColumn({
      databaseId: DB,
      tableId,
      key,
      elements,
      required: false,
      xdefault: def,
    }),
  );

const strArr = (tableId: string, key: string) => str(tableId, key, 255, false, true);

/** Widen an existing enum column's allowed elements (ignores errors). */
const updateEnumCol = (
  tableId: string,
  key: string,
  elements: string[],
  def?: string,
) =>
  safe(`update enum ${tableId}.${key}`, () =>
    tablesDB.updateEnumColumn({
      databaseId: DB,
      tableId,
      key,
      elements,
      required: false,
      xdefault: def,
    }),
  );

// --- Index helper (retries until columns are available) ---------------------
async function index(
  tableId: string,
  key: string,
  type: IndexType,
  columns: string[],
) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await tablesDB.createIndex({ databaseId: DB, tableId, key, type, columns });
      console.log(`  + index ${tableId}.${key}`);
      return;
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 409) {
        console.log(`  = index ${tableId}.${key} (exists)`);
        return;
      }
      if (attempt === 6) {
        console.warn(`  ! index ${tableId}.${key}: ${e.message ?? err}`);
        return;
      }
      await sleep(2500);
    }
  }
}

// --- Permission presets -----------------------------------------------------
const P = {
  createUsers: Permission.create(Role.users()),
  readAdmins: Permission.read(Role.team("admins")),
  updateAdmins: Permission.update(Role.team("admins")),
  deleteAdmins: Permission.delete(Role.team("admins")),
  readAny: Permission.read(Role.any()),
};

async function createTable(
  tableId: string,
  name: string,
  permissions: string[],
) {
  await safe(`table ${tableId}`, () =>
    tablesDB.createTable({
      databaseId: DB,
      tableId,
      name,
      permissions,
      rowSecurity: true,
    }),
  );
  // Keep permissions in sync when the table already exists.
  await safe(`table perms ${tableId}`, () =>
    tablesDB.updateTable({
      databaseId: DB,
      tableId,
      name,
      permissions,
      rowSecurity: true,
    }),
  );
}

async function ensureWebPlatforms() {
  console.log("Web platforms (CORS):");
  let existing = new Set<string>();
  try {
    const listed = await project.listPlatforms();
    existing = new Set(
      (listed.platforms ?? [])
        .map((p) => {
          const hostname =
            "hostname" in p && typeof p.hostname === "string" ? p.hostname : "";
          return hostname.toLowerCase();
        })
        .filter(Boolean),
    );
  } catch (err) {
    console.warn(
      `  ! list platforms: ${(err as Error).message ?? err} (will try creates)`,
    );
  }

  for (const platform of WEB_PLATFORMS) {
    if (existing.has(platform.hostname.toLowerCase())) {
      console.log(`  = platform ${platform.hostname} (exists)`);
      continue;
    }
    await safe(`platform ${platform.hostname}`, () =>
      project.createWebPlatform({
        platformId: platform.id,
        name: platform.name,
        hostname: platform.hostname,
      }),
    );
  }
}

async function main() {
  console.log("Homiva Appwrite provisioning\n");

  // 0) Browser origins — missing platforms surface as "Failed to fetch" in the client.
  await ensureWebPlatforms();

  // 1) Database
  console.log("\nDatabase:");
  await safe(`database ${DB}`, () =>
    tablesDB.create({ databaseId: DB, name: "Homiva" }),
  );

  // 2) Teams (roles)
  console.log("\nTeams (roles):");
  for (const [id, name] of [
    ["admins", "Administrators"],
    ["agents", "Real Estate Agents"],
    ["landlords", "Landlords"],
    ["airbnb_owners", "Airbnb Owners"],
    ["movers", "Moving Companies"],
    ["cleaning_companies", "Cleaning Companies"],
    ["interior_designers", "Interior Designers & Decor"],
  ]) {
    await safe(`team ${id}`, () => teams.create({ teamId: id, name }));
  }

  // 3) Storage buckets
  console.log("\nStorage buckets:");
  await safe("bucket property-images", () =>
    storage.createBucket({
      bucketId: "property-images",
      name: "Property Images",
      permissions: [P.createUsers, P.readAny],
      fileSecurity: true,
      enabled: true,
    }),
  );
  await safe("bucket avatars", () =>
    storage.createBucket({
      bucketId: "avatars",
      name: "Avatars",
      permissions: [P.createUsers, P.readAny],
      fileSecurity: true,
      enabled: true,
    }),
  );
  await safe("bucket product-images", () =>
    storage.createBucket({
      bucketId: "product-images",
      name: "Product Images",
      permissions: [P.createUsers, P.readAny],
      fileSecurity: true,
      enabled: true,
    }),
  );
  await safe("bucket store-assets", () =>
    storage.createBucket({
      bucketId: "store-assets",
      name: "Store Assets",
      permissions: [P.createUsers, P.readAny],
      fileSecurity: true,
      enabled: true,
    }),
  );
  await safe("bucket service-photos", () =>
    storage.createBucket({
      bucketId: "service-photos",
      name: "Service Photos",
      permissions: [P.createUsers, P.readAny],
      fileSecurity: true,
      enabled: true,
    }),
  );
  await safe("bucket verification-documents", () =>
    storage.createBucket({
      bucketId: "verification-documents",
      name: "Verification Documents",
      permissions: [P.createUsers, P.readAdmins],
      fileSecurity: true,
      enabled: true,
    }),
  );

  // 4) Tables
  console.log("\nTables:");
  await createTable("profiles", "Profiles", [P.createUsers, P.readAdmins]);
  await createTable("role_applications", "Role Applications", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("properties", "Properties", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
    P.deleteAdmins,
  ]);
  await createTable("property_images", "Property Images", [
    P.createUsers,
    P.readAny,
  ]);
  await createTable("viewing_payments", "Viewing Payments", [
    P.createUsers,
    P.readAdmins,
  ]);
  await createTable("recently_viewed", "Recently Viewed", [P.createUsers]);
  await createTable("favorites", "Favorites", [P.createUsers]);
  await createTable("inquiries", "Inquiries", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("payments", "Payments", [P.createUsers, P.readAdmins]);
  await createTable("service_requests", "Service Requests", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("service_providers", "Service Providers", [
    P.createUsers,
    P.readAny,
    P.updateAdmins,
  ]);
  await createTable("partner_companies", "Partner Companies", [
    P.createUsers,
    P.readAny,
    P.updateAdmins,
    P.deleteAdmins,
  ]);
  await createTable("partner_portfolio_images", "Partner Portfolio Images", [
    P.createUsers,
    P.readAny,
    P.updateAdmins,
    P.deleteAdmins,
  ]);
  await createTable("invoices", "Invoices", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("reviews", "Reviews", [P.createUsers, P.readAny, P.updateAdmins]);
  await createTable("audit_logs", "Audit Logs", [
    P.createUsers,
    P.readAdmins,
  ]);

  // New module tables
  await createTable("bookings", "Bookings", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("storefronts", "Storefronts", [
    P.createUsers,
    P.readAny,
    P.updateAdmins,
    P.deleteAdmins,
  ]);
  await createTable("products", "Products", [
    Permission.create(Role.team("admins")),
    P.readAdmins,
    P.updateAdmins,
    P.deleteAdmins,
  ]);
  await createTable("orders", "Orders", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("subscriptions", "Subscriptions", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("messages", "Messages", [P.createUsers]);
  await createTable("notifications", "Notifications", [P.createUsers]);
  await createTable("app_settings", "App Settings", [
    Permission.create(Role.team("admins")),
    P.readAny,
    P.updateAdmins,
    P.deleteAdmins,
  ]);

  // Module C (buying) + Module G (disputes)
  await createTable("disputes", "Disputes", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
    P.deleteAdmins,
  ]);
  await createTable("mortgage_enquiries", "Mortgage Enquiries", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);
  await createTable("viewing_requests", "Viewing Requests", [
    P.createUsers,
    P.readAdmins,
    P.updateAdmins,
  ]);

  // 5) Columns
  console.log("\nColumns:");
  // profiles
  await str("profiles", "userId", 64, true);
  await str("profiles", "name", 255, true);
  await str("profiles", "email", 255, true);
  await str("profiles", "phone", 32);
  await str("profiles", "avatarFileId", 64);
  await str("profiles", "bio", 1000);
  await strArr("profiles", "roles");

  // role_applications
  await str("role_applications", "userId", 64, true);
  await str("role_applications", "userName", 255);
  await str("role_applications", "userEmail", 255);
  await str("role_applications", "role", 64, true);
  await str("role_applications", "roleLabel", 128);
  await enumCol(
    "role_applications",
    "status",
    ["pending", "approved", "rejected", "suspended"],
    "pending",
  );
  await str("role_applications", "message", 2000);
  await str("role_applications", "phone", 32);
  await str("role_applications", "county", 64);
  await str("role_applications", "town", 128);
  await str("role_applications", "address", 512);
  await str("role_applications", "latitude", 32);
  await str("role_applications", "longitude", 32);
  await strArr("role_applications", "documentIds");
  await strArr("role_applications", "documentLabels");
  await str("role_applications", "reviewedBy", 64);
  await str("role_applications", "reviewNote", 2000);

  // properties
  await str("properties", "title", 255, true);
  await str("properties", "description", 5000, true);
  await enumCol("properties", "listingType", ["sale", "rent", "airbnb"], "sale");
  await int("properties", "price", false, 0);
  await str("properties", "county", 64);
  await str("properties", "town", 128);
  await str("properties", "address", 512);
  await str("properties", "latitude", 32);
  await str("properties", "longitude", 32);
  await int("properties", "bedrooms", false, 0);
  await int("properties", "bathrooms", false, 0);
  await int("properties", "sizeSqft", false, 0);
  await strArr("properties", "amenities");
  await str("properties", "coverImageId", 64);
  await strArr("properties", "imageIds");
  await enumCol(
    "properties",
    "status",
    ["draft", "pending", "approved", "rejected"],
    "pending",
  );
  await enumCol(
    "properties",
    "locationVerificationStatus",
    ["pending", "verified", "rejected"],
    "pending",
  );
  await dt("properties", "locationVerifiedAt");
  await str("properties", "locationVerifiedBy", 64);
  await str("properties", "locationVerificationNote", 1000);
  await str("properties", "ownerId", 64, true);
  await str("properties", "ownerName", 255);
  await str("properties", "ownerRole", 64);
  await str("properties", "contactPhone", 32);
  await str("properties", "contactEmail", 255);
  await str("properties", "checkInTime", 16);
  await str("properties", "checkOutTime", 16);
  await bool("properties", "featured", false);
  await str("properties", "rejectionReason", 1000);

  // property_images
  await str("property_images", "propertyId", 64, true);
  await str("property_images", "fileId", 64, true);
  await int("property_images", "order", false, 0);

  // viewing_payments
  await str("viewing_payments", "userId", 64, true);
  await str("viewing_payments", "propertyId", 64, true);
  await int("viewing_payments", "amount", false, 200);
  await enumCol("viewing_payments", "status", ["pending", "paid", "failed"], "pending");
  await str("viewing_payments", "paymentId", 64);
  await dt("viewing_payments", "unlockedAt");

  // recently_viewed
  await str("recently_viewed", "userId", 64, true);
  await str("recently_viewed", "propertyId", 64, true);
  await dt("recently_viewed", "viewedAt");

  // favorites
  await str("favorites", "userId", 64, true);
  await str("favorites", "propertyId", 64, true);

  // inquiries
  await str("inquiries", "userId", 64, true);
  await str("inquiries", "userName", 255);
  await str("inquiries", "propertyId", 64, true);
  await str("inquiries", "propertyTitle", 255);
  await str("inquiries", "message", 3000, true);
  await str("inquiries", "phone", 32);
  await enumCol("inquiries", "status", ["open", "responded", "closed"], "open");

  // payments
  await str("payments", "userId", 64, true);
  await int("payments", "amount", false, 0);
  await str("payments", "currency", 8);
  await enumCol("payments", "purpose", ["viewing_fee", "service", "booking", "order", "subscription"], "viewing_fee");
  await enumCol("payments", "method", ["mock", "paystack"], "paystack");
  await enumCol("payments", "status", ["pending", "paid", "failed"], "paid");
  await str("payments", "reference", 128);
  await str("payments", "relatedId", 64);
  // Widen enums in case the columns already existed with fewer values.
  await updateEnumCol("payments", "purpose", ["viewing_fee", "service", "booking", "order", "subscription"], "viewing_fee");
  await updateEnumCol("payments", "method", ["mock", "paystack"], "paystack");

  // service_requests
  await str("service_requests", "userId", 64, true);
  await str("service_requests", "userName", 255);
  await str("service_requests", "category", 64);
  await str("service_requests", "problem", 128);
  await str("service_requests", "description", 3000);
  await str("service_requests", "propertyType", 64);
  await str("service_requests", "size", 32);
  await str("service_requests", "urgency", 32);
  await strArr("service_requests", "photoIds");
  await str("service_requests", "county", 64);
  await str("service_requests", "town", 128);
  await str("service_requests", "address", 512);
  await str("service_requests", "latitude", 32);
  await str("service_requests", "longitude", 32);
  await str("service_requests", "contactPhone", 32);
  await dt("service_requests", "scheduledDate");
  await int("service_requests", "estimatedMin", false, 0);
  await int("service_requests", "estimatedMax", false, 0);
  await str("service_requests", "status", 32);
  await str("service_requests", "providerId", 64);
  await str("service_requests", "providerName", 255);
  await str("service_requests", "assignedTo", 255);
  await str("service_requests", "adminNote", 2000);
  await int("service_requests", "quotedAmount", false, 0);
  await bool("service_requests", "emergency", false);
  await str("service_requests", "paymentRef", 128);

  // service_providers
  await str("service_providers", "userId", 64, true);
  await str("service_providers", "businessName", 255);
  await strArr("service_providers", "categories");
  await str("service_providers", "county", 64);
  await bool("service_providers", "verified", false);
  await int("service_providers", "rating", false, 0);

  // partner_companies
  await str("partner_companies", "ownerId", 64, true);
  await str("partner_companies", "role", 64, true);
  await str("partner_companies", "name", 255, true);
  await str("partner_companies", "description", 3000);
  await enumCol(
    "partner_companies",
    "category",
    ["movers", "cleaning_company", "interior_design_decor"],
    "movers",
  );
  await str("partner_companies", "logoFileId", 64);
  await str("partner_companies", "bannerFileId", 64);
  await str("partner_companies", "phone", 32);
  await str("partner_companies", "email", 255);
  await str("partner_companies", "county", 64);
  await str("partner_companies", "town", 128);
  await enumCol(
    "partner_companies",
    "status",
    ["pending", "approved", "rejected", "suspended"],
    "pending",
  );
  await bool("partner_companies", "verified", false);
  await bool("partner_companies", "featured", false);
  await str("partner_companies", "plan", 32);
  await enumCol(
    "partner_companies",
    "subscriptionStatus",
    ["none", "active", "expired", "cancelled"],
    "none",
  );
  await dt("partner_companies", "subscriptionExpiry");
  await int("partner_companies", "rating", false, 0);

  // partner_portfolio_images
  await str("partner_portfolio_images", "partnerCompanyId", 64, true);
  await str("partner_portfolio_images", "ownerId", 64, true);
  await str("partner_portfolio_images", "fileId", 64, true);
  await str("partner_portfolio_images", "caption", 255);
  await int("partner_portfolio_images", "order", false, 0);

  // invoices
  await str("invoices", "userId", 64, true);
  await str("invoices", "serviceRequestId", 64);
  await str("invoices", "invoiceNumber", 32);
  await str("invoices", "title", 255);
  await str("invoices", "customerName", 255);
  await str("invoices", "providerId", 64);
  await str("invoices", "providerName", 255);
  await int("invoices", "baseFee", false, 0);
  await int("invoices", "labour", false, 0);
  await int("invoices", "materials", false, 0);
  await int("invoices", "transport", false, 0);
  await int("invoices", "emergencySurcharge", false, 0);
  await int("invoices", "total", false, 0);
  await str("invoices", "currency", 8);
  await str("invoices", "status", 32);

  // reviews
  await str("reviews", "userId", 64, true);
  await str("reviews", "userName", 255);
  await enumCol("reviews", "targetType", ["property", "provider", "service", "product", "storefront", "partner_company"], "property");
  await updateEnumCol("reviews", "targetType", ["property", "provider", "service", "product", "storefront", "partner_company"], "property");
  await str("reviews", "targetId", 64, true);
  await int("reviews", "rating", false, 5);
  await str("reviews", "comment", 2000);

  // audit_logs
  await str("audit_logs", "actorId", 64, true);
  await str("audit_logs", "action", 64, true);
  await str("audit_logs", "targetType", 64, true);
  await str("audit_logs", "targetId", 64);
  await str("audit_logs", "summary", 1000, true);

  // bookings
  await str("bookings", "propertyId", 64, true);
  await str("bookings", "propertyTitle", 255);
  await str("bookings", "guestId", 64, true);
  await str("bookings", "guestName", 255);
  await str("bookings", "guestEmail", 255);
  await str("bookings", "hostId", 64, true);
  await dt("bookings", "checkIn");
  await dt("bookings", "checkOut");
  await str("bookings", "checkInTime", 16);
  await str("bookings", "checkOutTime", 16);
  await int("bookings", "nights", false, 1);
  await int("bookings", "guests", false, 1);
  await int("bookings", "amount", false, 0);
  await enumCol("bookings", "status", ["pending", "confirmed", "cancelled", "completed"], "pending");
  await str("bookings", "paymentRef", 128);

  // storefronts
  await str("storefronts", "ownerId", 64, true);
  await str("storefronts", "name", 255, true);
  await str("storefronts", "description", 3000);
  await str("storefronts", "category", 128);
  await str("storefronts", "logoFileId", 64);
  await str("storefronts", "bannerFileId", 64);
  await str("storefronts", "phone", 32);
  await str("storefronts", "email", 255);
  await str("storefronts", "county", 64);
  await str("storefronts", "town", 128);
  await str("storefronts", "plan", 32);
  await enumCol("storefronts", "subscriptionStatus", ["none", "active", "expired", "cancelled"], "none");
  await dt("storefronts", "subscriptionExpiry");
  await bool("storefronts", "verified", false);
  await bool("storefronts", "featured", false);
  await enumCol("storefronts", "status", ["pending", "approved", "rejected"], "pending");
  await int("storefronts", "rating", false, 0);

  // products
  await str("products", "storefrontId", 64, true);
  await str("products", "sellerId", 64, true);
  await str("products", "storeName", 255);
  await str("products", "title", 255, true);
  await str("products", "description", 5000);
  await str("products", "category", 64);
  await enumCol("products", "condition", ["new", "refurbished", "used"], "new");
  await int("products", "price", false, 0);
  await int("products", "stock", false, 1);
  await str("products", "county", 64);
  await str("products", "town", 128);
  await str("products", "coverImageId", 64);
  await strArr("products", "imageIds");
  await enumCol("products", "status", ["pending", "approved", "rejected"], "pending");
  await bool("products", "featured", false);

  // orders
  await str("orders", "buyerId", 64, true);
  await str("orders", "buyerName", 255);
  await str("orders", "sellerId", 64, true);
  await str("orders", "productId", 64, true);
  await str("orders", "productTitle", 255);
  await int("orders", "quantity", false, 1);
  await int("orders", "amount", false, 0);
  await int("orders", "subtotal", false, 0);
  await int("orders", "deliveryFee", false, 0);
  await str("orders", "orderGroupId", 64);
  await enumCol("orders", "status", ["pending", "paid", "shipped", "delivered", "cancelled"], "pending");
  await str("orders", "phone", 32);
  await str("orders", "address", 512);
  await str("orders", "secureAddress", 512);
  await str("orders", "paymentRef", 128);

  // subscriptions
  await str("subscriptions", "userId", 64, true);
  await str("subscriptions", "storefrontId", 64);
  await enumCol("subscriptions", "targetType", ["partner_company", "storefront"], "partner_company");
  await str("subscriptions", "targetId", 64);
  await str("subscriptions", "plan", 32);
  await int("subscriptions", "amount", false, 0);
  await enumCol("subscriptions", "status", ["none", "active", "expired", "cancelled"], "active");
  await str("subscriptions", "reference", 128);
  await dt("subscriptions", "startedAt");
  await dt("subscriptions", "expiresAt");

  // messages
  await str("messages", "threadId", 128, true);
  await str("messages", "senderId", 64, true);
  await str("messages", "senderName", 255);
  await str("messages", "receiverId", 64, true);
  await str("messages", "body", 3000, true);
  await str("messages", "contextType", 32);
  await str("messages", "contextId", 64);
  await bool("messages", "read", false);

  // notifications
  await str("notifications", "userId", 64, true);
  await str("notifications", "type", 32);
  await str("notifications", "title", 255, true);
  await str("notifications", "body", 1000);
  await str("notifications", "link", 512);
  await bool("notifications", "read", false);

  // app_settings
  await str("app_settings", "key", 128, true);
  await str("app_settings", "value", 512, true);
  await str("app_settings", "label", 255);

  // disputes
  await str("disputes", "raisedBy", 64, true);
  await str("disputes", "raisedByName", 255);
  await enumCol("disputes", "subjectType", ["order", "service", "booking", "property", "other"], "other");
  await str("disputes", "subjectId", 64);
  await str("disputes", "subjectTitle", 255);
  await str("disputes", "category", 64);
  await str("disputes", "description", 3000, true);
  await enumCol("disputes", "status", ["open", "investigating", "resolved", "rejected"], "open");
  await str("disputes", "resolution", 2000);
  await str("disputes", "handledBy", 64);

  // mortgage_enquiries
  await str("mortgage_enquiries", "userId", 64, true);
  await str("mortgage_enquiries", "userName", 255);
  await str("mortgage_enquiries", "userEmail", 255);
  await str("mortgage_enquiries", "phone", 32);
  await str("mortgage_enquiries", "propertyId", 64, true);
  await str("mortgage_enquiries", "propertyTitle", 255);
  await int("mortgage_enquiries", "propertyPrice", false, 0);
  await int("mortgage_enquiries", "deposit", false, 0);
  await int("mortgage_enquiries", "loanAmount", false, 0);
  await int("mortgage_enquiries", "termYears", false, 20);
  await int("mortgage_enquiries", "interestRate", false, 0);
  await int("mortgage_enquiries", "monthlyRepayment", false, 0);
  await int("mortgage_enquiries", "monthlyIncome", false, 0);
  await str("mortgage_enquiries", "message", 2000);
  await enumCol("mortgage_enquiries", "status", ["new", "contacted", "closed"], "new");
  await str("mortgage_enquiries", "note", 2000);

  // viewing_requests
  await str("viewing_requests", "userId", 64, true);
  await str("viewing_requests", "userName", 255);
  await str("viewing_requests", "phone", 32);
  await str("viewing_requests", "propertyId", 64, true);
  await str("viewing_requests", "propertyTitle", 255);
  await str("viewing_requests", "ownerId", 64);
  await dt("viewing_requests", "preferredDate");
  await dt("viewing_requests", "alternateDate");
  await str("viewing_requests", "message", 2000);
  await enumCol("viewing_requests", "status", ["requested", "confirmed", "declined", "completed"], "requested");
  await str("viewing_requests", "note", 2000);

  // 6) Indexes (wait for columns to finish processing first)
  console.log("\nWaiting for columns to become available...");
  {
    const watch = [
      ["properties", "locationVerificationStatus"],
      ["partner_companies", "ownerId"],
      ["partner_companies", "subscriptionStatus"],
      ["partner_portfolio_images", "partnerCompanyId"],
      ["subscriptions", "targetType"],
      ["app_settings", "key"],
    ] as const;
    for (let attempt = 1; attempt <= 40; attempt++) {
      let pending = 0;
      for (const [tableId, key] of watch) {
        try {
          const cols = await tablesDB.listColumns({ databaseId: DB, tableId });
          const col = cols.columns.find((c) => c.key === key);
          if (!col || col.status !== "available") pending += 1;
        } catch {
          pending += 1;
        }
      }
      if (pending === 0) {
        console.log("  columns ready");
        break;
      }
      if (attempt === 40) {
        console.warn(`  ! ${pending} watched columns still not available after waiting`);
      } else {
        await sleep(5000);
      }
    }
  }

  // Ensure marketplace products are admin-managed only (idempotent permission update).
  await safe("products permissions (admin create)", () =>
    tablesDB.updateTable({
      databaseId: DB,
      tableId: "products",
      name: "Products",
      permissions: [
        Permission.create(Role.team("admins")),
        Permission.read(Role.team("admins")),
        Permission.update(Role.team("admins")),
        Permission.delete(Role.team("admins")),
      ],
      rowSecurity: true,
      enabled: true,
    }),
  );

  await safe("default marketplace delivery fee", () =>
    tablesDB.createRow({
      databaseId: DB,
      tableId: "app_settings",
      rowId: "marketplace_delivery_fee",
      data: {
        key: "marketplace_delivery_fee_kes",
        value: "300",
        label: "Marketplace delivery fee",
      } as Record<string, unknown>,
      permissions: [
        P.readAny,
        P.updateAdmins,
        P.deleteAdmins,
      ],
    }),
  );

  console.log("Indexes:");
  await index("profiles", "idx_userId", IndexType.Key, ["userId"]);
  await index("role_applications", "idx_userId", IndexType.Key, ["userId"]);
  await index("role_applications", "idx_role", IndexType.Key, ["role"]);
  await index("role_applications", "idx_status", IndexType.Key, ["status"]);
  await index("properties", "idx_status", IndexType.Key, ["status"]);
  await index("properties", "idx_location_verification", IndexType.Key, ["locationVerificationStatus"]);
  await index("properties", "idx_type", IndexType.Key, ["listingType"]);
  await index("properties", "idx_county", IndexType.Key, ["county"]);
  await index("properties", "idx_price", IndexType.Key, ["price"]);
  await index("properties", "idx_bedrooms", IndexType.Key, ["bedrooms"]);
  await index("properties", "idx_owner", IndexType.Key, ["ownerId"]);
  await index("properties", "idx_title_ft", IndexType.Fulltext, ["title"]);
  await index("properties", "idx_latitude", IndexType.Key, ["latitude"]);
  await index("properties", "idx_longitude", IndexType.Key, ["longitude"]);
  await index("viewing_payments", "idx_user", IndexType.Key, ["userId"]);
  await index("viewing_payments", "idx_prop", IndexType.Key, ["propertyId"]);
  await index("recently_viewed", "idx_user", IndexType.Key, ["userId"]);
  await index("recently_viewed", "idx_viewedAt", IndexType.Key, ["viewedAt"]);
  await index("favorites", "idx_user", IndexType.Key, ["userId"]);
  await index("favorites", "idx_prop", IndexType.Key, ["propertyId"]);
  await index("inquiries", "idx_prop", IndexType.Key, ["propertyId"]);
  await index("payments", "idx_user", IndexType.Key, ["userId"]);
  // New module indexes
  await index("service_requests", "idx_user", IndexType.Key, ["userId"]);
  await index("service_requests", "idx_status", IndexType.Key, ["status"]);
  await index("service_requests", "idx_category", IndexType.Key, ["category"]);
  await index("service_requests", "idx_provider", IndexType.Key, ["providerId"]);
  await index("service_providers", "idx_user", IndexType.Key, ["userId"]);
  await index("partner_companies", "idx_owner", IndexType.Key, ["ownerId"]);
  await index("partner_companies", "idx_role", IndexType.Key, ["role"]);
  await index("partner_companies", "idx_status", IndexType.Key, ["status"]);
  await index("partner_companies", "idx_category", IndexType.Key, ["category"]);
  await index("partner_companies", "idx_subscription", IndexType.Key, ["subscriptionStatus"]);
  await index("partner_portfolio_images", "idx_partner", IndexType.Key, ["partnerCompanyId"]);
  await index("partner_portfolio_images", "idx_owner", IndexType.Key, ["ownerId"]);
  await index("bookings", "idx_prop", IndexType.Key, ["propertyId"]);
  await index("bookings", "idx_guest", IndexType.Key, ["guestId"]);
  await index("bookings", "idx_host", IndexType.Key, ["hostId"]);
  await index("bookings", "idx_status", IndexType.Key, ["status"]);
  await index("storefronts", "idx_owner", IndexType.Key, ["ownerId"]);
  await index("storefronts", "idx_status", IndexType.Key, ["status"]);
  await index("storefronts", "idx_category", IndexType.Key, ["category"]);
  await index("products", "idx_store", IndexType.Key, ["storefrontId"]);
  await index("products", "idx_seller", IndexType.Key, ["sellerId"]);
  await index("products", "idx_status", IndexType.Key, ["status"]);
  await index("products", "idx_category", IndexType.Key, ["category"]);
  await index("products", "idx_price", IndexType.Key, ["price"]);
  await index("products", "idx_title_ft", IndexType.Fulltext, ["title"]);
  await index("orders", "idx_buyer", IndexType.Key, ["buyerId"]);
  await index("orders", "idx_seller", IndexType.Key, ["sellerId"]);
  await index("orders", "idx_order_group", IndexType.Key, ["orderGroupId"]);
  await index("app_settings", "idx_key", IndexType.Key, ["key"]);
  await index("subscriptions", "idx_user", IndexType.Key, ["userId"]);
  await index("subscriptions", "idx_store", IndexType.Key, ["storefrontId"]);
  await index("subscriptions", "idx_target", IndexType.Key, ["targetType", "targetId"]);
  await index("messages", "idx_thread", IndexType.Key, ["threadId"]);
  await index("messages", "idx_receiver", IndexType.Key, ["receiverId"]);
  await index("reviews", "idx_target", IndexType.Key, ["targetId"]);
  await index("audit_logs", "idx_actor", IndexType.Key, ["actorId"]);
  await index("audit_logs", "idx_action", IndexType.Key, ["action"]);
  await index("audit_logs", "idx_target", IndexType.Key, ["targetType", "targetId"]);
  await index("notifications", "idx_user", IndexType.Key, ["userId"]);
  await index("invoices", "idx_user", IndexType.Key, ["userId"]);
  await index("invoices", "idx_provider", IndexType.Key, ["providerId"]);
  await index("invoices", "idx_service", IndexType.Key, ["serviceRequestId"]);
  await index("disputes", "idx_raiser", IndexType.Key, ["raisedBy"]);
  await index("disputes", "idx_status", IndexType.Key, ["status"]);
  await index("mortgage_enquiries", "idx_user", IndexType.Key, ["userId"]);
  await index("mortgage_enquiries", "idx_prop", IndexType.Key, ["propertyId"]);
  await index("mortgage_enquiries", "idx_status", IndexType.Key, ["status"]);
  await index("viewing_requests", "idx_user", IndexType.Key, ["userId"]);
  await index("viewing_requests", "idx_owner", IndexType.Key, ["ownerId"]);
  await index("viewing_requests", "idx_prop", IndexType.Key, ["propertyId"]);
  await index("viewing_requests", "idx_status", IndexType.Key, ["status"]);

  // 7) Bootstrap admins
  if (adminEmails.length > 0) {
    console.log(`\nBootstrapping ${adminEmails.length} admin(s):`);
    for (const adminEmail of adminEmails) {
      console.log(`  → ${adminEmail}`);
      try {
        const list = await users.list({
          queries: [Query.equal("email", adminEmail)],
        });
        const found = list.users[0];
        if (!found) {
          console.warn(
            `  ! No account found for ${adminEmail}. Register in the app first, then re-run.`,
          );
          continue;
        }
        await safe(`admin membership for ${adminEmail}`, () =>
          teams.createMembership({
            teamId: "admins",
            userId: found.$id,
            roles: ["owner"],
          }),
        );
      } catch (err) {
        console.warn(
          `  ! Admin bootstrap failed for ${adminEmail}: ${(err as Error).message}`,
        );
      }
    }
  } else {
    console.log(
      "\nSkip admin bootstrap (set ADMIN_EMAIL or ADMIN_EMAILS in .env).",
    );
  }

  console.log("\nDone. Homiva backend is provisioned.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
