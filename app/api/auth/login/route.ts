import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { userAccounts } from "../../../../db/schema";
import { DEFAULT_ADMIN_USER, clean, safeUser, verifyPassword } from "../../../../lib/auth";

function loginResponse(user: ReturnType<typeof safeUser>) {
  return Response.json(
    { user },
    {
      headers: {
        "Set-Cookie": `norwest_session=${encodeURIComponent(user.email)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const email = clean(payload.email).toLowerCase();
    const password = clean(payload.password);
    if (!email || !password) return Response.json({ error: "Ingresa correo y contrasena." }, { status: 400 });

    try {
      const [user] = await getDb().select().from(userAccounts).where(and(eq(userAccounts.organizationCode, "USA"), eq(userAccounts.email, email))).limit(1);
      if (user?.active && await verifyPassword(password, user.passwordHash)) return loginResponse(safeUser(user));
    } catch {
      if (email === DEFAULT_ADMIN_USER.email && await verifyPassword(password, DEFAULT_ADMIN_USER.passwordHash)) return loginResponse(safeUser(DEFAULT_ADMIN_USER));
    }

    if (email === DEFAULT_ADMIN_USER.email && await verifyPassword(password, DEFAULT_ADMIN_USER.passwordHash)) return loginResponse(safeUser(DEFAULT_ADMIN_USER));
    return Response.json({ error: "Correo o contrasena incorrectos." }, { status: 401 });
  } catch {
    return Response.json({ error: "No fue posible iniciar sesion." }, { status: 500 });
  }
}
