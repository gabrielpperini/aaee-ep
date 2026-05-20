"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Users,
  Trophy,
  MapPin,
  LayoutDashboard,
  LogOut,
  Volleyball,
  UserCircle,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/generated/prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: Role;
};

const NAV: NavItem[] = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/perfil", label: "Meu perfil", icon: UserCircle },
  { href: "/eventos", label: "Eventos", icon: Volleyball, minRole: "DIRECTOR" },
  { href: "/pessoas", label: "Pessoas", icon: Users, minRole: "DIRECTOR" },
  { href: "/modalidades", label: "Modalidades", icon: Trophy, minRole: "DIRECTOR" },
  { href: "/locais", label: "Locais", icon: MapPin, minRole: "DIRECTOR" },
  { href: "/admin/usuarios", label: "Usuários", icon: Shield, minRole: "ADMIN" },
];

function hasAccess(role: Role, minRole?: Role) {
  if (!minRole) return true;
  if (minRole === "ADMIN") return role === "ADMIN";
  if (minRole === "DIRECTOR") return role === "DIRECTOR" || role === "ADMIN";
  return true;
}

export function Sidebar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-4 border-b">
        <BrandMark size={40} priority />
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">
            Engenharia UFRGS
          </p>
          <p className="font-semibold leading-tight">Delegação EP</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.filter((item) => hasAccess(role, item.minRole)).map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-3 py-3 space-y-1">
        <div className="px-2 pb-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{roleLabel(role)}</p>
        </div>
        <ThemeToggle className="w-full justify-start" />
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}

function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "DIRECTOR":
      return "Diretor da torcida";
    default:
      return "Delegação";
  }
}
