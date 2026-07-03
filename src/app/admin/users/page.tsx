import { redirect } from "next/navigation";

// User management has moved into /admin/review as a subtab
export default function UsersPage() {
  redirect("/admin/review");
}
