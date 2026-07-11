import { KlectoApp } from "@/components/klecto-app";
import { getCatalogDashboard } from "@/data/catalog";

type HomeProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [initialData, query] = await Promise.all([getCatalogDashboard(), searchParams]);
  const view = Array.isArray(query.view) ? query.view[0] : query.view;

  return <KlectoApp initialData={initialData} initialView={view === "collections" ? "collections" : "home"} />;
}
