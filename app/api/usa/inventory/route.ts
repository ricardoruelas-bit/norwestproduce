import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { inventoryLots } from "../../../../db/schema";

export async function GET() {
  try {
    const lots = await getDb().select().from(inventoryLots).where(and(
      eq(inventoryLots.organizationCode, "USA"),
      gt(inventoryLots.availableBoxes, 0),
    )).orderBy(asc(inventoryLots.product), asc(inventoryLots.receivedDate));
    return Response.json({ lots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible consultar el inventario.";
    return Response.json({ error: message }, { status: 500 });
  }
}
