import { headers } from "next/headers";
import AdminSidebar from "./AdminSidebar";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h          = await headers();
  const adminName  = h.get("x-admin-name")  ?? "Administrator";
  const adminEmail = h.get("x-admin-email") ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — fixed on the left */}
      <AdminSidebar adminName={adminName} adminEmail={adminEmail} />

      {/* Scrollable page content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <main className="flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
