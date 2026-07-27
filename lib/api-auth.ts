import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { userAccounts } from "../db/schema";
import { ALL_USER_PERMISSIONS, DEFAULT_ADMIN_USER, safeUser } from "./auth";
import { verifySessionToken } from "./session";

type Permission = (typeof ALL_USER_PERMISSIONS)[number];

function cookieValue(header: string | null, name: string) {
  return (header || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function parsePermissions(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is Permission => ALL_USER_PERMISSIONS.includes(item as Permission)) : [];
  } catch {
    return [];
  }
}

async function currentUser(request: Request) {
  const token = cookieValue(request.headers.get("cookie"), "norwest_session");
  if (!token) return null;

  const email = await verifySessionToken(token);
  if (!email) return null;

  try {
    const db = await getDb();
    const [user] = await db
      .select()
      .from(userAccounts)
      .where(and(eq(userAccounts.organizationCode, "USA"), eq(userAccounts.email, email.toLowerCase()), eq(userAccounts.active, true)))
      .limit(1);
    return user || null;
  } catch (error) {
    if (email.toLowerCase() === DEFAULT_ADMIN_USER.email) return DEFAULT_ADMIN_USER;
    throw error;
  }
}

export async function requirePermission(request: Request, permission: Permission) {
  const user = await currentUser(request);
  if (!user) return { response: Response.json({ error: "No autorizado." }, { status: 401 }) };

  const permissions = parsePermissions(user.permissions);
  if (!permissions.includes(permission)) {
    return { response: Response.json({ error: "No tienes permiso para realizar esta accion." }, { status: 403 }) };
  }

  return { user: safeUser(user), permissions };
}

export async function requireAnyPermission(request: Request, allowed: Permission[]) {
  const user = await currentUser(request);
  if (!user) return { response: Response.json({ error: "No autorizado." }, { status: 401 }) };

  const permissions = parsePermissions(user.permissions);
  if (!allowed.some((permission) => permissions.includes(permission))) {
    return { response: Response.json({ error: "No tienes permiso para consultar esta informacion." }, { status: 403 }) };
  }

  return { user: safeUser(user), permissions };
}
