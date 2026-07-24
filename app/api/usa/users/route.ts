import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { userAccounts } from "../../../../db/schema";
import { ALL_USER_PERMISSIONS, DEFAULT_ADMIN_USER, clean, hashPassword, safeUser, verifyPassword } from "../../../../lib/auth";

const allowedPermissions = new Set<string>(ALL_USER_PERMISSIONS);

function permissions(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && allowedPermissions.has(item)) : [];
}

async function ensureDefaultAdminUser(db: ReturnType<typeof getDb>) {
  const [existing] = await db.select().from(userAccounts).where(and(eq(userAccounts.organizationCode, "USA"), eq(userAccounts.email, DEFAULT_ADMIN_USER.email))).limit(1);
  if (existing) {
    await db.update(userAccounts).set({ fullName: DEFAULT_ADMIN_USER.fullName, alias: DEFAULT_ADMIN_USER.alias, passwordHash: DEFAULT_ADMIN_USER.passwordHash, permissions: DEFAULT_ADMIN_USER.permissions, active: true }).where(eq(userAccounts.id, existing.id));
    return;
  }
  await db.insert(userAccounts).values({ organizationCode: "USA", fullName: DEFAULT_ADMIN_USER.fullName, alias: DEFAULT_ADMIN_USER.alias, email: DEFAULT_ADMIN_USER.email, passwordHash: DEFAULT_ADMIN_USER.passwordHash, permissions: DEFAULT_ADMIN_USER.permissions, profitPercentage: 0, active: true });
}

export async function GET() {
  try {
    const db = getDb();
    await ensureDefaultAdminUser(db);
    const users = await db.select().from(userAccounts).where(eq(userAccounts.organizationCode, "USA")).orderBy(asc(userAccounts.fullName));
    return Response.json({ users: users.map(safeUser) });
  } catch (error) {
    if (error instanceof Error && error.message.includes("D1 binding")) return Response.json({ users: [safeUser(DEFAULT_ADMIN_USER)] });
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible consultar los usuarios." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const fullName = clean(payload.fullName), alias = clean(payload.alias), email = clean(payload.email).toLowerCase(), password = clean(payload.password);
    if (!fullName || !alias || !email || password.length < 8) return Response.json({ error: "Completa nombre, alias, correo y una contraseña de al menos 8 caracteres." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Ingresa un correo válido." }, { status: 400 });
    const duplicate = await getDb().select({ id: userAccounts.id }).from(userAccounts).where(and(eq(userAccounts.organizationCode, "USA"), eq(userAccounts.alias, alias))).limit(1);
    if (duplicate.length) return Response.json({ error: "Ese alias ya está registrado." }, { status: 409 });
    const [created] = await getDb().insert(userAccounts).values({ organizationCode: "USA", fullName, alias, email, passwordHash: await hashPassword(password), permissions: JSON.stringify(permissions(payload.permissions)), active: payload.active !== false }).returning();
    return Response.json({ user: safeUser(created) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible crear el usuario." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const id = Number(payload.id), fullName = clean(payload.fullName), alias = clean(payload.alias), email = clean(payload.email).toLowerCase();
    const currentPassword = clean(payload.currentPassword), newPassword = clean(payload.newPassword), confirmNewPassword = clean(payload.confirmNewPassword);
    if (!Number.isInteger(id) || id <= 0 || !fullName || !alias || !email) return Response.json({ error: "Completa los datos obligatorios del usuario." }, { status: 400 });
    const changingPassword = Boolean(currentPassword || newPassword || confirmNewPassword);
    if (changingPassword && (!currentPassword || !newPassword || !confirmNewPassword)) return Response.json({ error: "Completa la contraseña actual, la nueva contraseña y su confirmación." }, { status: 400 });
    if (changingPassword && newPassword.length < 8) return Response.json({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    if (changingPassword && newPassword !== confirmNewPassword) return Response.json({ error: "La nueva contraseña y su confirmación no coinciden." }, { status: 400 });
    const [existing] = await getDb().select().from(userAccounts).where(and(eq(userAccounts.id, id), eq(userAccounts.organizationCode, "USA"))).limit(1);
    if (!existing) return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (changingPassword && !(await verifyPassword(currentPassword, existing.passwordHash))) return Response.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
    const duplicate = await getDb().select({ id: userAccounts.id }).from(userAccounts).where(and(eq(userAccounts.organizationCode, "USA"), eq(userAccounts.alias, alias), ne(userAccounts.id, id))).limit(1);
    if (duplicate.length) return Response.json({ error: "Ese alias ya está registrado." }, { status: 409 });
    const values: Partial<typeof userAccounts.$inferInsert> = { fullName, alias, email, permissions: JSON.stringify(permissions(payload.permissions)), active: payload.active !== false };
    if (changingPassword) values.passwordHash = await hashPassword(newPassword);
    const [updated] = await getDb().update(userAccounts).set(values).where(and(eq(userAccounts.id, id), eq(userAccounts.organizationCode, "USA"))).returning();
    if (!updated) return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
    return Response.json({ user: safeUser(updated) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible actualizar el usuario." }, { status: 500 });
  }
}
