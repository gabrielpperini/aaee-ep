import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { ServiceWorkerRegister } from "@/components/app/service-worker-register";
import { InstallPrompt } from "@/components/app/install-prompt";
import { EnablePushPrompt } from "@/components/app/enable-push-prompt";
import { InstallTracker } from "@/components/app/install-tracker";
import { OfflineHydrator } from "@/components/app/offline-hydrator";
import { SyncProcessor } from "@/components/app/sync-processor";
import { OfflineBanner } from "@/components/app/offline-banner";
import { requireUser } from "@/lib/auth";
import { loadHydrationData } from "@/lib/db/hydration-source";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const displayName = user.person?.name ?? user.email ?? "Membro";
  const hydration = user.person
    ? await loadHydrationData(user.person.id)
    : null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar role={user.role} name={displayName} />
      <div className="flex flex-1 min-w-0 min-h-0 flex-col">
        <MobileNav role={user.role} name={displayName} />
        <OfflineBanner />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
      <ServiceWorkerRegister />
      <InstallPrompt />
      <EnablePushPrompt />
      <InstallTracker />
      {hydration && <OfflineHydrator data={hydration} />}
      <SyncProcessor />
    </div>
  );
}
