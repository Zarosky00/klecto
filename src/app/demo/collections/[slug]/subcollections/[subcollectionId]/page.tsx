import { notFound } from "next/navigation";
import { getDemoCollection } from "@/lib/demo-collections";
import { DemoCollectionWorkspace } from "../../demo-collection-workspace";

export default async function DemoSubcollectionPage({
  params,
}: {
  params: Promise<{ slug: string; subcollectionId: string }>;
}) {
  const { slug, subcollectionId } = await params;
  const collection = getDemoCollection(slug);
  if (!collection || !collection.subcollections.some((entry) => entry.id === subcollectionId)) notFound();

  return <DemoCollectionWorkspace collection={collection} subcollectionId={subcollectionId} />;
}
