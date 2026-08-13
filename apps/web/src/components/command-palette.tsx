import { useNavigate } from "@tanstack/react-router"
import {
  BookOpenIcon,
  FileTextIcon,
  HomeIcon,
  PaletteIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useI18n } from "@/lib/i18n"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((isOpen) => !isOpen)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <CommandDialog
      description={t("commandPalette.description")}
      onOpenChange={setOpen}
      open={open}
      title={t("commandPalette.title")}
    >
      <CommandInput placeholder={t("commandPalette.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("commandPalette.noResults")}</CommandEmpty>

        <CommandGroup heading={t("commandPalette.groupNavigation")}>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard" }))}>
            <HomeIcon />
            {t("commandPalette.navDashboard")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard/projects" }))}>
            <BookOpenIcon />
            {t("commandPalette.navProjects")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard/ai" }))}>
            <PaletteIcon />
            {t("commandPalette.navAI")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard/settings" }))}>
            <SettingsIcon />
            {t("commandPalette.navSettings")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard/team" }))}>
            <UsersIcon />
            {t("commandPalette.navTeam")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("commandPalette.groupActions")}>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                // This would typically trigger a new novel creation modal
              })
            }
          >
            <PlusIcon />
            {t("commandPalette.actionCreateProject")}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                // This would typically open a search modal
              })
            }
          >
            <SearchIcon />
            {t("commandPalette.actionSearchProjects")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("commandPalette.groupQuickLinks")}>
          <CommandItem onSelect={() => runCommand(() => window.open("/privacy", "_blank"))}>
            <FileTextIcon />
            {t("commandPalette.linkPrivacy")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.open("/terms", "_blank"))}>
            <FileTextIcon />
            {t("commandPalette.linkTerms")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
