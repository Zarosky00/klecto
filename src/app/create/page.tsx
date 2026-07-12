import { CreationStudio } from "./creation-studio";
import { getCatalogDashboard } from "@/data/catalog";

type CreatePageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    collection?: string | string[];
    subcollection?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const [dashboard, query] = await Promise.all([getCatalogDashboard(), searchParams]);

  return (
    <CreationStudio
      initialData={dashboard}
      initialMode={firstValue(query.mode)}
      initialCollectionId={firstValue(query.collection)}
      initialSubcollectionId={firstValue(query.subcollection)}
    />
  );
}
