import { getPublicProfile } from "@/data/public-profile";
import { PublicProfileUnavailable, PublicProfileView } from "./public-profile-view";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) return <PublicProfileUnavailable />;

  return <PublicProfileView profile={profile} />;
}
