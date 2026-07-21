import referenceSales from "../../lib/reference-sales.json";
import UsaDashboard from "./usa-dashboard";

export default function UsaPage() {
  const initialSales = referenceSales.map((sale) => ({ ...sale, operationType: "DIRECT_RESALE" as const }));
  return <UsaDashboard initialSales={initialSales} />;
}
