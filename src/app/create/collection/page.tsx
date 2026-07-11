import { getCatalogDashboard } from "@/data/catalog";
import { CreationStudio } from "../creation-studio";

/**
 * A deliberate entry point for starting a collection. Keeping it separate
 * from the general composer lets this first step feel like a focused page,
 * while still reusing the same validated creation and cover-upload flow.
 */
export default async function NewCollectionPage() {
  const dashboard = await getCatalogDashboard();

  return (
    <CreationStudio
      initialData={dashboard}
      fixedMode="collection"
      backHref="/?view=collections"
    />
  );
}
