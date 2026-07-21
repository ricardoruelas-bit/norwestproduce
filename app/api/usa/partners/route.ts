import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { businessPartners } from "../../../../db/schema";
import type { NewBusinessPartner } from "../../../../lib/types";

const requiredFields: Array<keyof NewBusinessPartner> = [
  "name", "taxId", "blueBookNumber", "dunsNumber", "street", "exteriorNumber",
  "stateCode", "stateName", "city", "postalCode", "contactName", "contactEmail", "contactPhone",
];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const partners = await getDb().select().from(businessPartners)
      .where(eq(businessPartners.organizationCode, "USA"))
      .orderBy(asc(businessPartners.partnerType), asc(businessPartners.name));
    return Response.json({ partners });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible consultar los catálogos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<NewBusinessPartner>;
    const partnerType = payload.partnerType === "CUSTOMER" ? "CUSTOMER" : payload.partnerType === "SUPPLIER" ? "SUPPLIER" : null;
    if (!partnerType) return Response.json({ error: "Selecciona si el registro es proveedor o cliente." }, { status: 400 });
    const missing = requiredFields.some((field) => !clean(payload[field]));
    if (missing) return Response.json({ error: "Completa todos los campos obligatorios para continuar." }, { status: 400 });
    const email = clean(payload.contactEmail);
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Ingresa un correo válido." }, { status: 400 });

    const [created] = await getDb().insert(businessPartners).values({
      organizationCode: "USA",
      partnerType,
      name: clean(payload.name),
      taxId: clean(payload.taxId),
      blueBookNumber: clean(payload.blueBookNumber),
      dunsNumber: clean(payload.dunsNumber),
      street: clean(payload.street),
      exteriorNumber: clean(payload.exteriorNumber),
      interiorNumber: clean(payload.interiorNumber) || null,
      stateCode: clean(payload.stateCode),
      stateName: clean(payload.stateName),
      city: clean(payload.city),
      postalCode: clean(payload.postalCode),
      contactName: clean(payload.contactName),
      contactEmail: email,
      contactPhone: clean(payload.contactPhone),
    }).returning();
    return Response.json({ partner: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible guardar el registro." }, { status: 500 });
  }
}
