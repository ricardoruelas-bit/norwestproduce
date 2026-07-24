import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("norwest_session")?.value;

  if (!token) {
    return unauthenticated(request);
  }

  const email = await verifySessionToken(token);
  if (!email) {
    const response = unauthenticated(request);
    response.cookies.set("norwest_session", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

function unauthenticated(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/empresas/:path*", "/usa/:path*", "/mexico/:path*", "/api/usa/:path*"],
};
