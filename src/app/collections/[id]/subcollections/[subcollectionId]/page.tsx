import { notFound, redirect } from "next/navigation";
import { getOwnedCollection } from "@/data/catalog";
import { CollectionManager } from "../../collection-manager";

export default async function SubcollectionPage({
  params,
}: {
  params: Promise<{ id: string; subcollectionId: string }>;
}) {
  const { id, subcollectionId } = await params;
  const data = await getOwnedCollection(id);

  if (!data) redirect("/login");
  if (!data.collection) notFound();
  if (!data.collection.subcollections.some((entry) => entry.id === subcollectionId)) notFound();

  return <CollectionManager viewer={data.viewer} collection={data.collection} templates={data.templates} subcollectionId={subcollectionId} />;
}
