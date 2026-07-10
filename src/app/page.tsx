import { KlectoApp } from "@/components/klecto-app";
import { getCatalogDashboard } from "@/data/catalog";

export default async function Home() {
  const initialData = await getCatalogDashboard();
  return <KlectoApp initialData={initialData} />;
}
