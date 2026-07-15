// lib/blob.ts
import { put, del } from "@vercel/blob";
import { ApiError } from "@/utils/ApiError";
    
/**
 * Uploads a file to Vercel Blob storage under a structured path:
 * org-{organizationId}/user-{userId}/{timestamp}-{filename}
 *
 * @param file - File to upload
 * @param organizationId - Organization the file belongs to
 * @param userId - User uploading the file
 * @returns Public URL and pathname of the uploaded blob
 */
export async function uploadToBlob(
  file: File,
  organizationId: string,
  userId: string,
): Promise<{ url: string; pathname: string }> {
  try {
    // Sanitize filename (replace spaces) and prefix with timestamp to avoid collisions
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    // Namespace path by org and user so files stay organized and isolated
    const pathname = `org-${organizationId}/user-${userId}/${filename}`;

    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  } catch (error) {
    // Log actual error for debugging, but throw a clean ApiError for the caller
    console.error("Blob upload error:", error);
    throw new ApiError(500, "Failed to upload file");
  }
}

/**
 * Deletes a file from Vercel Blob storage using its public URL.
 *
 * @param url - Full blob URL to delete
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });
  } catch (error) {
    console.error("Blob delete error:", error);
    throw new ApiError(500, "Failed to delete file");
  }
}