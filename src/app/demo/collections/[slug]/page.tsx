import { notFound } from "next/navigation";
import { getDemoCollection } from "@/lib/demo-collections";
import { DemoCollectionWorkspace } from "./demo-collection-workspace";

export default async function DemoCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getDemoCollection(slug);
  if (!collection) notFound();

  return <DemoCollectionWorkspace collection={collection} />;
}
