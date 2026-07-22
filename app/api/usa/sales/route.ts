import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { inventoryLots, sales } from "../../../../db/schema";
import referenceSales from "../../../../lib/reference-sales.json";
import type { InvoiceItem, NewSale } from "../../../../lib/types";

const LOAD_STATUSES = new Set(["OK", "PAS", "AJUSTE POR MERCADO", "AJUSTE POR CALIDAD", "USDA REQUESTED"]);

async function seedReferenceData() {
  const db = getDb();
  const existing = await db.select({ id: sales.id }).from(sales).where(eq(sales.organizationCode, "USA")).limit(1);
  if (existing.length) return;

  const seedRows = referenceSales.map((row) => ({
      organizationCode: "USA",
      operationType: "DIRECT_RESALE",
      saleDate: row.saleDate,
      customer: row.customer,
      sellerName: null,
      purchaseOrder: row.purchaseOrder,
      warehouse: row.warehouse,
      pickupNumber: row.pickupNumber,
      boxes: row.boxes,
      product: row.product,
      presentation: null,
      size: row.size,
      label: row.label,
      purchasePrice: row.purchasePrice,
      salePrice: row.salePrice,
      profit: row.profit,
      shipDate: row.shipDate,
      pickupDate: row.pickupDate,
      total: row.total,
      dueDate: row.dueDate,
      loadStatus: row.loadStatus ?? "OK",
      paymentStatus: row.paymentStatus ?? "PENDIENTE",
      invoiceNumber: row.invoiceNumber,
    }));
  for (let index = 0; index < seedRows.length; index += 4) {
    await db.insert(sales).values(seedRows.slice(index, index + 4));
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No fue posible completar la operación.";
}

export async function GET() {
  try {
    await seedReferenceData();
    const rows = await getDb()
      .select()
      .from(sales)
      .where(eq(sales.organizationCode, "USA"))
      .orderBy(desc(sales.saleDate), desc(sales.id));
    return Response.json({ sales: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<NewSale>;
    if (!payload.saleDate || !payload.customer?.trim() || !payload.warehouse?.trim() || !payload.pickupNumber?.trim() || !payload.product?.trim()) {
      return Response.json({ error: "Completa fecha, cliente, bodega, PU# y producto." }, { status: 400 });
    }
    const boxes = Number(payload.boxes ?? 0);
    const salePrice = payload.salePrice == null ? null : Number(payload.salePrice);
    if (!Number.isFinite(boxes) || boxes <= 0) {
      return Response.json({ error: "La cantidad de cajas debe ser mayor que cero." }, { status: 400 });
    }
    const total = salePrice == null || !Number.isFinite(salePrice) ? null : boxes * salePrice;
    const operationType = payload.operationType === "IMPORTED_INVENTORY" ? "IMPORTED_INVENTORY" : "DIRECT_RESALE";
    let purchasePrice = payload.purchasePrice == null ? null : Number(payload.purchasePrice);
    let inventoryLotId: number | null = null;
    if (operationType === "IMPORTED_INVENTORY") {
      inventoryLotId = Number(payload.inventoryLotId);
      if (!Number.isInteger(inventoryLotId) || inventoryLotId <= 0) {
        return Response.json({ error: "Selecciona una partida disponible del inventario." }, { status: 400 });
      }
      const [lot] = await getDb().select().from(inventoryLots).where(and(
        eq(inventoryLots.id, inventoryLotId),
        eq(inventoryLots.organizationCode, "USA"),
        gte(inventoryLots.availableBoxes, boxes),
      )).limit(1);
      if (!lot) return Response.json({ error: "La partida seleccionada ya no tiene suficientes cajas disponibles." }, { status: 409 });
      purchasePrice = lot.unitCost;
    }
    const profit = total == null || purchasePrice == null ? null : (salePrice! - purchasePrice) * boxes;
    const [created] = await getDb().insert(sales).values({
      organizationCode: "USA",
      operationType,
      supplier: payload.supplier?.trim() || null,
      inventoryLotId,
      saleDate: payload.saleDate,
      customer: payload.customer.trim(),
      sellerName: payload.sellerName?.trim() || null,
      purchaseOrder: payload.purchaseOrder?.trim() || null,
      warehouse: payload.warehouse.trim(),
      pickupNumber: payload.pickupNumber.trim(),
      boxes,
      product: payload.product.trim(),
      presentation: payload.presentation?.trim() || null,
      size: payload.size?.trim() || null,
      label: payload.label?.trim() || null,
      purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : null,
      salePrice: Number.isFinite(salePrice) ? salePrice : null,
      profit,
      shipDate: payload.shipDate || null,
      pickupDate: payload.pickupDate || null,
      total,
      dueDate: payload.dueDate || null,
      loadStatus: payload.loadStatus?.trim() || "OK",
      paymentStatus: "PENDIENTE",
      invoiceNumber: payload.invoiceNumber?.trim() || null,
    }).returning();
    if (inventoryLotId) {
      await getDb().update(inventoryLots)
        .set({ availableBoxes: sql`${inventoryLots.availableBoxes} - ${boxes}` })
        .where(and(eq(inventoryLots.id, inventoryLotId), eq(inventoryLots.organizationCode, "USA"), gte(inventoryLots.availableBoxes, boxes)));
    }
    return Response.json({ sale: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Venta inválida." }, { status: 400 });
    if (payload.editSale === true) {
      const db = getDb();
      const [existing] = await db.select().from(sales).where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"))).limit(1);
      if (!existing) return Response.json({ error: "No se encontró la venta." }, { status: 404 });
      if (existing.invoiceNumber) return Response.json({ error: "Una venta facturada ya no puede editarse." }, { status: 409 });

      const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
      const saleDate = text(payload.saleDate);
      const customer = text(payload.customer);
      const warehouse = text(payload.warehouse);
      const pickupNumber = text(payload.pickupNumber);
      const product = text(payload.product);
      if (!saleDate || !customer || !warehouse || !pickupNumber || !product) {
        return Response.json({ error: "Completa fecha, cliente, bodega, PU# y producto." }, { status: 400 });
      }
      const boxes = Number(payload.boxes);
      const salePrice = Number(payload.salePrice);
      if (!Number.isInteger(boxes) || boxes <= 0) return Response.json({ error: "La cantidad de cajas debe ser un entero mayor que cero." }, { status: 400 });
      if (!Number.isFinite(salePrice) || salePrice < 0) return Response.json({ error: "Ingresa un precio de venta válido." }, { status: 400 });

      const operationType = payload.operationType === "IMPORTED_INVENTORY" ? "IMPORTED_INVENTORY" : "DIRECT_RESALE";
      if (operationType !== existing.operationType) return Response.json({ error: "El tipo de operación de una venta existente no puede cambiarse." }, { status: 400 });

      let inventoryLotId: number | null = null;
      let purchasePrice = payload.purchasePrice == null || payload.purchasePrice === "" ? null : Number(payload.purchasePrice);
      if (operationType === "DIRECT_RESALE" && (purchasePrice == null || !Number.isFinite(purchasePrice) || purchasePrice < 0)) {
        return Response.json({ error: "Ingresa un precio de compra válido." }, { status: 400 });
      }
      if (operationType === "IMPORTED_INVENTORY") {
        inventoryLotId = Number(payload.inventoryLotId);
        if (!Number.isInteger(inventoryLotId) || inventoryLotId <= 0) return Response.json({ error: "Selecciona una partida disponible del inventario." }, { status: 400 });
        const [lot] = await db.select().from(inventoryLots).where(and(eq(inventoryLots.id, inventoryLotId), eq(inventoryLots.organizationCode, "USA"))).limit(1);
        if (!lot) return Response.json({ error: "No se encontró la partida de inventario seleccionada." }, { status: 404 });
        const usableBoxes = lot.availableBoxes + (existing.inventoryLotId === inventoryLotId ? existing.boxes : 0);
        if (usableBoxes < boxes) return Response.json({ error: `La partida sólo tiene ${usableBoxes} cajas disponibles para esta venta.` }, { status: 409 });
        purchasePrice = lot.unitCost;

        if (existing.inventoryLotId === inventoryLotId) {
          await db.update(inventoryLots).set({ availableBoxes: usableBoxes - boxes }).where(and(eq(inventoryLots.id, inventoryLotId), eq(inventoryLots.organizationCode, "USA")));
        } else {
          await db.update(inventoryLots).set({ availableBoxes: sql`${inventoryLots.availableBoxes} - ${boxes}` }).where(and(eq(inventoryLots.id, inventoryLotId), eq(inventoryLots.organizationCode, "USA"), gte(inventoryLots.availableBoxes, boxes)));
          if (existing.inventoryLotId) {
            await db.update(inventoryLots).set({ availableBoxes: sql`${inventoryLots.availableBoxes} + ${existing.boxes}` }).where(and(eq(inventoryLots.id, existing.inventoryLotId), eq(inventoryLots.organizationCode, "USA")));
          }
        }
      }

      const total = boxes * salePrice;
      const profit = purchasePrice == null ? null : (salePrice - purchasePrice) * boxes;
      const pickupDate = text(payload.pickupDate) || null;
      const dueDate = pickupDate ? new Date(new Date(`${pickupDate}T00:00:00Z`).getTime() + 21 * 86400000).toISOString().slice(0, 10) : null;
      const [sale] = await db.update(sales).set({
        supplier: text(payload.supplier) || null,
        inventoryLotId,
        saleDate,
        customer,
        sellerName: text(payload.sellerName) || null,
        purchaseOrder: text(payload.purchaseOrder) || null,
        warehouse,
        pickupNumber,
        boxes,
        product,
        presentation: text(payload.presentation) || null,
        size: text(payload.size) || null,
        label: text(payload.label) || null,
        purchasePrice,
        salePrice,
        profit,
        shipDate: null,
        pickupDate,
        total,
        dueDate,
        invoiceItems: null,
      }).where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"), isNull(sales.invoiceNumber))).returning();
      if (!sale) return Response.json({ error: "La venta fue facturada mientras se editaba y ya no puede modificarse." }, { status: 409 });
      return Response.json({ sale });
    }
    if (Array.isArray(payload.items)) {
      const items = payload.items as InvoiceItem[];
      const validItems = items.length > 1 && items.length <= 25 && items.every((item) => typeof item.product === "string" && item.product.trim() && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 && Number.isFinite(Number(item.unitPrice)) && Number(item.unitPrice) >= 0);
      if (!validItems) return Response.json({ error: "Revisa los productos, bultos/cajas y precios de la carga." }, { status: 400 });
      const [existing] = await getDb().select().from(sales).where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"))).limit(1);
      if (!existing) return Response.json({ error: "No se encontró la venta." }, { status: 404 });
      const normalized = items.map((item) => ({ product: item.product.trim(), presentation: item.presentation?.trim() || "", size: item.size?.trim() || "", label: item.label?.trim() || "", quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
      const boxes = normalized.reduce((sum, item) => sum + item.quantity, 0);
      const total = normalized.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const profit = existing.purchasePrice == null ? null : total - existing.purchasePrice * boxes;
      const [sale] = await getDb().update(sales).set({ invoiceItems: JSON.stringify(normalized), boxes, salePrice: null, total, profit, product: `${normalized[0].product} + ${normalized.length - 1} partida(s)`, presentation: null, size: null, label: null })
        .where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"))).returning();
      return Response.json({ sale });
    }
    if (typeof payload.loadStatus === "string") {
      const loadStatus = payload.loadStatus.trim().toUpperCase();
      if (!LOAD_STATUSES.has(loadStatus)) return Response.json({ error: "Estatus inválido." }, { status: 400 });
      const now = new Date().toISOString();
      if (loadStatus === "PAS") {
        const pasReviewDays = Number(payload.pasReviewDays);
        if (!Number.isInteger(pasReviewDays) || pasReviewDays <= 0 || pasReviewDays > 365) {
          return Response.json({ error: "Indica de 1 a 365 días para revisar el PAS." }, { status: 400 });
        }
        const requestedStart = typeof payload.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.startDate) ? payload.startDate : localDateKey();
        const start = new Date(`${requestedStart}T00:00:00Z`);
        start.setUTCDate(start.getUTCDate() + pasReviewDays);
        const [sale] = await getDb().update(sales).set({
          loadStatus,
          statusUpdatedAt: now,
          pasReviewDays,
          pasReviewDueDate: start.toISOString().slice(0, 10),
        }).where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"))).returning();
        if (!sale) return Response.json({ error: "No se encontró la venta." }, { status: 404 });
        return Response.json({ sale });
      }
      const [sale] = await getDb().update(sales).set({
        loadStatus,
        statusUpdatedAt: now,
        pasReviewDays: null,
        pasReviewDueDate: null,
        usdaInspectionStatus: loadStatus === "USDA REQUESTED" ? "PENDING" : null,
        usdaInspectionObjectKey: loadStatus === "USDA REQUESTED" ? undefined : null,
        usdaInspectionFileName: loadStatus === "USDA REQUESTED" ? undefined : null,
        usdaInspectionContentType: loadStatus === "USDA REQUESTED" ? undefined : null,
        usdaInspectionUploadedAt: loadStatus === "USDA REQUESTED" ? undefined : null,
      }).where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"))).returning();
      if (!sale) return Response.json({ error: "No se encontró la venta." }, { status: 404 });
      return Response.json({ sale });
    }
    const pickupDate = typeof payload.pickupDate === "string" && payload.pickupDate ? payload.pickupDate : null;
    const dueDate = pickupDate ? new Date(new Date(`${pickupDate}T00:00:00Z`).getTime() + 21 * 86400000).toISOString().slice(0, 10) : null;
    const [sale] = await getDb().update(sales).set({ pickupDate, dueDate })
      .where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"))).returning();
    if (!sale) return Response.json({ error: "No se encontró la venta." }, { status: 404 });
    return Response.json({ sale });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

function localDateKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
