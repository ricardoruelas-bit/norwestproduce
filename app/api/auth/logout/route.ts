export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": "norwest_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    },
  );
}
