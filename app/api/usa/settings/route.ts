import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companySettings } from "../../../../db/schema";

const defaults = {
  id: 1,
  organizationCode: "USA",
  legalName: "NORWEST PRODUCE LLC",
  street: "710 LAUREL AVENUE",
  city: "MCALLEN",
  state: "TX",
  postalCode: "78501",
  blueBookNumber: "",
  pacaNumber: "",
  dunsNumber: "",
  taxId: "",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getOrCreateSettings() {
  const db = getDb();
  const [existing] = await db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(companySettings).values(defaults).returning();
  return created;
}

export async function GET() {
  try {
    return Response.json({ settings: await getOrCreateSettings() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible consultar la configuración." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (!clean(payload.legalName)) return Response.json({ error: "El nombre legal de la empresa es obligatorio." }, { status: 400 });
    await getOrCreateSettings();
    const [updated] = await getDb().update(companySettings).set({
      legalName: clean(payload.legalName),
      street: clean(payload.street),
      city: clean(payload.city),
      state: clean(payload.state),
      postalCode: clean(payload.postalCode),
      blueBookNumber: clean(payload.blueBookNumber),
      pacaNumber: clean(payload.pacaNumber),
      dunsNumber: clean(payload.dunsNumber),
      taxId: clean(payload.taxId),
      updatedAt: new Date().toISOString(),
    }).where(eq(companySettings.id, 1)).returning();
    return Response.json({ settings: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible guardar la configuración." }, { status: 500 });
  }
}
