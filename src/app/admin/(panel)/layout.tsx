import { existsSync } from "node:fs";
import path from "node:path";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaff } from "@/server/admin-data";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  const logoReady = existsSync(path.join(process.cwd(), "public", "brand", "impact-beauty-studio-mark.png"));
  return <AdminShell logoReady={logoReady}>{children}</AdminShell>;
}
