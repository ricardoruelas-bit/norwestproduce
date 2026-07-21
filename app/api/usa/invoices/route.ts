import { and, eq, isNotNull } from "drizzle-orm";
import { getBucket, getDb } from "../../../../db";
import { sales } from "../../../../db/schema";
import type { InvoiceItem } from "../../../../lib/types";

const MAX_BOL_BYTES = 10 * 1024 * 1024;
const ALLOWED_BOL_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function validItems(value: unknown): value is InvoiceItem[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 25 && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.product === "string" && row.product.trim().length > 0
      && Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0
      && Number.isFinite(Number(row.unitPrice)) && Number(row.unitPrice) >= 0;
  });
}

function safeDownloadName(value: string) {
  return value.replace(/[\r\n"\\]/g, "_");
}

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    const formData = await request.formData();
    const saleId = Number(formData.get("saleId"));
    const bol = formData.get("bol");
    const rawItems = formData.get("items");
    if (!Number.isInteger(saleId) || saleId <= 0) return Response.json({ error: "Venta inválida." }, { status: 400 });
    if (!(bol instanceof File) || bol.size === 0) return Response.json({ error: "Adjunta el BOL de la bodega para poder facturar." }, { status: 400 });
    if (bol.size > MAX_BOL_BYTES) return Response.json({ error: "El BOL no puede exceder 10 MB." }, { status: 400 });
    if (!ALLOWED_BOL_TYPES.has(bol.type)) return Response.json({ error: "El BOL debe ser PDF, JPG, PNG o WEBP." }, { status: 400 });
    if (typeof rawItems !== "string") return Response.json({ error: "Faltan las partidas de la factura." }, { status: 400 });
    const items = JSON.parse(rawItems) as unknown;
    if (!validItems(items)) return Response.json({ error: "Revisa productos, cantidades y precios de la factura." }, { status: 400 });

    const db = getDb();
    const [existing] = await db.select().from(sales).where(and(eq(sales.id, saleId), eq(sales.organizationCode, "USA"))).limit(1);
    if (!existing) return Response.json({ error: "No se encontró la venta." }, { status: 404 });
    if (existing.invoiceNumber) return Response.json({ error: "Esta venta ya fue facturada." }, { status: 409 });

    const invoiceRows = await db.select({ invoiceNumber: sales.invoiceNumber }).from(sales)
      .where(and(eq(sales.organizationCode, "USA"), isNotNull(sales.invoiceNumber)));
    const highest = invoiceRows.reduce((max, row) => Math.max(max, Number(String(row.invoiceNumber || "").match(/\d+/)?.[0] || 0)), 0);
    const invoiceNumber = String(highest + 1).padStart(4, "0");
    const extension = bol.type === "application/pdf" ? "pdf" : bol.type.split("/")[1] || "bin";
    uploadedKey = `usa/bol/${saleId}/${crypto.randomUUID()}.${extension}`;
    await getBucket().put(uploadedKey, bol.stream(), { httpMetadata: { contentType: bol.type }, customMetadata: { saleId: String(saleId), originalName: bol.name } });

    const normalized = items.map((item) => ({
      product: item.product.trim(), presentation: item.presentation?.trim() || "", size: item.size?.trim() || "", label: item.label?.trim() || "",
      quantity: Number(item.quantity), unitPrice: Number(item.unitPrice),
    }));
    const totalBoxes = normalized.reduce((sum, item) => sum + item.quantity, 0);
    const total = normalized.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const [updated] = await db.update(sales).set({
      invoiceNumber,
      invoiceItems: JSON.stringify(normalized),
      bolObjectKey: uploadedKey,
      bolFileName: bol.name,
      bolContentType: bol.type,
      bolUploadedAt: new Date().toISOString(),
      boxes: totalBoxes,
      product: normalized.length === 1 ? normalized[0].product : `${normalized[0].product} + ${normalized.length - 1} partida(s)`,
      presentation: normalized.length === 1 ? normalized[0].presentation || null : null,
      size: normalized.length === 1 ? normalized[0].size || null : null,
      label: normalized.length === 1 ? normalized[0].label || null : null,
      salePrice: normalized.length === 1 ? normalized[0].unitPrice : null,
      total,
    }).where(and(eq(sales.id, saleId), eq(sales.organizationCode, "USA"))).returning();
    return Response.json({ sale: updated }, { status: 201 });
  } catch (error) {
    if (uploadedKey) await getBucket().delete(uploadedKey).catch(() => undefined);
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo generar la factura." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const saleId = Number(new URL(request.url).searchParams.get("saleId"));
    if (!Number.isInteger(saleId) || saleId <= 0) return Response.json({ error: "Venta inválida." }, { status: 400 });
    const [sale] = await getDb().select({ key: sales.bolObjectKey, name: sales.bolFileName, type: sales.bolContentType })
      .from(sales).where(and(eq(sales.id, saleId), eq(sales.organizationCode, "USA"))).limit(1);
    if (!sale?.key) return Response.json({ error: "Esta factura no tiene un BOL adjunto." }, { status: 404 });
    const object = await getBucket().get(sale.key);
    if (!object) return Response.json({ error: "No se encontró el archivo BOL." }, { status: 404 });
    return new Response(object.body, { headers: {
      "Content-Type": sale.type || object.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeDownloadName(sale.name || "BOL")}"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo abrir el BOL." }, { status: 500 });
  }
}
