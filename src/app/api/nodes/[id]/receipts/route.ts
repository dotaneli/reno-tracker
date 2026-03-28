import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess } from "@/lib/dal";
import { json, errorResponse, handleError } from "@/lib/api";
import { put, del } from "@vercel/blob";
import { isBase64Upload, uploadBase64File } from "@/lib/file-upload";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id);
    const receipts = await prisma.receipt.findMany({ where: { nodeId: id }, orderBy: { uploadedAt: "desc" } });
    return json(receipts);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);

    let fileUrl: string, fileName: string, fileSize: number;

    if (isBase64Upload(request)) {
      // JSON body with base64-encoded file (for LLM agents)
      const body = await request.json();
      if (!body.fileName || !body.fileBase64) return errorResponse("fileName and fileBase64 are required", 400);
      const result = await uploadBase64File(body.fileName, body.fileBase64, `receipts/${id}`);
      fileUrl = result.url;
      fileName = result.name;
      fileSize = result.size;
    } else {
      // Multipart FormData (existing browser upload)
      const fd = await request.formData();
      const file = fd.get("file") as File | null;
      if (!file) return errorResponse("file is required", 400);
      const blob = await put(`receipts/${id}/${file.name}`, file, { access: "public" });
      fileUrl = blob.url;
      fileName = file.name;
      fileSize = file.size;
    }

    const receipt = await prisma.receipt.create({ data: { fileUrl, fileName, fileSize, nodeId: id } });
    return json(receipt, 201);
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);
    const { receiptId } = await request.json();
    if (!receiptId) return errorResponse("receiptId is required", 400);
    const r = await prisma.receipt.findUnique({ where: { id: receiptId } });
    if (r) { await del(r.fileUrl).catch(() => {}); await prisma.receipt.delete({ where: { id: receiptId } }); }
    return new Response(null, { status: 204 });
  } catch (err) { return handleError(err); }
}
