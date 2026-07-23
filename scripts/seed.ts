/**
 * Seed a handful of approved sample properties so the marketplace isn't empty.
 * Safe to run multiple times (rows use deterministic IDs).
 *
 * Usage: npm run seed
 */
import "dotenv/config";
import { Client, Permission, Role, TablesDB } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT!;
const projectId = process.env.APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing Appwrite env vars in .env");
  process.exit(1);
}

const DB = "homiva";
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const tablesDB = new TablesDB(client);

const samples = [
  {
    id: "seed-apt-kilimani",
    title: "Modern 2-Bedroom Apartment in Kilimani",
    description:
      "A bright, contemporary apartment with an open-plan living area, fitted kitchen and a private balcony overlooking the city. Secure compound with ample parking.",
    listingType: "rent",
    price: 85000,
    county: "Nairobi",
    town: "Kilimani",
    bedrooms: 2,
    bathrooms: 2,
    sizeSqft: 1100,
    amenities: ["Parking", "Backup generator", "CCTV", "Borehole", "Lift"],
  },
  {
    id: "seed-villa-karen",
    title: "5-Bedroom Family Villa in Karen",
    description:
      "Spacious villa set on half an acre of manicured gardens. Features a large kitchen, DSQ, and a spacious lounge that opens to a patio. Perfect for a growing family.",
    listingType: "sale",
    price: 65000000,
    county: "Nairobi",
    town: "Karen",
    bedrooms: 5,
    bathrooms: 4,
    sizeSqft: 4200,
    amenities: ["Garden", "DSQ", "Parking", "Solar water", "Electric fence"],
  },
  {
    id: "seed-airbnb-diani",
    title: "Beachfront Studio in Diani",
    description:
      "Wake up to the sound of the ocean in this cosy beachfront studio, steps from the white sands of Diani. Fully furnished with fast Wi-Fi and a shared pool.",
    listingType: "airbnb",
    price: 6500,
    county: "Kilifi",
    town: "Diani",
    bedrooms: 1,
    bathrooms: 1,
    sizeSqft: 550,
    amenities: ["Wi-Fi", "Swimming pool", "Beach access", "Air conditioning"],
  },
  {
    id: "seed-bedsitter-ruaka",
    title: "Affordable Bedsitter in Ruaka",
    description:
      "Neat and secure bedsitter ideal for young professionals. Close to the Northern bypass with easy access to town and shopping centres.",
    listingType: "rent",
    price: 15000,
    county: "Kiambu",
    town: "Ruaka",
    bedrooms: 1,
    bathrooms: 1,
    sizeSqft: 300,
    amenities: ["Water included", "CCTV", "Parking"],
  },
  {
    id: "seed-maisonette-nakuru",
    title: "4-Bedroom Maisonette in Nakuru",
    description:
      "Elegant maisonette in a gated community with a shared clubhouse and playground. Master ensuite, spacious bedrooms and a well-kept garden.",
    listingType: "sale",
    price: 18500000,
    county: "Nakuru",
    town: "Milimani",
    bedrooms: 4,
    bathrooms: 3,
    sizeSqft: 2600,
    amenities: ["Gated community", "Playground", "Parking", "Garden"],
  },
  {
    id: "seed-airbnb-nanyuki",
    title: "Cosy Cottage with Mt. Kenya Views",
    description:
      "A charming self-contained cottage on a working farm with breathtaking views of Mount Kenya. Fireplace, farm breakfast and plenty of nature walks.",
    listingType: "airbnb",
    price: 9000,
    county: "Nyeri",
    town: "Nanyuki",
    bedrooms: 2,
    bathrooms: 1,
    sizeSqft: 900,
    amenities: ["Fireplace", "Mountain views", "Breakfast", "Parking", "Pet friendly"],
  },
];

async function main() {
  console.log("Seeding sample properties...\n");
  for (const s of samples) {
    const { id, ...data } = s;
    try {
      await tablesDB.createRow({
        databaseId: DB,
        tableId: "properties",
        rowId: id,
        data: {
          ...data,
          imageIds: [],
          coverImageId: null,
          status: "approved",
          ownerId: "homiva-system",
          ownerName: "Homiva Listings",
          ownerRole: "agent",
          contactPhone: "+254700000000",
          contactEmail: "listings@homiva.co.ke",
          address: `${data.town}, ${data.county}`,
          featured: true,
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.team("admins")),
          Permission.delete(Role.team("admins")),
        ],
      });
      console.log(`  + ${s.title}`);
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 409) console.log(`  = ${s.title} (exists)`);
      else console.warn(`  ! ${s.title}: ${e.message ?? err}`);
    }
  }
  console.log("\nDone. Sample listings are live.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
