import { KlectoApp } from "@/components/klecto-app";
import { getCatalogDashboard } from "@/data/catalog";
import { getDiscoveryFeed } from "@/data/discovery-feed";

type HomeProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [initialData, initialDiscovery, query] = await Promise.all([
    getCatalogDashboard(),
    getDiscoveryFeed(),
    searchParams,
  ]);
  const view = Array.isArray(query.view) ? query.view[0] : query.view;

  return <KlectoApp initialData={initialData} initialDiscovery={initialDiscovery} initialView={view === "collections" ? "collections" : "home"} />;
}
