import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { inventoryLots, sales } from "../../../../db/schema";
import referenceSales from "../../../../lib/reference-sales.json";
import type { NewSale } from "../../../../lib/types";

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
    const pickupDate = typeof payload.pickupDate === "string" && payload.pickupDate ? payload.pickupDate : null;
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Venta inválida." }, { status: 400 });
    const dueDate = pickupDate ? new Date(new Date(`${pickupDate}T00:00:00Z`).getTime() + 21 * 86400000).toISOString().slice(0, 10) : null;
    const [sale] = await getDb().update(sales).set({ pickupDate, dueDate })
      .where(and(eq(sales.id, id), eq(sales.organizationCode, "USA"))).returning();
    if (!sale) return Response.json({ error: "No se encontró la venta." }, { status: 404 });
    return Response.json({ sale });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
