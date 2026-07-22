import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { coldStorages } from "../../../../db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const rows = await getDb().select().from(coldStorages)
      .where(eq(coldStorages.organizationCode, "USA"))
      .orderBy(asc(coldStorages.name));
    return Response.json({ coldStorages: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible consultar los cold storages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const name = clean(payload.name);
    const address = clean(payload.address);
    const phone = clean(payload.phone).replace(/\D/g, "");
    if (!name || !address || phone.length !== 10) {
      return Response.json({ error: "Completa nombre, dirección y teléfono de 10 dígitos." }, { status: 400 });
    }
    const [coldStorage] = await getDb().insert(coldStorages).values({ organizationCode: "USA", name, address, phone }).returning();
    return Response.json({ coldStorage }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible guardar el cold storage." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const id = Number(payload.id);
    const name = clean(payload.name);
    const address = clean(payload.address);
    const phone = clean(payload.phone).replace(/\D/g, "");
    if (!Number.isInteger(id) || id <= 0 || !name || !address || phone.length !== 10) {
      return Response.json({ error: "Completa nombre, dirección y teléfono de 10 dígitos." }, { status: 400 });
    }
    const [coldStorage] = await getDb().update(coldStorages)
      .set({ name, address, phone })
      .where(and(eq(coldStorages.id, id), eq(coldStorages.organizationCode, "USA")))
      .returning();
    if (!coldStorage) {
      return Response.json({ error: "No se encontró la bodega." }, { status: 404 });
    }
    return Response.json({ coldStorage });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible actualizar la bodega." }, { status: 500 });
  }
}
