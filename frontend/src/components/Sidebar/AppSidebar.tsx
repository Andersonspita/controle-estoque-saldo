import { Briefcase, FileBarChart, Home, Users, FileText, Truck, FileSignature } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: Truck, title: "Fornecedores", path: "/fornecedores" },
  { icon: FileSignature, title: "Contratos", path: "/contratos" },
  { icon: FileText, title: "Notas Fiscais", path: "/notas-fiscais" },
  { icon: Briefcase, title: "Órgãos", path: "/almoxarifados" },
  { icon: FileBarChart, title: "Relatórios", path: "/relatorios" },
]

export function AppSidebar() {
  const { user: currentUser, isAdmin } = useAuth()

  const items = isAdmin
    ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
