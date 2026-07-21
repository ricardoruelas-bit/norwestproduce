import { City, State } from "country-state-city";

export async function GET(request: Request) {
  const stateCode = new URL(request.url).searchParams.get("state")?.trim().toUpperCase();
  if (!stateCode) {
    const states = State.getStatesOfCountry("US")
      .map((state) => ({ code: state.isoCode, name: state.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ states });
  }
  const cities = City.getCitiesOfState("US", stateCode)
    .map((city) => city.name)
    .filter((city, index, all) => all.indexOf(city) === index)
    .sort((a, b) => a.localeCompare(b));
  return Response.json({ cities });
}
