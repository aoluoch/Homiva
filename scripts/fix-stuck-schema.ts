/**
 * Recover Appwrite columns stuck in `processing` after bulk create.
 * Safe for empty partner tables; only deletes stuck property/subscription columns.
 */
import "dotenv/config";
import {
  Client,
  TablesDBIndexType as IndexType,
  Permission,
  Role,
  TablesDB,
} from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT!;
const projectId = process.env.APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;
const DB = "homiva";

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID or APPWRITE_API_KEY.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safe(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`  + ${label}`);
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 404 || e.code === 409) {
      console.log(`  = ${label} (${e.code === 404 ? "missing" : "exists"})`);
    } else {
      console.warn(`  ! ${label}: ${e.message ?? err}`);
    }
  }
}

async function waitAvailable(tableId: string, key: string, attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    const cols = await tablesDB.listColumns({ databaseId: DB, tableId });
    const col = cols.columns.find((c) => c.key === key);
    if (col?.status === "available") return true;
    await sleep(3000);
  }
  return false;
}

async function createString(
  tableId: string,
  key: string,
  size: number,
  required = false,
) {
  await safe(`${tableId}.${key}`, () =>
    tablesDB.createStringColumn({ databaseId: DB, tableId, key, size, required }),
  );
  await sleep(1500);
}

async function createEnum(
  tableId: string,
  key: string,
  elements: string[],
  xdefault: string,
) {
  await safe(`${tableId}.${key}`, () =>
    tablesDB.createEnumColumn({
      databaseId: DB,
      tableId,
      key,
      elements,
      required: false,
      xdefault,
    }),
  );
  await sleep(1500);
}

async function createBool(tableId: string, key: string, xdefault = false) {
  await safe(`${tableId}.${key}`, () =>
    tablesDB.createBooleanColumn({
      databaseId: DB,
      tableId,
      key,
      required: false,
      xdefault,
    }),
  );
  await sleep(1500);
}

async function createInt(tableId: string, key: string, xdefault = 0) {
  await safe(`${tableId}.${key}`, () =>
    tablesDB.createIntegerColumn({
      databaseId: DB,
      tableId,
      key,
      required: false,
      xdefault,
    }),
  );
  await sleep(1500);
}

async function createDatetime(tableId: string, key: string) {
  await safe(`${tableId}.${key}`, () =>
    tablesDB.createDatetimeColumn({ databaseId: DB, tableId, key, required: false }),
  );
  await sleep(1500);
}

async function recreatePartnerTables() {
  console.log("\nRecreating partner tables...");
  await safe("delete partner_portfolio_images", () =>
    tablesDB.deleteTable({ databaseId: DB, tableId: "partner_portfolio_images" }),
  );
  await safe("delete partner_companies", () =>
    tablesDB.deleteTable({ databaseId: DB, tableId: "partner_companies" }),
  );
  await sleep(2000);

  await safe("create partner_companies", () =>
    tablesDB.createTable({
      databaseId: DB,
      tableId: "partner_companies",
      name: "Partner Companies",
      permissions: [
        Permission.create(Role.users()),
        Permission.read(Role.any()),
        Permission.update(Role.team("admins")),
        Permission.delete(Role.team("admins")),
      ],
      rowSecurity: true,
      enabled: true,
    }),
  );

  await createString("partner_companies", "ownerId", 64, true);
  await createString("partner_companies", "role", 64, true);
  await createString("partner_companies", "name", 255, true);
  await createString("partner_companies", "description", 3000);
  await createEnum(
    "partner_companies",
    "category",
    ["movers", "cleaning_company", "interior_design_decor"],
    "movers",
  );
  await createString("partner_companies", "logoFileId", 64);
  await createString("partner_companies", "bannerFileId", 64);
  await createString("partner_companies", "phone", 32);
  await createString("partner_companies", "email", 255);
  await createString("partner_companies", "county", 64);
  await createString("partner_companies", "town", 128);
  await createEnum(
    "partner_companies",
    "status",
    ["pending", "approved", "rejected", "suspended"],
    "pending",
  );
  await createBool("partner_companies", "verified", false);
  await createBool("partner_companies", "featured", false);
  await createString("partner_companies", "plan", 32);
  await createEnum(
    "partner_companies",
    "subscriptionStatus",
    ["none", "active", "expired", "cancelled"],
    "none",
  );
  await createDatetime("partner_companies", "subscriptionExpiry");
  await createInt("partner_companies", "rating", 0);

  await safe("create partner_portfolio_images", () =>
    tablesDB.createTable({
      databaseId: DB,
      tableId: "partner_portfolio_images",
      name: "Partner Portfolio Images",
      permissions: [
        Permission.create(Role.users()),
        Permission.read(Role.any()),
        Permission.update(Role.team("admins")),
        Permission.delete(Role.team("admins")),
      ],
      rowSecurity: true,
      enabled: true,
    }),
  );
  await createString("partner_portfolio_images", "partnerCompanyId", 64, true);
  await createString("partner_portfolio_images", "ownerId", 64, true);
  await createString("partner_portfolio_images", "fileId", 64, true);
  await createString("partner_portfolio_images", "caption", 500);
  await createInt("partner_portfolio_images", "order", 0);
}

