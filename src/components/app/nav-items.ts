import {
  Calendar,
  Users,
  Trophy,
  MapPin,
  LayoutDashboard,
  Volleyball,
  UserCircle,
  Shield,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: Role;
  group: "main" | "manage" | "admin";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: LayoutDashboard, group: "main" },
  { href: "/agenda", label: "Agenda", icon: Calendar, group: "main" },
  { href: "/perfil", label: "Meu perfil", icon: UserCircle, group: "main" },
  { href: "/eventos", label: "Eventos", icon: Volleyball, minRole: "DIRECTOR", group: "manage" },
  { href: "/pessoas", label: "Pessoas", icon: Users, minRole: "DIRECTOR", group: "manage" },
  { href: "/modalidades", label: "Modalidades", icon: Trophy, minRole: "DIRECTOR", group: "manage" },
  { href: "/locais", label: "Locais", icon: MapPin, minRole: "DIRECTOR", group: "manage" },
  { href: "/admin/usuarios", label: "Usuários", icon: Shield, minRole: "ADMIN", group: "admin" },
];

export function hasAccess(role: Role, minRole?: Role) {
  if (!minRole) return true;
  if (minRole === "ADMIN") return role === "ADMIN";
  if (minRole === "DIRECTOR") return role === "DIRECTOR" || role === "ADMIN";
  return true;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Administração";
    case "DIRECTOR":
      return "Diretoria";
    default:
      return "Delegação";
  }
}
