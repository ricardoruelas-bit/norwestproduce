import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { businessPartners } from "../../../../db/schema";
import type { NewBusinessPartner } from "../../../../lib/types";

const requiredFields: Array<keyof NewBusinessPartner> = [
  "name", "stateCode", "stateName", "city", "postalCode", "contactName", "contactEmail", "contactPhone",
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
    const payload = (await request.json()) as Partial<NewBusinessPartner> & { alsoOppositeType?: boolean };
    const partnerType = payload.partnerType === "CUSTOMER" ? "CUSTOMER" : payload.partnerType === "SUPPLIER" ? "SUPPLIER" : null;
    if (!partnerType) return Response.json({ error: "Selecciona si el registro es proveedor o cliente." }, { status: 400 });
    const missing = requiredFields.some((field) => !clean(payload[field]));
    if (missing) return Response.json({ error: "Completa todos los campos obligatorios para continuar." }, { status: 400 });
    const email = clean(payload.contactEmail);
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Ingresa un correo válido." }, { status: 400 });
    const phone = clean(payload.contactPhone).replace(/\D/g, "");
    if (phone.length !== 10) return Response.json({ error: "El teléfono debe contener exactamente 10 dígitos." }, { status: 400 });
    if ((partnerType === "CUSTOMER" || payload.alsoOppositeType) && !clean(payload.assignedSeller)) return Response.json({ error: "Selecciona el vendedor de Norwest para el cliente." }, { status: 400 });
    const profitPercentage = Number(payload.profitPercentage ?? 0);
    if (!Number.isFinite(profitPercentage) || profitPercentage < 0 || profitPercentage > 100) return Response.json({ error: "El porcentaje de utilidad debe estar entre 0 y 100." }, { status: 400 });

    const partnerValues = {
      organizationCode: "USA",
      partnerType,
      name: clean(payload.name),
      pacaNumber: clean(payload.pacaNumber),
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
      contactPhone: phone,
      assignedSeller: clean(payload.assignedSeller) || null,
      profitPercentage,
    };
    const db = getDb();
    if (payload.alsoOppositeType) {
      const oppositeType = partnerType === "SUPPLIER" ? "CUSTOMER" : "SUPPLIER";
      const [primaryResult, oppositeResult] = await db.batch([
        db.insert(businessPartners).values(partnerValues).returning(),
        db.insert(businessPartners).values({ ...partnerValues, partnerType: oppositeType }).returning(),
      ]);
      const created = primaryResult[0];
      const opposite = oppositeResult[0];
      return Response.json({ partner: created, partners: [created, opposite] }, { status: 201 });
    }
    const [created] = await db.insert(businessPartners).values(partnerValues).returning();
    return Response.json({ partner: created, partners: [created] }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible guardar el registro." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as Partial<NewBusinessPartner> & { id?: number };
    const id = Number(payload.id);
    const partnerType = payload.partnerType === "CUSTOMER" ? "CUSTOMER" : payload.partnerType === "SUPPLIER" ? "SUPPLIER" : null;
    if (!Number.isInteger(id) || id <= 0 || !partnerType) return Response.json({ error: "No fue posible identificar el registro." }, { status: 400 });
    const missing = requiredFields.some((field) => !clean(payload[field]));
    if (missing) return Response.json({ error: "Completa todos los campos obligatorios para continuar." }, { status: 400 });
    const email = clean(payload.contactEmail);
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Ingresa un correo válido." }, { status: 400 });
    const phone = clean(payload.contactPhone).replace(/\D/g, "");
    if (phone.length !== 10) return Response.json({ error: "El teléfono debe contener exactamente 10 dígitos." }, { status: 400 });
    if (partnerType === "CUSTOMER" && !clean(payload.assignedSeller)) return Response.json({ error: "Selecciona el vendedor de Norwest para el cliente." }, { status: 400 });
    const profitPercentage = Number(payload.profitPercentage ?? 0);
    if (!Number.isFinite(profitPercentage) || profitPercentage < 0 || profitPercentage > 100) return Response.json({ error: "El porcentaje de utilidad debe estar entre 0 y 100." }, { status: 400 });
    const [updated] = await getDb().update(businessPartners).set({
      partnerType,
      name: clean(payload.name),
      pacaNumber: clean(payload.pacaNumber),
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
      contactPhone: phone,
      assignedSeller: clean(payload.assignedSeller) || null,
      profitPercentage,
    }).where(and(eq(businessPartners.id, id), eq(businessPartners.organizationCode, "USA"))).returning();
    if (!updated) return Response.json({ error: "Registro no encontrado." }, { status: 404 });
    return Response.json({ partner: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible actualizar el registro." }, { status: 500 });
  }
}
