import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronDown, ChevronRight, FileText, PenTool, Plus, Scroll } from "lucide-react"
import { useState } from "react"
import { CharacterSidebarSection } from "@/components/character-sidebar-section"
import CodexModal from "@/components/codex-modal"
import { LocationSidebarSection } from "@/components/location-sidebar-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Logo } from "@/components/ui/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import UserMenu from "@/components/user-menu"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface ProjectSidebarProps {
  projectId: string
}

interface CollapsibleSectionProps {
  fallbackSecondaryLabel?: string
  icon: React.ComponentType<{ className?: string }>
  isExpanded: boolean
  items: Array<{ id: string; name: string; role?: string; type?: string }>
  onOpenModal: (type: string, entry?: string) => void
  onToggle: () => void
  secondaryField: "role" | "type"
  sectionKey: string
  title: string
}

function CollapsibleSection({
  sectionKey,
  icon: Icon,
  title,
  items,
  isExpanded,
  onToggle,
  onOpenModal,
  secondaryField,
  fallbackSecondaryLabel,
}: CollapsibleSectionProps) {
  const { t } = useI18n()

  return (
    <SidebarMenuItem>
      <Collapsible onOpenChange={onToggle} open={isExpanded}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Icon className="h-4 w-4" />
            <span>{title}</span>
            <Badge className="ml-auto" variant="secondary">
              {items.length}
            </Badge>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 space-y-1">
            <Button
              className="w-full justify-start text-muted-foreground"
              onClick={() => onOpenModal(sectionKey)}
              size="sm"
              variant="ghost"
            >
              <Plus className="h-4 w-4" />
              <span>{t("common.new")}</span>
            </Button>
            {items.map((item) => {
              const secondaryValue = item[secondaryField] ?? fallbackSecondaryLabel

              return (
                <Button
                  className="w-full justify-start"
                  key={item.id}
                  onClick={() => onOpenModal(sectionKey, item.name)}
                  size="sm"
                  variant="ghost"
                >
                  <span className="truncate">{item.name}</span>
                  {secondaryValue ? (
                    <span className="ml-auto text-muted-foreground text-xs">{secondaryValue}</span>
                  ) : null}
                </Button>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const { t } = useI18n()
  const [isCodexModalOpen, setIsCodexModalOpen] = useState(false)
  const [codexModalConfig, setCodexModalConfig] = useState<{
    initialType?: string | null
    initialEntry?: string | null
  }>({})
  const [expandedCodexSections, setExpandedCodexSections] = useState<Record<string, boolean>>({
    characters: false,
    locations: false,
    lore: false,
    plot: false,
    notes: false,
  })

  // Fetch lore entries
  const { data: loreEntries = [] } = useQuery({
    queryKey: ["lore", projectId],
    queryFn: async () => {
      const result = await api.lore.list(projectId)
      return result.map((entry) => ({
        id: entry.id,
        name: entry.name,
        type: entry.type || undefined,
      }))
    },
  })

  // Fetch plot threads
  const { data: plotThreads = [] } = useQuery({
    queryKey: ["plot", projectId],
    queryFn: async () => {
      const result = await api.plot.list(projectId)
      return result.map((thread) => ({
        id: thread.id,
        name: thread.title,
        role: thread.status || undefined,
      }))
    },
  })

  // For now, keeping notes as empty until there's a proper API endpoint
  // This could be extended to use lore entries with a specific type filter
  const notes: Array<{ id: string; name: string; role?: string }> = []

  const toggleCodexSection = (section: string) => {
    setExpandedCodexSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const openCodexModal = (type?: string, entry?: string) => {
    setCodexModalConfig({
      initialType: type || null,
      initialEntry: entry || null,
    })
    setIsCodexModalOpen(true)
  }

  return (
    <>
      <Sidebar side="left" variant="sidebar">
        <SidebarHeader>
          <div className="px-4 py-3">
            <Logo size="md" to="/dashboard" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("codex.sidebar.section.structure")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link params={{ projectId }} to="/projects/$projectId/write">
                      <PenTool />
                      <span>{t("codex.sidebar.nav.write")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link params={{ projectId }} to="/projects/$projectId/canvas">
                      <FileText />
                      <span>{t("codex.sidebar.nav.canvas")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t("codex.sidebar.section.codex")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <CharacterSidebarSection
                  isExpanded={expandedCodexSections.characters}
                  key="characters-section"
                  onOpenCodexModal={openCodexModal}
                  onToggle={() => toggleCodexSection("characters")}
                  projectId={projectId}
                />

                <LocationSidebarSection
                  isExpanded={expandedCodexSections.locations}
                  key="locations-section"
                  onOpenCodexModal={openCodexModal}
                  onToggle={() => toggleCodexSection("locations")}
                  projectId={projectId}
                />

                <CollapsibleSection
                  fallbackSecondaryLabel={t("codex.sidebar.fallbackLoreType")}
                  icon={Scroll}
                  isExpanded={expandedCodexSections.lore}
                  items={loreEntries}
                  onOpenModal={openCodexModal}
                  onToggle={() => toggleCodexSection("lore")}
                  secondaryField="type"
                  sectionKey="lore"
                  title={t("codex.types.lore.label")}
                />

                <CollapsibleSection
                  fallbackSecondaryLabel={t("codex.sidebar.fallbackPlotStatus")}
                  icon={FileText}
                  isExpanded={expandedCodexSections.plot}
                  items={plotThreads}
                  onOpenModal={openCodexModal}
                  onToggle={() => toggleCodexSection("plot")}
                  secondaryField="role"
                  sectionKey="plot"
                  title={t("codex.types.plot.title")}
                />

                <CollapsibleSection
                  icon={FileText}
                  isExpanded={expandedCodexSections.notes}
                  items={notes}
                  onOpenModal={openCodexModal}
                  onToggle={() => toggleCodexSection("notes")}
                  secondaryField="role"
                  sectionKey="notes"
                  title={t("codex.types.notes.title")}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <CodexModal
        initialEntry={codexModalConfig.initialEntry}
        initialType={codexModalConfig.initialType}
        isOpen={isCodexModalOpen}
        onClose={() => {
          setIsCodexModalOpen(false)
          setCodexModalConfig({})
        }}
        projectId={projectId}
      />
    </>
  )
}
