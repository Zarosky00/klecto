import { notFound, redirect } from "next/navigation";
import { getOwnedCollection } from "@/data/catalog";
import { CollectionManager } from "./collection-manager";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOwnedCollection(id);
  if (!data) redirect("/login");
  if (!data.collection) notFound();
  return <CollectionManager viewer={data.viewer} collection={data.collection} templates={data.templates} />;
}
