import { SidebarTrigger } from "@/components/ui/sidebar"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"

export default function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <SidebarTrigger />
      <WorkspaceSwitcher />
    </header>
  )
}
