import { ID, Permission, Role } from "appwrite";
import { functions, storage } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";

/**
 * Ask the `homiva-image-compress` function to shrink an already-uploaded image
 * down to ~1MB (in place, keeping the same fileId). This is best-effort: if the
 * function is missing or fails, the original upload is left untouched.
 */
export async function compressStoredImage(
  bucketId: string,
  fileId: string,
): Promise<void> {
  try {
    await functions.createExecution({
      functionId: appwriteConfig.functions.imageCompress,
      body: JSON.stringify({ bucketId, fileId }),
      async: false,
    });
  } catch {
    // Compression is an optimisation, never a hard requirement for upload.
  }
}

/**
 * Upload an image to a Storage bucket and compress it to ~1MB via the edge
 * function. Returns the stored fileId (unchanged by compression).
 */
export async function uploadImageToStorage(
  bucketId: string,
  file: File,
  permissions: string[] = [Permission.read(Role.any())],
): Promise<string> {
  const res = await storage.createFile({
    bucketId,
    fileId: ID.unique(),
    file,
    permissions,
  });
  await compressStoredImage(bucketId, res.$id);
  return res.$id;
}

/**
 * Delete a file from a Storage bucket. Best-effort: a failure here (e.g. the
 * file was already removed) should never block updating the parent document.
 */
export async function deleteImageFromStorage(
  bucketId: string,
  fileId: string,
): Promise<void> {
  try {
    await storage.deleteFile({ bucketId, fileId });
  } catch {
    // Orphaned files are harmless; don't fail the surrounding operation.
  }
}
