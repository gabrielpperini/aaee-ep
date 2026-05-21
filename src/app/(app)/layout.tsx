import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const displayName = user.person?.name ?? user.email ?? "Membro";

  return (
    <div className="flex flex-1 min-h-screen w-full">
      <Sidebar role={user.role} name={displayName} />
      <div className="flex flex-1 min-w-0 flex-col">
        <MobileNav role={user.role} name={displayName} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
