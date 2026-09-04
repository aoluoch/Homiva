import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { storage, tablesDB } from "@/lib/appwrite";
import { executeHomivaAdmin } from "@/lib/homivaAdmin";
import {
  APPLICABLE_ROLES,
  appwriteConfig,
  ROLE_DOCUMENT_REQUIREMENTS,
  TABLES,
} from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { RoleApplication } from "@/types/models";

type RoleApplicationDocument = {
  label: string;
  file: File;
};

type RoleApplicationLocation = {
  phone: string;
  county: string;
  town: string;
  address: string;
  latitude: string;
  longitude: string;
};

const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

async function uploadApplicationDocuments(
  userId: string,
  documents: RoleApplicationDocument[],
) {
  const uploaded: string[] = [];
  try {
    for (const { file } of documents) {
      const res = await storage.createFile({
        bucketId: appwriteConfig.buckets.verificationDocuments,
        fileId: ID.unique(),
        file,
        permissions: [
          Permission.read(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
      });
      uploaded.push(res.$id);
    }
    if (uploaded.length > 0) {
      await executeHomivaAdmin({
        action: "shareVerificationFiles",
        fileIds: uploaded,
      });
    }
  } catch (error) {
    await Promise.allSettled(
      uploaded.map((fileId) =>
        storage.deleteFile({
          bucketId: appwriteConfig.buckets.verificationDocuments,
          fileId,
        }),
      ),
    );
    throw error;
  }
  return uploaded;
}

async function deleteApplicationDocuments(documentIds: string[]) {
  await Promise.allSettled(
    documentIds.map((fileId) =>
      storage.deleteFile({
        bucketId: appwriteConfig.buckets.verificationDocuments,
        fileId,
      }),
    ),
  );
}

/** Applications submitted by the current user. */
export function useMyApplications() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-applications", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.roleApplications,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ],
      });
      return res.rows as unknown as RoleApplication[];
    },
  });
}

export function useApplyForRole() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      roleLabel,
      message,
      documents,
      location,
    }: {
      role: string;
      roleLabel: string;
      message?: string;
      documents?: RoleApplicationDocument[];
      location: RoleApplicationLocation;
    }) => {
      if (!user) throw new Error("You must be logged in to apply.");
      const applicableRole = APPLICABLE_ROLES.find(
        (candidate) => candidate.team === role,
      );
      if (!applicableRole || applicableRole.label !== roleLabel) {
        throw new Error("This role is not available for application.");
      }
      const contact = {
        phone: location.phone.trim(),
        county: location.county.trim(),
        town: location.town.trim(),
        address: location.address.trim(),
        latitude: location.latitude.trim(),
        longitude: location.longitude.trim(),
      };
      if (
        !contact.phone ||
        !contact.county ||
        !contact.town ||
        !contact.address ||
        !contact.latitude ||
        !contact.longitude
      ) {
        throw new Error(
          "Contact phone, address, county, town and pinned location are required.",
        );
      }
      const requiredDocuments = ROLE_DOCUMENT_REQUIREMENTS[role] ?? [
        "National ID or passport",
      ];
      const submittedDocuments = documents ?? [];
      const missing = requiredDocuments.filter(
        (label) => !submittedDocuments.some((doc) => doc.label === label),
      );
      if (missing.length > 0) {
        throw new Error(`Please upload: ${missing.join(", ")}.`);
      }
      const invalid = submittedDocuments.find(
        ({ file }) =>
          !ACCEPTED_DOCUMENT_TYPES.has(file.type) ||
          file.size > MAX_DOCUMENT_SIZE,
      );
      if (invalid) {
        throw new Error(
          "Documents must be PDF, JPEG, PNG, or WEBP files under 10 MB.",
        );
      }

      // Prevent duplicate pending applications for the same role.
      const existing = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.roleApplications,
        queries: [
          Query.equal("userId", user.$id),
          Query.equal("role", role),
          Query.equal("status", "pending"),
          Query.limit(1),
        ],
      });
      if (existing.rows.length > 0) {
        throw new Error("You already have a pending application for this role.");
      }

      const documentIds = await uploadApplicationDocuments(
        user.$id,
        submittedDocuments,
      );

      try {
        return await tablesDB.createRow({
          databaseId: appwriteConfig.databaseId,
          tableId: TABLES.roleApplications,
          rowId: ID.unique(),
          data: {
            userId: user.$id,
            userName: profile?.name ?? user.name,
            userEmail: user.email,
            role,
            roleLabel: applicableRole.label,
            status: "pending",
            message: message?.trim() ?? "",
            phone: contact.phone,
            county: contact.county,
            town: contact.town,
            address: contact.address,
            latitude: contact.latitude,
            longitude: contact.longitude,
            documentIds,
            documentLabels: submittedDocuments.map((doc) => doc.label),
          },
          permissions: [
            Permission.read(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
          ],
        });
      } catch (error) {
        await deleteApplicationDocuments(documentIds);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
}
