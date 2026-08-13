import { LanguageSwitcher } from "@/components/language-switcher"
import { SidebarTrigger } from "@/components/ui/sidebar"
import UserMenu from "@/components/user-menu"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"

export default function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <WorkspaceSwitcher />
        <UserMenu compact />
      </div>
    </header>
  )
}
