import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";

export default async function Home() {
  const role = await getRole();
  if (!role) redirect("/login");
  redirect(role === "coach" ? "/coach" : "/app");
}
