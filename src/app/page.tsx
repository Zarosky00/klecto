import { KlectoApp } from "@/components/klecto-app";
import { getCatalogDashboard } from "@/data/catalog";
import { getDiscoveryFeed } from "@/data/discovery-feed";

type HomeProps = {
  searchParams: Promise<{ view?: string | string[]; post?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [initialData, initialDiscovery, query] = await Promise.all([
    getCatalogDashboard(),
    getDiscoveryFeed(),
    searchParams,
  ]);
  const view = Array.isArray(query.view) ? query.view[0] : query.view;
  const post = Array.isArray(query.post) ? query.post[0] : query.post;

  return <KlectoApp initialData={initialData} initialDiscovery={initialDiscovery} initialPostId={post} initialView={view === "collections" ? "collections" : "home"} />;
}
