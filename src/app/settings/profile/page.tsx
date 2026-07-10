import { redirect } from "next/navigation";
import { getCatalogDashboard } from "@/data/catalog";
import { ProfileEditor } from "./profile-editor";

export default async function ProfileSettingsPage() {
  const dashboard = await getCatalogDashboard();
  if (!dashboard.viewer) redirect("/login");
  return <ProfileEditor viewer={dashboard.viewer} />;
}
