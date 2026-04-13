import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/**
 * Sniff the real content type from a base64 payload's magic bytes. This catches
 * the case where an uploaded file's extension lies about its contents.
 */
function sniffContentType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  // %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return "application/pdf";
  // \x89PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  // JPEG FFD8FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  return null;
}

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

  // Prefer sniffed magic bytes over the extension — the extension can lie
  // (e.g. AI chat dropping a PDF with a .png filename).
  const sniffed = sniffContentType(buffer);
  const extMime = MIME_BY_EXT[ext] || "application/octet-stream";
  const contentType = sniffed || extMime;

  // Correct the filename extension if the sniff disagrees with what was sent
  let storedName = fileName;
  if (sniffed && sniffed !== extMime) {
    const correctExt = sniffed === "application/pdf" ? ".pdf" : sniffed === "image/png" ? ".png" : ".jpg";
    storedName = fileName.replace(/\.[^.]+$/, correctExt);
  }

  const blob = await put(`${blobPath}/${storedName}`, buffer, {
    access: "public",
    contentType,
  });

  return { url: blob.url, name: storedName, size: buffer.length };
}

/**
 * Detect if this is a JSON base64 upload request.
 */
export function isBase64Upload(request: Request): boolean {
  const ct = request.headers.get("content-type") || "";
  return ct.includes("application/json");
}
