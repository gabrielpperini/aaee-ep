"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { signOut } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS, hasAccess, roleLabel, type NavItem } from "@/components/app/nav-items";
import type { Role } from "@/generated/prisma/client";

const GROUP_LABELS: Record<NavItem["group"], string> = {
  main: "Painel",
  manage: "Gestão",
  admin: "Administração",
};

export function MobileNav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const closeOnNav = () => setOpen(false);

  const items = NAV_ITEMS.filter((item) => hasAccess(role, item.minRole));
  const grouped = items.reduce<Record<NavItem["group"], NavItem[]>>(
    (acc, item) => {
      acc[item.group].push(item);
      return acc;
    },
    { main: [], manage: [], admin: [] },
  );

  return (
    <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" onClick={closeOnNav} className="flex items-center gap-2.5 min-w-0">
          <BrandMark size={34} priority className="rounded-lg" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground leading-none">
              AAEE · UFRGS
            </p>
            <p className="font-display text-sm font-semibold leading-tight tracking-tight truncate">
              Delegação EP
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="sm" className="gap-2" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              }
            />
            <SheetContent
              side="right"
              className="w-[78vw] max-w-sm border-l border-sidebar-border bg-sidebar text-sidebar-foreground p-0"
            >
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <SheetDescription className="sr-only">
                Acesse as seções da Delegação EP
              </SheetDescription>

              <div className="flex h-full flex-col">
                <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-sidebar-border">
                  <BrandMark size={40} priority className="rounded-xl ring-1 ring-sidebar-border" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-primary/90">
                      AAEE · UFRGS
                    </p>
                    <p className="font-display text-lg font-semibold leading-tight tracking-tight">
                      Delegação EP
                    </p>
                  </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                  {(Object.keys(grouped) as NavItem["group"][])
                    .filter((g) => grouped[g].length > 0)
                    .map((group) => (
                      <div key={group} className="space-y-1">
                        <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
                          {GROUP_LABELS[group]}
                        </p>
                        {grouped[group].map((item) => {
                          const active =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeOnNav}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                active
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                </nav>

                <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
                  <div className="px-2 pb-1">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/55">
                      {roleLabel(role)}
                    </p>
                  </div>
                  <ThemeToggle className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent" />
                  <form action={signOut}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </Button>
                  </form>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
