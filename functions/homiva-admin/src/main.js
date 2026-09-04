import { Client, TablesDB, Teams, Users, Storage, Query, ID, Permission, Role } from "node-appwrite";

/**
 * Homiva privileged function.
 *
 * Uses an API key so it can grant document/file permissions a browser
 * session cannot (other users, team:admins). Admin-only actions still
 * require membership in the `admins` team. User-scoped actions
 * (viewing requests, messages, verification file sharing) are available
 * to any authenticated caller and always bind records to `callerId`.
 */

const DB = "homiva";
const VERIFICATION_BUCKET = "verification-documents";
const T = {
  profiles: "profiles",
  roleApplications: "role_applications",
  properties: "properties",
  serviceProviders: "service_providers",
  serviceRequests: "service_requests",
  partnerCompanies: "partner_companies",
  storefronts: "storefronts",
  products: "products",
  auditLogs: "audit_logs",
  viewingRequests: "viewing_requests",
  messages: "messages",
};
const APPLICABLE_ROLE_TEAMS = new Set([
  "agents",
  "landlords",
  "airbnb_owners",
  "movers",
  "cleaning_companies",
  "interior_designers",
]);
const ADMIN_ACTIONS = new Set([
  "approveRole",
  "rejectRole",
  "suspendRole",
  "approveProperty",
  "verifyPropertyLocation",
  "rejectPropertyLocation",
  "rejectProperty",
  "verifyProvider",
  "unverifyProvider",
  "approvePartnerCompany",
  "rejectPartnerCompany",
  "suspendPartnerCompany",
  "featurePartnerCompany",
  "unfeaturePartnerCompany",
  "updateServiceRequest",
  "approveStorefront",
  "rejectStorefront",
  "verifyStorefront",
  "approveProduct",
  "rejectProduct",
]);
const USER_ACTIONS = new Set([
  "createViewingRequest",
  "sendMessage",
  "shareVerificationFiles",
]);

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
  const users = new Users(client);
  const storage = new Storage(client);

  const fail = (message, code = 400) => res.json({ ok: false, error: message }, code);

  const callerId = req.headers["x-appwrite-user-id"];
  if (!callerId) return fail("Not authenticated.", 401);

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
    partnerCompanyId,
    serviceRequestId,
    storefrontId,
    productId,
    status,
    quotedAmount,
    assignedTo,
    note,
  } = body;

  if (!action) return fail("Action is required.");
  if (!ADMIN_ACTIONS.has(action) && !USER_ACTIONS.has(action)) {
    return fail(`Unknown action: ${action}`);
  }

  if (ADMIN_ACTIONS.has(action)) {
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
  }

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

  const updateProfileRoles = async (userId, roleTeam, add, identity = {}) => {
    try {
      const list = await tablesDB.listRows({
        databaseId: DB,
        tableId: T.profiles,
        queries: [Query.equal("userId", userId), Query.limit(1)],
      });
      const profile = list.rows[0];
      if (!profile) {
        if (!add) return;
        let name = String(identity.name || "").trim();
        let email = String(identity.email || "").trim();
        if (!email || !name) {
          try {
            const account = await users.get({ userId });
            name = name || account.name || (account.email || "").split("@")[0];
            email = email || account.email || "";
          } catch (e) {
            log(`Could not load user ${userId}: ${e.message}`);
          }
        }
        if (!email) {
          log(`Cannot create profile for ${userId}: no email available.`);
          return;
        }
        await tablesDB.createRow({
          databaseId: DB,
          tableId: T.profiles,
          rowId: ID.unique(),
          data: {
            userId,
            name: name || "Homiva user",
            email,
            roles: [roleTeam],
          },
          permissions: [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
          ],
        });
        return;
      }
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
        if (!applicationId) return fail("Application ID is required.");
        const app = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
        });
        if (!APPLICABLE_ROLE_TEAMS.has(app.role)) {
          return fail("Application contains an unsupported role.");
        }
        if (app.status !== "pending" && app.status !== "suspended") {
          return fail(`A ${app.status} application cannot be approved.`);
        }
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
        await updateProfileRoles(app.userId, app.role, true, {
          name: app.userName,
          email: app.userEmail,
        });
        await logAction("role_application", applicationId, `Approved ${app.roleLabel || app.role} for ${app.userEmail || app.userId}.`);
        return res.json({ ok: true });
      }

      case "rejectRole": {
        if (!applicationId) return fail("Application ID is required.");
        const app = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
        });
        if (app.status !== "pending") {
          return fail(`A ${app.status} application cannot be rejected.`);
        }
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
        if (!applicationId) return fail("Application ID is required.");
        const app = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.roleApplications,
          rowId: applicationId,
        });
        if (!APPLICABLE_ROLE_TEAMS.has(app.role)) {
          return fail("Application contains an unsupported role.");
        }
        if (app.status !== "approved") {
          return fail(`A ${app.status} application cannot be suspended.`);
        }
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
        if (prop.locationVerificationStatus !== "verified") {
          return fail("Physical location must be verified before publishing this property.");
        }
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

      case "verifyPropertyLocation": {
        const prop = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
        });
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
          data: {
            locationVerificationStatus: "verified",
            locationVerifiedAt: new Date().toISOString(),
            locationVerifiedBy: callerId,
            locationVerificationNote: note || "",
          },
        });
        await logAction("property", propertyId, `Verified physical location for "${prop.title || propertyId}".`);
        return res.json({ ok: true });
      }

      case "rejectPropertyLocation": {
        const prop = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
        });
        const perms = (prop.$permissions || []).filter((p) => p !== 'read("any")');
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
          data: {
            status: "pending",
            locationVerificationStatus: "rejected",
            locationVerificationNote: note || "Physical location could not be verified.",
          },
          permissions: perms,
        });
        await logAction("property", propertyId, `Rejected physical location for "${prop.title || propertyId}".`);
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

      case "approvePartnerCompany": {
        const company = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.partnerCompanies,
          rowId: partnerCompanyId,
        });
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.partnerCompanies,
          rowId: partnerCompanyId,
          data: { status: "approved", verified: true },
        });
        await logAction("partner_company", partnerCompanyId, `Approved partner company "${company.name || partnerCompanyId}".`);
        return res.json({ ok: true });
      }

      case "rejectPartnerCompany": {
        const company = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.partnerCompanies,
          rowId: partnerCompanyId,
        });
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.partnerCompanies,
          rowId: partnerCompanyId,
          data: { status: "rejected", verified: false },
        });
        await logAction("partner_company", partnerCompanyId, `Rejected partner company "${company.name || partnerCompanyId}".`);
        return res.json({ ok: true });
      }

      case "suspendPartnerCompany": {
        const company = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.partnerCompanies,
          rowId: partnerCompanyId,
        });
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.partnerCompanies,
          rowId: partnerCompanyId,
          data: { status: "suspended", verified: false },
        });
        await logAction("partner_company", partnerCompanyId, `Suspended partner company "${company.name || partnerCompanyId}".`);
        return res.json({ ok: true });
      }

      case "featurePartnerCompany":
      case "unfeaturePartnerCompany": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.partnerCompanies,
          rowId: partnerCompanyId,
          data: { featured: action === "featurePartnerCompany" },
        });
        await logAction("partner_company", partnerCompanyId, action === "featurePartnerCompany" ? "Featured partner company." : "Removed partner feature.");
        return res.json({ ok: true });
      }

      case "updateServiceRequest": {
        await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.serviceRequests,
          rowId: serviceRequestId,
          data: {
            ...(status ? { status } : {}),
            ...(quotedAmount !== undefined ? { quotedAmount } : {}),
            ...(assignedTo !== undefined ? { assignedTo } : {}),
            ...(note !== undefined ? { adminNote: note } : {}),
          },
        });
        await logAction("service_request", serviceRequestId, `Updated service request to ${status || "current"} status.`);
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

      case "createViewingRequest": {
        const preferredDate = String(body.preferredDate || "").trim();
        if (!propertyId) return fail("Property ID is required.");
        if (!preferredDate) return fail("Please choose a preferred date.");
        const property = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
        });
        if (property.ownerId && property.ownerId === callerId) {
          return fail("You cannot request a viewing of your own listing.");
        }
        const ownerId = property.ownerId || "";
        const permissions = [
          Permission.read(Role.user(callerId)),
          Permission.read(Role.team("admins")),
          Permission.update(Role.team("admins")),
        ];
        if (ownerId) {
          permissions.push(
            Permission.read(Role.user(ownerId)),
            Permission.update(Role.user(ownerId)),
          );
        }
        const row = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.viewingRequests,
          rowId: ID.unique(),
          data: {
            userId: callerId,
            userName: String(body.userName || "").trim(),
            phone: String(body.phone || "").trim(),
            propertyId: property.$id,
            propertyTitle: property.title || "",
            ownerId,
            preferredDate,
            alternateDate: String(body.alternateDate || "").trim() || null,
            message: String(body.message || "").trim(),
            status: "requested",
          },
          permissions,
        });
        return res.json({ ok: true, row });
      }

      case "sendMessage": {
        const receiverId = String(body.receiverId || "").trim();
        const messageBody = String(body.body || "").trim();
        if (!receiverId) return fail("Receiver is required.");
        if (receiverId === callerId) return fail("You cannot message yourself.");
        if (!messageBody) return fail("Message cannot be empty.");
        if (messageBody.length > 3000) return fail("Message is too long.");
        const contextId = String(body.contextId || "").trim();
        const pair = [callerId, receiverId].sort().join("_");
        const threadId = contextId ? `${pair}__${contextId}` : pair;
        const row = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.messages,
          rowId: ID.unique(),
          data: {
            threadId,
            senderId: callerId,
            senderName: String(body.senderName || "").trim(),
            receiverId,
            body: messageBody,
            contextType: String(body.contextType || "").trim(),
            contextId,
            read: false,
          },
          permissions: [
            Permission.read(Role.user(callerId)),
            Permission.update(Role.user(callerId)),
            Permission.delete(Role.user(callerId)),
            Permission.read(Role.user(receiverId)),
            Permission.update(Role.user(receiverId)),
          ],
        });
        return res.json({ ok: true, row });
      }

      case "shareVerificationFiles": {
        const fileIds = Array.isArray(body.fileIds) ? body.fileIds : [];
        if (fileIds.length === 0) return fail("No files to share.");
        if (fileIds.length > 20) return fail("Too many files.");
        const adminRead = Permission.read(Role.team("admins"));
        for (const fileId of fileIds) {
          const id = String(fileId || "").trim();
          if (!id) return fail("Invalid file id.");
          const file = await storage.getFile({
            bucketId: VERIFICATION_BUCKET,
            fileId: id,
          });
          const perms = file.$permissions || [];
          const owned = perms.some((p) => p.includes(`user:${callerId}`));
          if (!owned) {
            return fail("You can only share files you uploaded.", 403);
          }
          if (!perms.includes(adminRead)) {
            await storage.updateFile({
              bucketId: VERIFICATION_BUCKET,
              fileId: id,
              permissions: [...perms, adminRead],
            });
          }
        }
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
