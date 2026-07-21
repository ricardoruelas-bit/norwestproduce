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
    const boxesPerPallet = payload.boxesPerPallet === "" || payload.boxesPerPallet == null ? null : Number(payload.boxesPerPallet);
    const palletsPerLoad = payload.palletsPerLoad === "" || payload.palletsPerLoad == null ? null : Number(payload.palletsPerLoad);
    const exchangeRate = payload.exchangeRate === "" || payload.exchangeRate == null ? null : Number(payload.exchangeRate);
    const rawCurrencies = payload.costCurrencies && typeof payload.costCurrencies === "object" ? payload.costCurrencies as Record<string, unknown> : {};
    const currency = (key: string) => rawCurrencies[key] === "MXN" ? "MXN" : "USD";
    const toUsd = (value: number, selectedCurrency: string) => selectedCurrency === "MXN" ? value / (exchangeRate || 0) : value;
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
          return { concept: clean(expense.concept), amount: Number(expense.amount) || 0, currency: expense.currency === "MXN" ? "MXN" : "USD" };
        }).filter((item) => item.concept || item.amount)
      : [];
    if (!clean(payload.receivedDate) || !clean(payload.warehouse) || !clean(payload.product) || !Number.isInteger(totalBoxes) || totalBoxes <= 0) {
      return Response.json({ error: "Completa fecha de entrada, bodega, producto y cajas recibidas." }, { status: 400 });
    }
    const values = [purchasePrice, freightCost, mexicoCustomsCost, usCustomsCost, overweightCost, redLightCost, coldStorageCost, ...additionalExpenses.map((item) => item.amount)];
    if (values.some((value) => !Number.isFinite(value) || value < 0)) return Response.json({ error: "Ingresa importes válidos en los costos de importación." }, { status: 400 });
    if ((!exchangeRate || !Number.isFinite(exchangeRate) || exchangeRate <= 0) && [...Object.keys(rawCurrencies).map(currency), ...additionalExpenses.map((item) => item.currency)].includes("MXN")) {
      return Response.json({ error: "Ingresa un tipo de cambio válido para convertir los gastos en MXN." }, { status: 400 });
    }
    if ((boxesPerPallet != null && (!Number.isInteger(boxesPerPallet) || boxesPerPallet <= 0)) || (palletsPerLoad != null && (!Number.isInteger(palletsPerLoad) || palletsPerLoad <= 0))) {
      return Response.json({ error: "Cajas por pallet y pallets por carga deben ser números enteros mayores que cero." }, { status: 400 });
    }
    const totalImportCost = toUsd(purchasePrice, currency("purchasePrice")) * totalBoxes
      + toUsd(freightCost, currency("freightCost"))
      + toUsd(mexicoCustomsCost, currency("mexicoCustomsCost"))
      + toUsd(usCustomsCost, currency("usCustomsCost"))
      + toUsd(overweightCost, currency("overweightCost"))
      + toUsd(redLightCost, currency("redLightCost"))
      + toUsd(coldStorageCost, currency("coldStorageCost"))
      + additionalExpenses.reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0);
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
      boxesPerPallet,
      palletsPerLoad,
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
      costCurrencies: JSON.stringify(Object.fromEntries(["purchasePrice", "freightCost", "mexicoCustomsCost", "usCustomsCost", "overweightCost", "redLightCost", "coldStorageCost"].map((key) => [key, currency(key)]))),
      exchangeRate,
      totalImportCost,
    }).returning();
    return Response.json({ lot }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible registrar la entrada.";
    return Response.json({ error: message }, { status: 500 });
  }
}
