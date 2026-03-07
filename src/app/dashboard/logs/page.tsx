import { redirect } from "next/navigation";

export default function LegacyLogsPage() {
  redirect("/dashboard/admin/logs");
}
