"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export function Sidebar({ role, name }: { role: Role; name: string }) {
  return (
    <aside
      className={cn(
        "relative isolate hidden lg:flex w-64 shrink-0 flex-col",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        "overflow-hidden",
      )}
    >
      {/* Atmosphere: subtle field grid + radial wash */}
      <div
        aria-hidden
        className="field-lines pointer-events-none absolute inset-0 text-sidebar-foreground/40 opacity-[0.18]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--sidebar-primary) 36%, transparent), transparent 70%)",
        }}
      />

      <BrandBlock />
      <NavList role={role} />
      <SidebarFooter name={name} role={role} />
    </aside>
  );
}

function BrandBlock() {
  return (
    <div className="relative z-10 flex items-center gap-3 px-5 pt-6 pb-5">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -m-1 rounded-xl bg-sidebar-primary/15 blur-md"
        />
        <BrandMark size={44} priority className="relative rounded-xl ring-1 ring-sidebar-border" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-primary/90">
          AAEE · UFRGS
        </p>
        <p className="font-display text-lg font-semibold leading-tight tracking-tight">
          Delegação EP
        </p>
      </div>
    </div>
  );
}

function NavList({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => hasAccess(role, item.minRole));
  const grouped = items.reduce<Record<NavItem["group"], NavItem[]>>(
    (acc, item) => {
      acc[item.group].push(item);
      return acc;
    },
    { main: [], manage: [], admin: [] },
  );

  return (
    <nav className="relative z-10 flex-1 overflow-y-auto px-3 pb-4 space-y-5">
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
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_30px_-12px] shadow-sidebar-primary/60"
                      : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full transition-all",
                      active ? "w-1 bg-sidebar-primary" : "w-0",
                    )}
                  />
                  <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", active && "")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
    </nav>
  );
}

function SidebarFooter({ name, role }: { name: string; role: Role }) {
  return (
    <div className="relative z-10 border-t border-sidebar-border px-3 py-3 space-y-1">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="relative h-9 w-9 shrink-0">
          <div className="absolute inset-0 rounded-full stripes-gold opacity-60" aria-hidden />
          <div className="absolute inset-[2px] rounded-full bg-sidebar grid place-items-center font-display text-sm font-bold">
            {initials(name)}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/55">
            {roleLabel(role)}
          </p>
        </div>
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
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
