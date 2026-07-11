import { notFound } from "next/navigation";
import { getPublicCollection } from "@/data/public-profile";
import { PublicCollectionView } from "./public-collection-view";

export default async function PublicCollectionPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const data = await getPublicCollection(username, slug);
  if (!data) notFound();

  return <PublicCollectionView profile={data.profile} collection={data.collection} />;
}
