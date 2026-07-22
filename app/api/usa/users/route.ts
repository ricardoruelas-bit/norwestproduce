import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { userAccounts } from "../../../../db/schema";

const allowedPermissions = new Set(["sales_view", "sales_edit", "inventory", "invoicing", "collections", "catalogs", "reports", "settings", "users"]);

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

async function hashPassword(password: string) {
  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  return `pbkdf2-sha256$${iterations}$${encode(salt)}$${encode(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsText, saltText, expectedText] = storedHash.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations <= 0 || !saltText || !expectedText) return false;

  try {
    const decode = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    const salt = decode(saltText);
    const expected = decode(expectedText);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, expected.length * 8);
    const actual = new Uint8Array(bits);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

function safeUser(user: typeof userAccounts.$inferSelect) {
  return { id: user.id, organizationCode: user.organizationCode, fullName: user.fullName, alias: user.alias, email: user.email, permissions: user.permissions, active: user.active, createdAt: user.createdAt };
}

function permissions(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && allowedPermissions.has(item)) : [];
}

export async function GET() {
  try {
    const users = await getDb().select().from(userAccounts).where(eq(userAccounts.organizationCode, "USA")).orderBy(asc(userAccounts.fullName));
    return Response.json({ users: users.map(safeUser) });
  } catch (error) {
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
