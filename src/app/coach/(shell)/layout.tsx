import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { BottomNav } from "@/components/nav";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  await requireCoach();
  if (!isDbConfigured) redirect("/installation");

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-32">
      {children}
      <BottomNav variant="coach" />
    </div>
  );
}
