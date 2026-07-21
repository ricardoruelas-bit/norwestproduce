import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products } from "../../../../db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const rows = await getDb().select().from(products)
      .where(eq(products.organizationCode, "USA"))
      .orderBy(asc(products.name), asc(products.presentation));
    return Response.json({ products: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible consultar productos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (!clean(payload.name)) return Response.json({ error: "Ingresa el nombre del producto." }, { status: 400 });
    const [product] = await getDb().insert(products).values({
      organizationCode: "USA",
      name: clean(payload.name),
      presentation: clean(payload.presentation) || null,
      size: clean(payload.size) || null,
      label: clean(payload.label) || null,
    }).returning();
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible guardar el producto." }, { status: 500 });
  }
}
