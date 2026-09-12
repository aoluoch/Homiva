import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { formatAppwriteError, storage, tablesDB } from "@/lib/appwrite";
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
  "image/jpg",
  "image/pjpeg",
  "image/jfif",
  "image/png",
  "image/webp",
]);
const IMAGE_NAME = /\.(jpe?g|jfif|png|webp)$/i;
const PDF_NAME = /\.pdf$/i;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

function isNetworkFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|networkerror|load failed/i.test(message);
}

async function withNetworkRetry<T>(run: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isNetworkFailure(error) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function isAcceptedDocument(file: File) {
  const type = (file.type || "").toLowerCase();
  const named =
    !type && (IMAGE_NAME.test(file.name) || PDF_NAME.test(file.name));
  return (ACCEPTED_DOCUMENT_TYPES.has(type) || named) && file.size <= MAX_DOCUMENT_SIZE;
}

/**
 * WhatsApp / Samsung gallery files often arrive as `image/jpg`, `.jfif`, or a
 * content-provider blob that Appwrite's multipart upload cannot read. Rebuild
 * a normal JPEG so `storage.createFile` does not surface as "Failed to fetch".
 */
async function normalizeVerificationFile(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  if (type === "application/pdf" || PDF_NAME.test(file.name)) {
    return file;
  }

  const looksLikeImage = type.startsWith("image/") || IMAGE_NAME.test(file.name);
  if (looksLikeImage && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(
        1,
        MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
      );
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.82),
        );
        if (blob) {
          const base = file.name.replace(/\.[^.]+$/, "") || "document";
          return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
        }
      } else {
        bitmap.close();
      }
    } catch {
      // Fall through and send a freshly copied File instead.
    }
  }

  try {
    const bytes = await file.arrayBuffer();
    const fallbackType =
      type === "image/jpg" || type === "image/pjpeg" || type === "image/jfif"
        ? "image/jpeg"
        : type || (IMAGE_NAME.test(file.name) ? "image/jpeg" : file.type);
    const fallbackName = file.name.replace(/\.jfif$/i, ".jpg");
    return new File([bytes], fallbackName, { type: fallbackType });
  } catch {
    throw new Error(
      "Could not read this document. Re-save it as a JPEG or PDF and try again.",
    );
  }
}

async function uploadApplicationDocuments(
  userId: string,
  documents: RoleApplicationDocument[],
) {
  const uploaded: string[] = [];
  try {
    for (const { file } of documents) {
      const uploadable = await normalizeVerificationFile(file);
      const res = await withNetworkRetry(() =>
        storage.createFile({
          bucketId: appwriteConfig.buckets.verificationDocuments,
          fileId: ID.unique(),
          file: uploadable,
          permissions: [
            Permission.read(Role.user(userId)),
            Permission.delete(Role.user(userId)),
          ],
        }),
      );
      uploaded.push(res.$id);
    }
    if (uploaded.length > 0) {
      await withNetworkRetry(() =>
        executeHomivaAdmin({
          action: "shareVerificationFiles",
          fileIds: uploaded,
        }),
      );
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
        phone: location.phone.trim().slice(0, 32),
        county: location.county.trim().slice(0, 64),
        town: location.town.trim().slice(0, 128),
        address: location.address.trim().slice(0, 512),
        latitude: location.latitude.trim().slice(0, 32),
        longitude: location.longitude.trim().slice(0, 32),
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
        ({ file }) => !isAcceptedDocument(file),
      );
      if (invalid) {
        throw new Error(
          "Documents must be PDF, JPEG, PNG, or WEBP files under 10 MB.",
        );
      }

      let documentIds: string[];
      try {
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

        documentIds = await uploadApplicationDocuments(
          user.$id,
          submittedDocuments,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "You already have a pending application for this role."
        ) {
          throw error;
        }
        throw new Error(formatAppwriteError(error));
      }

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
        throw new Error(formatAppwriteError(error));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
}
