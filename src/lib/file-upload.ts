import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

/**
 * Parse a base64 file upload from JSON body.
 * Returns a Vercel Blob result or throws an error.
 */
export async function uploadBase64File(
  fileName: string,
  fileBase64: string,
  blobPath: string
): Promise<{ url: string; name: string; size: number }> {
  // Validate extension
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`);
  }

  // Decode and validate size
  const buffer = Buffer.from(fileBase64, "base64");
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Upload to Vercel Blob
  const blob = await put(`${blobPath}/${fileName}`, buffer, { access: "public" });

  return { url: blob.url, name: fileName, size: buffer.length };
}

/**
 * Detect if this is a JSON base64 upload request.
 */
export function isBase64Upload(request: Request): boolean {
  const ct = request.headers.get("content-type") || "";
  return ct.includes("application/json");
}
