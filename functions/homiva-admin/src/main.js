import { Client, TablesDB, Teams, Query, ID, Permission, Role } from "node-appwrite";

/**
 * Homiva admin function.
 *
 * Handles privileged operations that require an API key:
 *   - approveRole / rejectRole / suspendRole  (role_applications + team membership)
 *   - approveProperty / rejectProperty        (property status + public read)
 *
 * The caller must be a member of the `admins` team. Appwrite injects the
 * authenticated caller's id via the `x-appwrite-user-id` header.
 */

const DB = "homiva";
const T = {
  profiles: "profiles",
  roleApplications: "role_applications",
  properties: "properties",
  serviceProviders: "service_providers",
  storefronts: "storefronts",
  products: "products",
  auditLogs: "audit_logs",
};

export default async ({ req, res, log, error }) => {
  const endpoint =
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    "https://fra.cloud.appwrite.io/v1";
  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tablesDB = new TablesDB(client);
  const teams = new Teams(client);

  const fail = (message, code = 400) => res.json({ ok: false, error: message }, code);

  const callerId = req.headers["x-appwrite-user-id"];
  if (!callerId) return fail("Not authenticated.", 401);

  // Verify caller is an admin (filter memberships in-code for reliability).
  try {
    const memberships = await teams.listMemberships({
      teamId: "admins",
      queries: [Query.limit(200)],
    });
    const isAdmin = memberships.memberships.some((m) => m.userId === callerId);
    if (!isAdmin) {
      return fail("Admin access required.", 403);
    }
  } catch (e) {
    error(`Admin check failed: ${e.message}`);
    return fail("Admin verification failed.", 403);
  }

  let body;
  try {
    body = req.bodyJson ?? JSON.parse(req.body || "{}");
  } catch {
    return fail("Invalid request body.");
  }

  const {
    action,
    applicationId,
    propertyId,
    providerId,
    storefrontId,
    productId,
    note,
  } = body;

  const logAction = async (targetType, targetId, summary) => {
    try {
      await tablesDB.createRow({
        databaseId: DB,
        tableId: T.auditLogs,
        rowId: ID.unique(),
        data: {
          actorId: callerId,
          action,
          targetType,
          targetId: targetId || "",
          summary,
        },
        permissions: [Permission.read(Role.team("admins"))],
      });
    } catch (e) {
      log(`Audit log note: ${e.message}`);
    }
  };

  const updateProfileRoles = async (userId, roleTeam, add) => {
    try {
      const list = await tablesDB.listRows({
        databaseId: DB,
        tableId: T.profiles,
        queries: [Query.equal("userId", userId), Query.limit(1)],
      });
      const profile = list.rows[0];
      if (!profile) return;
      const roles = new Set(profile.roles || []);
      if (add) roles.add(roleTeam);
      else roles.delete(roleTeam);
      await tablesDB.updateRow({
        databaseId: DB,
        tableId: T.profiles,
        rowId: profile.$id,
        data: { roles: [...roles] },
      });
    } catch (e) {
      log(`Could not sync profile roles: ${e.message}`);
    }
  };

  try {
    switch (action) {
      case "approveRole": {
        const app = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
        });
        // Add user to the role team (idempotent).
        try {
          await teams.createMembership({
            teamId: app.role,
            userId: app.userId,
            roles: [],
          });
        } catch (e) {
          if (e.code !== 409) throw e; // 409 = already a member
        }
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
          data: { status: "approved", reviewedBy: callerId, reviewNote: note || "" },
        });
        await updateProfileRoles(app.userId, app.role, true);
        await logAction("role_application", applicationId, `Approved ${app.roleLabel || app.role} for ${app.userEmail || app.userId}.`);
        return res.json({ ok: true });
      }

      case "rejectRole": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
          data: { status: "rejected", reviewedBy: callerId, reviewNote: note || "" },
        });
        await logAction("role_application", applicationId, "Rejected role application.");
        return res.json({ ok: true });
      }

      case "suspendRole": {
        const app = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
        });
        // Remove the user's membership from the role team.
        try {
          const memberships = await teams.listMemberships({
            teamId: app.role,
            queries: [Query.limit(200)],
          });
          const m = memberships.memberships.find(
            (x) => x.userId === app.userId,
          );
          if (m) {
            await teams.deleteMembership({
              teamId: app.role,
              membershipId: m.$id,
            });
          }
        } catch (e) {
          log(`Membership removal note: ${e.message}`);
        }
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
          data: { status: "suspended", reviewedBy: callerId, reviewNote: note || "" },
        });
        await updateProfileRoles(app.userId, app.role, false);
        await logAction("role_application", applicationId, `Suspended ${app.roleLabel || app.role} for ${app.userEmail || app.userId}.`);
        return res.json({ ok: true });
      }

      case "approveProperty": {
        const prop = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
        });
        const perms = new Set(prop.$permissions || []);
        perms.add('read("any")'); // make approved listing publicly readable
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
          data: { status: "approved", rejectionReason: "" },
          permissions: [...perms],
        });
        await logAction("property", propertyId, `Approved property "${prop.title || propertyId}".`);
        return res.json({ ok: true });
      }

      case "rejectProperty": {
        const prop = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
        });
        const perms = (prop.$permissions || []).filter(
          (p) => p !== 'read("any")',
        );
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
          data: { status: "rejected", rejectionReason: note || "Not specified" },
          permissions: perms,
        });
        await logAction("property", propertyId, `Rejected property "${prop.title || propertyId}".`);
        return res.json({ ok: true });
      }

      case "verifyProvider": {
        const provider = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.serviceProviders,
          rowId: providerId,
        });
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.serviceProviders,
          rowId: providerId,
          data: { verified: true },
        });
        await logAction("service_provider", providerId, `Verified provider "${provider.businessName || providerId}".`);
        return res.json({ ok: true });
      }

      case "unverifyProvider": {
        const provider = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.serviceProviders,
          rowId: providerId,
        });
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.serviceProviders,
          rowId: providerId,
          data: { verified: false },
        });
        await logAction("service_provider", providerId, `Unverified provider "${provider.businessName || providerId}".`);
        return res.json({ ok: true });
      }

      case "approveStorefront": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.storefronts,
          rowId: storefrontId,
          data: { status: "approved" },
        });
        await logAction("storefront", storefrontId, "Approved storefront.");
        return res.json({ ok: true });
      }

      case "rejectStorefront": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.storefronts,
          rowId: storefrontId,
          data: { status: "rejected" },
        });
        await logAction("storefront", storefrontId, "Rejected storefront.");
        return res.json({ ok: true });
      }

      case "verifyStorefront": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.storefronts,
          rowId: storefrontId,
          data: { verified: true },
        });
        await logAction("storefront", storefrontId, "Verified storefront.");
        return res.json({ ok: true });
      }

      case "approveProduct": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.products,
          rowId: productId,
          data: { status: "approved" },
        });
        await logAction("product", productId, "Approved product.");
        return res.json({ ok: true });
      }

      case "rejectProduct": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.products,
          rowId: productId,
          data: { status: "rejected" },
        });
        await logAction("product", productId, "Rejected product.");
        return res.json({ ok: true });
      }

      default:
        return fail(`Unknown action: ${action}`);
    }
  } catch (e) {
    error(`Action ${action} failed: ${e.message}`);
    return fail(e.message || "Action failed.", 500);
  }
};