async function recreateStuckColumns() {
  console.log("\nRecreating stuck property/subscription columns...");
  for (const key of [
    "locationVerificationStatus",
    "locationVerifiedAt",
    "locationVerifiedBy",
    "locationVerificationNote",
  ]) {
    await safe(`delete properties.${key}`, () =>
      tablesDB.deleteColumn({ databaseId: DB, tableId: "properties", key }),
    );
  }
  for (const key of ["targetType", "targetId"]) {
    await safe(`delete subscriptions.${key}`, () =>
      tablesDB.deleteColumn({ databaseId: DB, tableId: "subscriptions", key }),
    );
  }
  await sleep(3000);

  await createEnum(
    "properties",
    "locationVerificationStatus",
    ["pending", "verified", "rejected"],
    "pending",
  );
  await createDatetime("properties", "locationVerifiedAt");
  await createString("properties", "locationVerifiedBy", 64);
  await createString("properties", "locationVerificationNote", 1000);

  await createEnum(
    "subscriptions",
    "targetType",
    ["partner_company", "storefront"],
    "partner_company",
  );
  await createString("subscriptions", "targetId", 64);
}

async function createIndexes() {
  console.log("\nCreating indexes...");
  const ready = await waitAvailable("partner_companies", "ownerId", 40);
  if (!ready) {
    console.warn("  ! partner_companies.ownerId still not available");
    return;
  }

  const specs: Array<[string, string, IndexType, string[]]> = [
    ["properties", "idx_location_verification", IndexType.Key, ["locationVerificationStatus"]],
    ["partner_companies", "idx_owner", IndexType.Key, ["ownerId"]],
    ["partner_companies", "idx_role", IndexType.Key, ["role"]],
    ["partner_companies", "idx_status", IndexType.Key, ["status"]],
    ["partner_companies", "idx_category", IndexType.Key, ["category"]],
    ["partner_companies", "idx_subscription", IndexType.Key, ["subscriptionStatus"]],
    ["partner_portfolio_images", "idx_partner", IndexType.Key, ["partnerCompanyId"]],
    ["partner_portfolio_images", "idx_owner", IndexType.Key, ["ownerId"]],
    ["subscriptions", "idx_target", IndexType.Key, ["targetType", "targetId"]],
  ];

  for (const [tableId, key, type, columns] of specs) {
    const first = columns[0];
    const ok = await waitAvailable(tableId, first, 20);
    if (!ok) {
      console.warn(`  ! skip ${tableId}.${key}: ${first} not available`);
      continue;
    }
    await safe(`index ${tableId}.${key}`, () =>
      tablesDB.createIndex({ databaseId: DB, tableId, key, type, columns }),
    );
  }
}

async function main() {
  console.log("Fixing stuck Homiva schema columns...");
  await recreatePartnerTables();
  await recreateStuckColumns();
  await createIndexes();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
