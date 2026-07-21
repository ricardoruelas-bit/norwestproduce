import referenceSales from "../../lib/reference-sales.json";
import UsaDashboard from "./usa-dashboard";

export default function UsaPage() {
  return <UsaDashboard initialSales={referenceSales} />;
}

