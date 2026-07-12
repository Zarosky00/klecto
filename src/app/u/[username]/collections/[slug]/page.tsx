import { notFound } from "next/navigation";
import { getPublicCollection } from "@/data/public-profile";
import { PublicCollectionView } from "./public-collection-view";

export default async function PublicCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{ subcollection?: string | string[] }>;
}) {
  const { username, slug } = await params;
  const query = await searchParams;
  const initialSubcollectionSlug = Array.isArray(query.subcollection) ? query.subcollection[0] : query.subcollection;
  const data = await getPublicCollection(username, slug);
  if (!data) notFound();

  return <PublicCollectionView profile={data.profile} collection={data.collection} initialSubcollectionSlug={initialSubcollectionSlug} />;
}
