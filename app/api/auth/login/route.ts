import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { userAccounts } from "../../../../db/schema";
import { DEFAULT_ADMIN_USER, clean, safeUser, verifyPassword } from "../../../../lib/auth";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/session";

function loginResponse(user: ReturnType<typeof safeUser>, token: string) {
  return Response.json(
    { user },
    { headers: { "Set-Cookie": sessionCookieHeader(token) } },
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const email = clean(payload.email).toLowerCase();
    const password = clean(payload.password);
    if (!email || !password) return Response.json({ error: "Ingresa correo y contrasena." }, { status: 400 });

    let user: ReturnType<typeof safeUser> | null = null;

    try {
      const [row] = await getDb()
        .select()
        .from(userAccounts)
        .where(and(eq(userAccounts.organizationCode, "USA"), eq(userAccounts.email, email)))
        .limit(1);
      if (row?.active && (await verifyPassword(password, row.passwordHash))) user = safeUser(row);
    } catch {
      // DB unavailable — fall through to hardcoded admin fallback
    }

    if (!user && email === DEFAULT_ADMIN_USER.email && (await verifyPassword(password, DEFAULT_ADMIN_USER.passwordHash))) {
      user = safeUser(DEFAULT_ADMIN_USER);
    }

    if (!user) return Response.json({ error: "Correo o contrasena incorrectos." }, { status: 401 });

    const token = await createSessionToken(email);
    return loginResponse(user, token);
  } catch {
    return Response.json({ error: "No fue posible iniciar sesion." }, { status: 500 });
  }
}
