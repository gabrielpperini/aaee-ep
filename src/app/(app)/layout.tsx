import { Sidebar } from "@/components/app/sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const displayName = user.person?.name ?? user.email ?? "Membro";

  return (
    <div className="flex flex-1 min-h-screen">
      <Sidebar role={user.role} name={displayName} />
      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto w-full max-w-6xl p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
