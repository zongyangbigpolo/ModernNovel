import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  FileText,
  MapPin,
  Save,
  Scroll,
  Settings,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CharacterDialog } from "@/components/character-dialog"
import { DeleteCharacterDialog } from "@/components/delete-character-dialog"
import { DeleteLocationDialog } from "@/components/delete-location-dialog"
import { LocationDialog } from "@/components/location-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { api, type Character, type Location } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface CodexModalProps {
  initialEntry?: string | null
  initialType?: string | null
  isOpen: boolean
  onClose: () => void
  projectId: string
}

type CodexEntry = Character | { id: string; name: string; description?: string }

interface CodexTypeConfig {
  collectionLabel: string
  description: string
  entries: CodexEntry[]
  icon: typeof Users
  label: string
  roleLabel: string
  singular: string
  singularLower: string
  title: string
  titleLower: string
}

export default function CodexModal({
  isOpen,
  onClose,
  projectId,
  initialType = null,
  initialEntry = null,
}: CodexModalProps) {
  const { t } = useI18n()
  const [selectedType, setSelectedType] = useState(initialType || "characters")
  const [selectedEntry, setSelectedEntry] = useState<string | null>(initialEntry)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [deleteCharacterDialogOpen, setDeleteCharacterDialogOpen] = useState(false)
  const [deleteLocationDialogOpen, setDeleteLocationDialogOpen] = useState(false)
  const [createCharacterDialogOpen, setCreateCharacterDialogOpen] = useState(false)
  const [createLocationDialogOpen, setCreateLocationDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  // Update state when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setSelectedType(initialType || "characters")
      setSelectedEntry(initialEntry)
      setSearchTerm("")
      setIsCreating(false)
      setIsEditing(false)
      setCreateCharacterDialogOpen(false)
      setCreateLocationDialogOpen(false)
    }
  }, [isOpen, initialType, initialEntry])

  // Fetch characters
  const { data: characters = [] } = useQuery({
    queryKey: ["characters", projectId],
    queryFn: async () => {
      const result = await api.characters.list(projectId)
      return result
    },
  })

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations", projectId],
    queryFn: async () => {
      const result = await api.locations.list(projectId)
      return result
    },
  })

  const getTypeConfig = (typeParam: string): CodexTypeConfig => {
    switch (typeParam) {
      case "characters": {
        const title = t("codex.types.characters.title")
        const singular = t("codex.types.characters.singular")
        return {
          label: t("codex.types.characters.label"),
          title,
          titleLower: title.toLowerCase(),
          description: t("codex.types.characters.description"),
          singular,
          singularLower: singular.toLowerCase(),
          collectionLabel: t("codex.types.characters.collection"),
          roleLabel: t("codex.types.characters.role"),
          icon: Users,
          entries: characters,
        }
      }
      case "locations": {
        const title = t("codex.types.locations.title")
        const singular = t("codex.types.locations.singular")
        return {
          label: t("codex.types.locations.label"),
          title,
          titleLower: title.toLowerCase(),
          description: t("codex.types.locations.description"),
          singular,
          singularLower: singular.toLowerCase(),
          collectionLabel: t("codex.types.locations.collection"),
          roleLabel: t("codex.types.locations.role"),
          icon: MapPin,
          entries: locations,
        }
      }
      case "lore": {
        const title = t("codex.types.lore.title")
        const singular = t("codex.types.lore.singular")
        return {
          label: t("codex.types.lore.label"),
          title,
          titleLower: title.toLowerCase(),
          description: t("codex.types.lore.description"),
          singular,
          singularLower: singular.toLowerCase(),
          collectionLabel: t("codex.types.lore.collection"),
          roleLabel: t("codex.types.lore.role"),
          icon: Scroll,
          entries: loreEntries,
        }
      }
      case "plot": {
        const title = t("codex.types.plot.title")
        const singular = t("codex.types.plot.singular")
        return {
          label: t("codex.types.plot.label"),
          title,
          titleLower: title.toLowerCase(),
          description: t("codex.types.plot.description"),
          singular,
          singularLower: singular.toLowerCase(),
          collectionLabel: t("codex.types.plot.collection"),
          roleLabel: t("codex.types.plot.role"),
          icon: FileText,
          entries: plotThreads,
        }
      }
      case "notes": {
        const title = t("codex.types.notes.title")
        const singular = t("codex.types.notes.singular")
        return {
          label: t("codex.types.notes.label"),
          title,
          titleLower: title.toLowerCase(),
          description: t("codex.types.notes.description"),
          singular,
          singularLower: singular.toLowerCase(),
          collectionLabel: t("codex.types.notes.collection"),
          roleLabel: t("codex.types.notes.role"),
          icon: Zap,
          entries: notes,
        }
      }
      default: {
        const title = t("codex.types.unknown.title")
        const singular = t("codex.types.unknown.singular")
        return {
          label: title,
          title,
          titleLower: title.toLowerCase(),
          description: t("codex.types.unknown.description"),
          singular,
          singularLower: singular.toLowerCase(),
          collectionLabel: t("codex.types.unknown.collection"),
          roleLabel: t("codex.types.unknown.role"),
          icon: FileText,
          entries: [],
        }
      }
    }
  }

  // Update mutations
  const updateCharacterMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: { name: string; description: string }
    }) => {
      const result = await api.characters.update(projectId, id, data)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
      toast.success(
        t("codex.modal.feedback.updated", { noun: t("codex.types.characters.singular") })
      )
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(
        t("codex.modal.feedback.updateFailed", {
          noun: t("codex.types.characters.singular").toLowerCase(),
          message: error.message,
        })
      )
    },
  })

  const updateLocationMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: { name: string; description: string }
    }) => {
      const result = await api.locations.update(projectId, id, data)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations", projectId] })
      toast.success(
        t("codex.modal.feedback.updated", { noun: t("codex.types.locations.singular") })
      )
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(
        t("codex.modal.feedback.updateFailed", {
          noun: t("codex.types.locations.singular").toLowerCase(),
          message: error.message,
        })
      )
    },
  })

  // Mock data for lore entries and plot threads - will be replaced with real API calls later
  const loreEntries: Array<{ id: string; name: string; description: string }> = []
  const plotThreads: Array<{ id: string; name: string; description: string }> = []
  const notes: Array<{ id: string; name: string; description: string }> = []

  const config = getTypeConfig(selectedType)
  const IconComponent = config.icon
  const filteredEntries = config.entries.filter((entry) =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEntryClick = (entryName: string) => {
    setSelectedEntry(entryName)
    setIsCreating(false)
    setIsEditing(false)
  }

  const handleCreateNew = () => {
    if (selectedType === "characters") {
      setCreateCharacterDialogOpen(true)
    } else if (selectedType === "locations") {
      setCreateLocationDialogOpen(true)
    }
    // For other types (lore, plot, notes), keep existing behavior for now
    else {
      setSelectedEntry(null)
      setIsCreating(true)
    }
  }

  const handleClose = () => {
    setSelectedEntry(null)
    setIsCreating(false)
    setIsEditing(false)
    setCreateCharacterDialogOpen(false)
    setCreateLocationDialogOpen(false)
    onClose()
  }

  const getSelectedEntryData = () => {
    if (!selectedEntry) {
      return null
    }
    return config.entries.find((entry) => entry.name === selectedEntry)
  }

  const selectedEntryData = getSelectedEntryData()

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "characters":
        return <Users className="h-4 w-4" />
      case "locations":
        return <MapPin className="h-4 w-4" />
      case "lore":
        return <Scroll className="h-4 w-4" />
      case "plot":
        return <FileText className="h-4 w-4" />
      case "notes":
        return <Zap className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getEntryRole = (type: string): string => {
    switch (type) {
      case "characters":
        return t("codex.types.characters.role")
      case "locations":
        return t("codex.types.locations.role")
      case "lore":
        return t("codex.types.lore.role")
      case "plot":
        return t("codex.types.plot.role")
      case "notes":
        return t("codex.types.notes.role")
      default:
        return t("codex.types.unknown.role")
    }
  }

  // Helper function to render the right panel content
  const renderRightPanel = () => {
    if (isCreating) {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <IconComponent className="h-5 w-5" />
              <h3 className="font-semibold">
                {t("codex.modal.createPanel.title", { type: config.singular })}
              </h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center text-muted-foreground">
              <IconComponent className="mx-auto mb-4 h-16 w-16 opacity-20" />
              <h3 className="mb-2 font-semibold">
                {t("codex.modal.createPanel.title", { type: config.singular })}
              </h3>
              <p className="mb-4 text-sm">
                {t("codex.modal.createPanel.description", { type: config.collectionLabel })}
              </p>
              <p className="text-xs">
                {t("codex.modal.createPanel.hint", { type: config.collectionLabel })}
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (selectedEntryData) {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              {getEntryIcon(selectedType)}
              <div>
                <h3 className="font-semibold">{selectedEntryData.name}</h3>
                <p className="text-muted-foreground text-sm">{getEntryRole(selectedType)}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs className="w-full" defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">{t("codex.modal.tabs.overview")}</TabsTrigger>
                <TabsTrigger value="details">{t("codex.modal.tabs.details")}</TabsTrigger>
                <TabsTrigger value="connections">{t("codex.modal.tabs.connections")}</TabsTrigger>
              </TabsList>

              <TabsContent className="mt-6" value="overview">
                <div className="space-y-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">{t("common.name")}</Label>
                        <Input
                          id="edit-name"
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder={t("codex.modal.fields.enterName")}
                          value={editName}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-description">{t("common.description")}</Label>
                        <Textarea
                          id="edit-description"
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder={t("codex.modal.fields.enterDescription")}
                          rows={4}
                          value={editDescription}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          disabled={
                            updateCharacterMutation.isPending || updateLocationMutation.isPending
                          }
                          onClick={() => {
                            if (!selectedEntryData?.id) {
                              return
                            }

                            const updateData = {
                              name: editName.trim(),
                              description: editDescription.trim(),
                            }

                            if (selectedType === "characters") {
                              updateCharacterMutation.mutate({
                                id: selectedEntryData.id,
                                data: updateData,
                              })
                            } else if (selectedType === "locations") {
                              updateLocationMutation.mutate({
                                id: selectedEntryData.id,
                                data: updateData,
                              })
                            }
                          }}
                          size="sm"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {updateCharacterMutation.isPending || updateLocationMutation.isPending
                            ? t("codex.modal.actions.updating")
                            : t("codex.modal.actions.update")}
                        </Button>
                        <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">
                          {t("common.cancel")}
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedType === "characters") {
                              setDeleteCharacterDialogOpen(true)
                            } else if (selectedType === "locations") {
                              setDeleteLocationDialogOpen(true)
                            }
                          }}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-medium">{t("common.name")}</h4>
                          <Button
                            onClick={() => {
                              setEditName(selectedEntryData.name)
                              setEditDescription(selectedEntryData.description || "")
                              setIsEditing(true)
                            }}
                            size="sm"
                            variant="outline"
                          >
                            {t("common.edit")}
                          </Button>
                        </div>
                        <p className="text-muted-foreground text-sm">{selectedEntryData.name}</p>
                      </div>

                      <div>
                        <h4 className="mb-2 font-medium">{t("common.description")}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {selectedEntryData.description || t("codex.modal.noDescriptionAvailable")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent className="mt-6" value="details">
                <div className="space-y-6">
                  {selectedType === "locations" && (
                    <div>
                      <h4 className="mb-2 font-medium">{t("codex.modal.locationDetails")}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {selectedEntryData.description || t("codex.modal.noDescriptionAvailable")}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent className="mt-6" value="connections">
                <div className="space-y-4">
                  <h4 className="font-medium">{t("codex.modal.relatedElements")}</h4>
                  <p className="text-muted-foreground text-sm">
                    {t("codex.modal.connectionsPlaceholder")}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <IconComponent className="mx-auto mb-4 h-16 w-16 opacity-20" />
          <h3 className="mb-2 font-semibold">{config.title}</h3>
          <p className="mb-4 text-muted-foreground text-sm">{config.description}</p>
          <Button onClick={handleCreateNew}>
            {t("codex.modal.createPanel.title", { type: config.singular })}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog onOpenChange={handleClose} open={isOpen}>
        <DialogContent className="h-[90vh] max-w-[90vw] overflow-hidden p-0 lg:max-w-6xl">
          <div className="flex h-full">
            <div className="flex w-64 flex-col border-r bg-muted/50">
              <div className="p-4">
                <DialogHeader>
                  <DialogTitle className="text-left">{t("codex.modal.title")}</DialogTitle>
                  <DialogDescription className="text-left">
                    {t("codex.modal.description")}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-1 p-2">
                  {[
                    {
                      key: "characters",
                      label: t("codex.types.characters.label"),
                      icon: Users,
                      count: characters.length,
                    },
                    {
                      key: "locations",
                      label: t("codex.types.locations.label"),
                      icon: MapPin,
                      count: locations.length,
                    },
                    {
                      key: "lore",
                      label: t("codex.types.lore.label"),
                      icon: Scroll,
                      count: loreEntries.length,
                    },
                    {
                      key: "plot",
                      label: t("codex.types.plot.title"),
                      icon: FileText,
                      count: plotThreads.length,
                    },
                    {
                      key: "notes",
                      label: t("codex.types.notes.label"),
                      icon: Zap,
                      count: notes.length,
                    },
                  ].map((item) => (
                    <Button
                      className={`w-full justify-start ${selectedType === item.key ? "bg-accent" : ""}`}
                      key={item.key}
                      onClick={() => {
                        setSelectedType(item.key)
                        setSelectedEntry(null)
                        setIsCreating(false)
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.label}
                      <Badge className="ml-auto" variant="secondary">
                        {item.count}
                      </Badge>
                    </Button>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="p-4">
                  <div className="space-y-2">
                    <Button
                      className="w-full gap-2"
                      onClick={handleCreateNew}
                      size="sm"
                      variant="outline"
                    >
                      <Sparkles className="h-4 w-4" />
                      {t("codex.modal.actions.createNew")}
                    </Button>
                    <Button className="w-full gap-2" size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                      {t("codex.modal.actions.templates")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-80 flex-col border-r">
              <div className="border-b p-4">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">{config.title}</h3>
                    <p className="text-muted-foreground text-xs">{config.description}</p>
                  </div>
                </div>
                <Input
                  className="mt-3"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("codex.modal.search", { type: config.titleLower })}
                  value={searchTerm}
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-1 p-2">
                  {filteredEntries.map((entry) => (
                    <Card
                      className={`cursor-pointer transition-all hover:bg-accent/50 ${
                        selectedEntry === entry.name ? "bg-accent" : ""
                      }`}
                      key={entry.id}
                      onClick={() => handleEntryClick(entry.name)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getEntryIcon(selectedType)}
                            <CardTitle className="text-sm">{entry.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className="text-xs" variant="outline">
                              {getEntryRole(selectedType)}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2 text-xs">
                          {entry.description || t("codex.modal.noDescriptionAvailable")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}

                  {filteredEntries.length === 0 && !isCreating && (
                    <div className="py-8 text-center text-muted-foreground">
                      <IconComponent className="mx-auto mb-3 h-12 w-12 opacity-20" />
                      <p className="mb-2 font-medium">
                        {t("codex.modal.empty.title", { type: config.titleLower })}
                      </p>
                      <p className="text-sm">
                        {searchTerm
                          ? t("codex.modal.empty.adjustSearch")
                          : t("codex.modal.empty.createFirst", { type: config.singularLower })}
                      </p>
                      {!searchTerm && (
                        <Button className="mt-3" onClick={handleCreateNew} size="sm">
                          {t("codex.modal.actions.createNew")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1">{renderRightPanel()}</div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedEntryData && selectedType === "characters" && (
        <DeleteCharacterDialog
          character={selectedEntryData as Character}
          onOpenChange={(open) => {
            setDeleteCharacterDialogOpen(open)
            if (!open) {
              setSelectedEntry(null)
              setIsEditing(false)
            }
          }}
          open={deleteCharacterDialogOpen}
          projectId={projectId}
        />
      )}

      {selectedEntryData && selectedType === "locations" && (
        <DeleteLocationDialog
          location={selectedEntryData as Location}
          onOpenChange={(open) => {
            setDeleteLocationDialogOpen(open)
            if (!open) {
              setSelectedEntry(null)
              setIsEditing(false)
            }
          }}
          open={deleteLocationDialogOpen}
          projectId={projectId}
        />
      )}

      <CharacterDialog
        mode="create"
        onOpenChange={setCreateCharacterDialogOpen}
        open={createCharacterDialogOpen}
        projectId={projectId}
      />

      <LocationDialog
        mode="create"
        onOpenChange={setCreateLocationDialogOpen}
        open={createLocationDialogOpen}
        projectId={projectId}
      />
    </>
  )
}
