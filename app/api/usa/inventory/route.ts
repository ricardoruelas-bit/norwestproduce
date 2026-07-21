import { and, asc, desc, eq, gt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { inventoryLots } from "../../../../db/schema";

export async function GET(request: Request) {
  try {
    const includeAll = new URL(request.url).searchParams.get("all") === "1";
    const lots = await getDb().select().from(inventoryLots).where(includeAll
      ? eq(inventoryLots.organizationCode, "USA")
      : and(eq(inventoryLots.organizationCode, "USA"), gt(inventoryLots.availableBoxes, 0)))
      .orderBy(desc(inventoryLots.receivedDate), asc(inventoryLots.product));
    return Response.json({ lots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible consultar el inventario.";
    return Response.json({ error: message }, { status: 500 });
  }
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const totalBoxes = Number(payload.totalBoxes);
    const amount = (key: string) => payload[key] === "" || payload[key] == null ? 0 : Number(payload[key]);
    const purchasePrice = amount("purchasePrice");
    const freightCost = amount("freightCost");
    const mexicoCustomsCost = amount("mexicoCustomsCost");
    const usCustomsCost = amount("usCustomsCost");
    const overweightCost = amount("overweightCost");
    const redLightCost = amount("redLightCost");
    const coldStorageCost = amount("coldStorageCost");
    const additionalExpenses = Array.isArray(payload.additionalExpenses)
      ? payload.additionalExpenses.map((item) => {
          const expense = item as Record<string, unknown>;
          return { concept: clean(expense.concept), amount: Number(expense.amount) || 0 };
        }).filter((item) => item.concept || item.amount)
      : [];
    if (!clean(payload.receivedDate) || !clean(payload.warehouse) || !clean(payload.product) || !Number.isInteger(totalBoxes) || totalBoxes <= 0) {
      return Response.json({ error: "Completa fecha de entrada, bodega, producto y cajas recibidas." }, { status: 400 });
    }
    const values = [purchasePrice, freightCost, mexicoCustomsCost, usCustomsCost, overweightCost, redLightCost, coldStorageCost, ...additionalExpenses.map((item) => item.amount)];
    if (values.some((value) => !Number.isFinite(value) || value < 0)) return Response.json({ error: "Ingresa importes válidos en los costos de importación." }, { status: 400 });
    const totalImportCost = purchasePrice * totalBoxes + freightCost + mexicoCustomsCost + usCustomsCost + overweightCost + redLightCost + coldStorageCost + additionalExpenses.reduce((sum, item) => sum + item.amount, 0);
    const unitCost = totalImportCost / totalBoxes;
    const [lot] = await getDb().insert(inventoryLots).values({
      organizationCode: "USA",
      receivedDate: clean(payload.receivedDate),
      supplier: clean(payload.supplier) || null,
      warehouse: clean(payload.warehouse),
      pickupNumber: clean(payload.pickupNumber) || null,
      product: clean(payload.product),
      presentation: clean(payload.presentation) || null,
      size: clean(payload.size) || null,
      label: clean(payload.label) || null,
      totalBoxes,
      availableBoxes: totalBoxes,
      unitCost,
      purchasePrice,
      freightCost,
      mexicoCustomsCost,
      usCustomsCost,
      overweightCost,
      redLightCost,
      coldStorage: clean(payload.coldStorage) || clean(payload.warehouse) || null,
      coldStorageCost,
      additionalExpenses: JSON.stringify(additionalExpenses),
      totalImportCost,
    }).returning();
    return Response.json({ lot }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible registrar la entrada.";
    return Response.json({ error: message }, { status: 500 });
  }
}
