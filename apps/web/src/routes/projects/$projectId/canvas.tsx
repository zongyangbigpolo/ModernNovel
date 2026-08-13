import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react"
import React, { useCallback, useMemo, useState } from "react"
import "@xyflow/react/dist/style.css"

import {
  BookPlus,
  Circle,
  Edit,
  FileText,
  Layers,
  Loader2,
  Network,
  Redo2,
  Sparkles,
  Square,
  Target,
  Triangle,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { GuidedTour, type TourStep, useTour } from "@/components/guided-tour"
import { NodeWritingPanel } from "@/components/node-writing-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, api, type ConnectionType, type GraphNodeType } from "@/lib/api"
import { computeTreeLayout } from "@/lib/graph-layout"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/projects/$projectId/canvas")({
  component: StoryCanvasPage,
})

// Story element types - now using our graph types
type StoryElementType = "premise" | "act" | "chapter" | "scene" | "beat" | "plot-point"

// Subtypes the expand endpoint can decompose one level down
const EXPANDABLE_SUBTYPES = new Set(["premise", "act", "chapter", "scene"])

// Steps whose targets are absent (e.g. no expand buttons on an empty canvas)
// are skipped automatically by GuidedTour
type TFunction = (key: string, params?: Record<string, string | number>) => string

function getCanvasTourSteps(t: TFunction): TourStep[] {
  return [
    {
      target: '[data-tour="premise-card"]',
      title: t("canvas.tour.premise.title"),
      body: t("canvas.tour.premise.body"),
    },
    {
      target: '[data-tour="expand-node"]',
      title: t("canvas.tour.expand.title"),
      body: t("canvas.tour.expand.body"),
    },
    {
      target: '[data-tour="canvas-elements"]',
      title: t("canvas.tour.elements.title"),
      body: t("canvas.tour.elements.body"),
    },
  ]
}

// Enhanced story node data interface matching our graph system
interface StoryNodeData extends Record<string, unknown> {
  characters: string[]

  // Visual properties
  color: string
  conflict: string
  description: string

  // Legacy field mapping
  elementType: StoryElementType

  // Story-specific fields (for backward compatibility)
  goals: string
  // Core graph node properties
  graphNodeId: string
  icon: string
  label: string
  // For character nodes: the codex character this node represents (null = unlinked placeholder)
  linkedCharacterId: string | null
  nodeType: GraphNodeType
  notes: string
  shape: string
  size: string
  subType?: string
  themes: string[]
}

// Story node type
type StoryNode = Node<StoryNodeData>

function getNodeConfigs(
  t: TFunction
): Record<
  StoryElementType,
  { color: string; icon: React.ReactNode; label: string; description: string }
> {
  return {
    premise: {
      color: "bg-indigo-500",
      icon: <Sparkles className="h-4 w-4" />,
      label: t("canvas.node.type.premise"),
      description: t("canvas.node.description.premise"),
    },
    act: {
      color: "bg-blue-500",
      icon: <Layers className="h-4 w-4" />,
      label: t("canvas.node.type.act"),
      description: t("canvas.node.description.act"),
    },
    chapter: {
      color: "bg-green-500",
      icon: <Square className="h-4 w-4" />,
      label: t("canvas.node.type.chapter"),
      description: t("canvas.node.description.chapter"),
    },
    scene: {
      color: "bg-yellow-500",
      icon: <Circle className="h-4 w-4" />,
      label: t("canvas.node.type.scene"),
      description: t("canvas.node.description.scene"),
    },
    beat: {
      color: "bg-purple-500",
      icon: <Triangle className="h-4 w-4" />,
      label: t("canvas.node.type.beat"),
      description: t("canvas.node.description.beat"),
    },
    "plot-point": {
      color: "bg-red-500",
      icon: <Target className="h-4 w-4" />,
      label: t("canvas.node.type.plotPoint"),
      description: t("canvas.node.description.plotPoint"),
    },
  }
}

function getConnectionEdgeLabel(t: TFunction, type: ConnectionType): string | undefined {
  switch (type) {
    case "character_arc":
      return t("canvas.edgeLabel.character")
    case "setting":
      return t("canvas.edgeLabel.setting")
    case "thematic":
      return t("canvas.edgeLabel.lore")
    case "plot_thread":
      return t("canvas.edgeLabel.thread")
    default:
      return
  }
}

function getConnectionTypeLabel(t: TFunction, type: ConnectionType): string {
  switch (type) {
    case "story_flow":
      return t("canvas.connection.type.storyFlow")
    case "character_arc":
      return t("canvas.connection.type.characterArc")
    case "setting":
      return t("canvas.connection.type.setting")
    case "thematic":
      return t("canvas.connection.type.thematic")
    case "plot_thread":
      return t("canvas.connection.type.plotThread")
    default:
      return t("canvas.connection.type.reference")
  }
}

function getGraphNodeTypeLabel(t: TFunction, type: GraphNodeType): string {
  switch (type) {
    case "story_element":
      return t("canvas.connection.nodeType.storyElement")
    case "character":
      return t("canvas.connection.nodeType.character")
    case "location":
      return t("canvas.connection.nodeType.location")
    case "lore":
      return t("canvas.connection.nodeType.lore")
    case "plot_thread":
      return t("canvas.connection.nodeType.plotThread")
    default:
      return t("canvas.connection.nodeType.unknown")
  }
}

function getColorOptions(t: TFunction) {
  return [
    { value: "bg-blue-500", label: `💙 ${t("canvas.colors.blue")}` },
    { value: "bg-green-500", label: `💚 ${t("canvas.colors.green")}` },
    { value: "bg-yellow-500", label: `💛 ${t("canvas.colors.yellow")}` },
    { value: "bg-purple-500", label: `💜 ${t("canvas.colors.purple")}` },
    { value: "bg-red-500", label: `❤️ ${t("canvas.colors.red")}` },
    { value: "bg-pink-500", label: `💖 ${t("canvas.colors.pink")}` },
    { value: "bg-indigo-500", label: `💙 ${t("canvas.colors.indigo")}` },
  ]
}

function getDisplayNodeConfig(t: TFunction, data: StoryNodeData) {
  const nodeConfigs = getNodeConfigs(t)

  if (data.nodeType === "story_element") {
    return {
      ...nodeConfigs[data.elementType],
      color: data.color,
    }
  }

  return {
    color: data.color,
    icon: <span className="text-sm">{data.icon}</span>,
    label: getDisplayNodeTypeLabel(t, data.nodeType),
    description: "",
  }
}

function getDisplayNodeTypeLabel(t: TFunction, nodeType: GraphNodeType): string {
  switch (nodeType) {
    case "character":
      return t("canvas.node.type.character")
    case "location":
      return t("canvas.node.type.location")
    case "lore":
      return t("canvas.node.type.lore")
    case "plot_thread":
      return t("canvas.node.type.plotThread")
    default:
      return t("canvas.node.type.node")
  }
}

// Custom Story Node Component
function StoryNode(
  props: NodeProps<StoryNode> & {
    onEdit?: (node: StoryNode) => void
    onExpand?: (graphNodeId: string, label: string) => void
  }
) {
  const { t } = useI18n()
  const { data, selected, id, onEdit, onExpand } = props
  const config = useMemo(() => getDisplayNodeConfig(t, data), [data, t])

  const isExpandable =
    data.nodeType === "story_element" && EXPANDABLE_SUBTYPES.has(data.subType ?? "")

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit({
        id,
        type: "storyNode",
        position: { x: 0, y: 0 },
        data,
      } as StoryNode)
    }
  }

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onExpand && data.graphNodeId) {
      onExpand(data.graphNodeId, data.label)
    }
  }

  return (
    <div
      className={`min-w-[200px] rounded-lg border-2 bg-background shadow-lg transition-all ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      {/* Node Header */}
      <div className={`flex items-center gap-2 rounded-t-lg p-3 text-white ${config.color}`}>
        <div className="flex-shrink-0">{config.icon}</div>
        <div className="min-w-0 flex-1 truncate font-medium text-sm">{data.label}</div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge className="text-xs" variant="secondary">
            {config.label}
          </Badge>
          {isExpandable && (
            <Button
              aria-label={t("canvas.node.actions.expandWithAI")}
              className="h-6 w-6 p-0 hover:bg-white/20"
              data-tour="expand-node"
              onClick={handleExpand}
              size="sm"
              title={t("canvas.node.actions.expandWithAI")}
              variant="ghost"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
          )}
          <Button
            aria-label={t("canvas.node.actions.edit")}
            className="h-6 w-6 p-0 hover:bg-white/20"
            onClick={handleEdit}
            size="sm"
            title={t("canvas.node.actions.edit")}
            variant="ghost"
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3">
        {data.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{data.description}</p>
        )}
        {(data.goals || data.conflict) && (
          <div className="space-y-1">
            {data.goals && (
              <div className="text-xs">
                <span className="font-medium">{t("canvas.node.fields.goal")}:</span> {data.goals}
              </div>
            )}
            {data.conflict && (
              <div className="text-xs">
                <span className="font-medium">{t("canvas.node.fields.conflict")}:</span>{" "}
                {data.conflict}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection Handles */}
      <Handle
        className="h-3 w-3 border-2 border-white bg-gray-400"
        position={Position.Top}
        type="target"
      />
      <Handle
        className="h-3 w-3 border-2 border-white bg-gray-400"
        position={Position.Bottom}
        type="source"
      />
    </div>
  )
}

// This will be moved inside the component to access state

// Initial nodes and edges - now empty, will be loaded dynamically
const initialNodes: StoryNode[] = []

const initialEdges: Edge[] = []

// Visual styling per connection type
const CONNECTION_EDGE_STYLES: Record<ConnectionType, { stroke: string; animated: boolean }> = {
  story_flow: { stroke: "#64748b", animated: true },
  character_arc: { stroke: "#3b82f6", animated: false },
  setting: { stroke: "#22c55e", animated: false },
  thematic: { stroke: "#a855f7", animated: false },
  plot_thread: { stroke: "#ef4444", animated: false },
  reference: { stroke: "#94a3b8", animated: false },
}

// Infer the semantic connection type from the two endpoint node types
function inferConnectionType(source: GraphNodeType, target: GraphNodeType): ConnectionType {
  if (source === "story_element" && target === "story_element") {
    return "story_flow"
  }
  if (source === "character" || target === "character") {
    return "character_arc"
  }
  if (source === "location" || target === "location") {
    return "setting"
  }
  if (source === "lore" || target === "lore") {
    return "thematic"
  }
  if (source === "plot_thread" || target === "plot_thread") {
    return "plot_thread"
  }
  return "reference"
}

// Main Canvas Component
function StoryCanvas() {
  const { t } = useI18n()
  const nodeConfigs = useMemo(() => getNodeConfigs(t), [t])
  const colorOptions = useMemo(() => getColorOptions(t), [t])
  const canvasTourSteps = useMemo(() => getCanvasTourSteps(t), [t])
  const { projectId } = Route.useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const tour = useTour("openwrite-tour-canvas-v1")

  // Load graph data from API
  const { data: graphNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ["graph-nodes", projectId],
    queryFn: async () => await api.graph.listNodes(projectId),
  })

  const { data: graphConnections = [] } = useQuery({
    queryKey: ["graph-connections", projectId],
    queryFn: async () => await api.graph.listConnections(projectId),
  })

  // Characters available to link into character nodes
  const { data: characters = [] } = useQuery({
    queryKey: ["characters", projectId],
    queryFn: async () => await api.characters.list(projectId),
  })

  // Convert graph nodes to ReactFlow nodes (memoized to prevent infinite loops)
  const flowNodes = useMemo(() => {
    const flowNodeList = graphNodes.map((node) => {
      const visualProps = api.graph.parseVisualProperties(node.visualProperties)
      const metadata = api.graph.parseMetadata(node.metadata) as Record<string, unknown>
      return {
        id: node.id,
        type: "storyNode",
        position: { x: node.positionX, y: node.positionY },
        data: {
          graphNodeId: node.id,
          nodeType: node.nodeType,
          subType: node.subType,
          label: node.title,
          description: node.description || "",
          color: visualProps.color || "bg-blue-500",
          size: visualProps.size || "medium",
          icon: visualProps.icon || "📝",
          shape: visualProps.shape || "rectangle",
          goals: typeof metadata.goals === "string" ? metadata.goals : "",
          conflict: typeof metadata.conflict === "string" ? metadata.conflict : "",
          notes: typeof metadata.notes === "string" ? metadata.notes : "",
          linkedCharacterId:
            typeof metadata.linkedCharacterId === "string" ? metadata.linkedCharacterId : null,
          characters: [],
          themes: [],
          elementType: (node.subType as StoryElementType) || "scene",
        },
      }
    })

    return flowNodeList
  }, [graphNodes])

  // Convert graph connections to ReactFlow edges (memoized to prevent infinite loops)
  const flowEdges = useMemo(
    () =>
      graphConnections.map((conn) => {
        const style =
          CONNECTION_EDGE_STYLES[conn.connectionType] ?? CONNECTION_EDGE_STYLES.reference
        return {
          id: conn.id,
          source: conn.sourceNodeId,
          target: conn.targetNodeId,
          type: "smoothstep",
          animated: style.animated,
          label: getConnectionEdgeLabel(t, conn.connectionType),
          style: { stroke: style.stroke, strokeWidth: 2 },
          labelStyle: { fontSize: 10, fill: style.stroke },
        }
      }),
    [graphConnections, t]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<StoryNode | null>(null)
  const [isDetailPaneOpen, setIsDetailPaneOpen] = useState(false)
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow()

  // Handle node edit functionality
  const handleNodeEdit = useCallback((node: StoryNode) => {
    setSelectedNode(node)
    setIsDetailPaneOpen(true)
  }, [])

  // Update nodes and edges when graph data loads (safe one-time update)
  React.useEffect(() => {
    if (graphNodes.length > 0) {
      setNodes(flowNodes) // Using the converted flow nodes
    }
  }, [graphNodes.length, flowNodes, setNodes])

  React.useEffect(() => {
    if (graphConnections.length > 0) {
      setEdges(flowEdges)
    }
  }, [graphConnections.length, flowEdges, setEdges])

  // A node created via the menu lands in local state only after the refetch;
  // open its detail pane once it appears rather than racing the invalidation.
  const pendingSelectIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!pendingSelectIdRef.current) {
      return
    }
    const created = flowNodes.find((node) => node.id === pendingSelectIdRef.current)
    if (created) {
      setSelectedNode(created)
      setIsDetailPaneOpen(true)
      pendingSelectIdRef.current = null
    }
  }, [flowNodes])

  // Handle node selection (sidebar only opens via edit button)
  const onNodeClick = useCallback((_: React.MouseEvent, node: StoryNode) => {
    setSelectedNode(node)
  }, [])

  // Update node position mutation
  const updateNodePositionMutation = useMutation({
    mutationFn: async ({
      nodeId,
      positionX,
      positionY,
    }: {
      nodeId: string
      positionX: number
      positionY: number
    }) => await api.graph.updateNodePosition(projectId, nodeId, positionX, positionY),
    onError: (_error: Error) => {
      // Position update failed - could show user notification here
    },
  })

  // Create connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (params: {
      sourceNodeId: string
      targetNodeId: string
      connectionType?: ConnectionType
    }) =>
      await api.graph.createConnection(projectId, {
        sourceNodeId: params.sourceNodeId,
        targetNodeId: params.targetNodeId,
        connectionType: params.connectionType || "story_flow",
        connectionStrength: 1,
        metadata: api.graph.stringifyMetadata({}),
      }),
    onSuccess: () => {
      // Refresh connections data after creation
      queryClient.invalidateQueries({ queryKey: ["graph-connections", projectId] })
    },
    onError: (_error: Error) => {
      // Connection creation failed - could show user notification here
    },
  })

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) =>
      await api.graph.deleteConnection(projectId, connectionId),
    onSuccess: () => {
      // Refresh connections data after deletion
      queryClient.invalidateQueries({ queryKey: ["graph-connections", projectId] })
    },
    onError: (_error: Error) => {
      // Connection deletion failed - could show user notification here
    },
  })

  // Delete node mutation
  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => await api.graph.deleteNode(projectId, nodeId),
    onSuccess: () => {
      // Refresh both nodes and connections data after deletion
      queryClient.invalidateQueries({ queryKey: ["graph-nodes", projectId] })
      queryClient.invalidateQueries({ queryKey: ["graph-connections", projectId] })
    },
    onError: () => {
      toast.error(t("canvas.feedback.deleteNodeFailed"))
    },
  })

  // ---------------------------------------------------------------------
  // Auto-layout: dagre tree over all nodes/edges, applied locally and
  // persisted. Runs on demand (View menu) and after every expansion.
  const applyAutoLayout = useCallback(() => {
    if (graphNodes.length === 0) {
      return
    }
    const positions = computeTreeLayout(
      graphNodes.map((node) => ({ id: node.id })),
      graphConnections.map((conn) => ({ source: conn.sourceNodeId, target: conn.targetNodeId }))
    )

    setNodes((nds) =>
      nds.map((node) => {
        const position = positions.get(node.id)
        return position ? { ...node, position } : node
      })
    )
    for (const [nodeId, position] of positions) {
      updateNodePositionMutation.mutate({
        nodeId,
        positionX: position.x,
        positionY: position.y,
      })
    }
    window.setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50)
  }, [graphNodes, graphConnections, setNodes, updateNodePositionMutation, fitView])

  // Layout must wait for the refetched nodes/edges to land in this render
  const pendingLayoutRef = React.useRef(false)
  React.useEffect(() => {
    if (pendingLayoutRef.current && graphNodes.length > 0) {
      pendingLayoutRef.current = false
      applyAutoLayout()
    }
  }, [graphNodes, applyAutoLayout])

  // ---------------------------------------------------------------------
  // Expand a story element into its next structural level via AI
  const expandToastRef = React.useRef<string | number | undefined>(undefined)
  const expandingRef = React.useRef(false)

  const expandNodeMutation = useMutation({
    mutationFn: async ({
      graphNodeId,
      instructions,
    }: {
      graphNodeId: string
      instructions?: string
    }) => await api.graph.expandNode(projectId, graphNodeId, { instructions }),
    onMutate: () => {
      expandingRef.current = true
      expandToastRef.current = toast.loading(t("canvas.feedback.expandingStoryElement"))
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["graph-nodes", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["graph-connections", projectId] }),
      ])
      pendingLayoutRef.current = true
      toast.success(t("canvas.feedback.expandSuccess", { count: result.nodes.length }), {
        id: expandToastRef.current,
      })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "no_provider") {
        toast.error(t("canvas.feedback.expandProviderRequired"), {
          id: expandToastRef.current,
          action: {
            label: t("canvas.actions.setUp"),
            onClick: () => navigate({ to: "/dashboard/ai" }),
          },
        })
        return
      }
      toast.error(error instanceof Error ? error.message : t("canvas.feedback.expandFailed"), {
        id: expandToastRef.current,
      })
    },
    onSettled: () => {
      expandingRef.current = false
    },
  })
  const { mutate: expandNode } = expandNodeMutation

  // ✨ opens a small dialog so the writer can steer the expansion (optional
  // guidance passes through as `instructions` to the expand endpoint)
  const [expandTarget, setExpandTarget] = useState<{ id: string; label: string } | null>(null)
  const [expandGuidance, setExpandGuidance] = useState("")

  const handleNodeExpand = useCallback(
    (graphNodeId: string, label: string) => {
      if (expandingRef.current) {
        toast.info(t("canvas.feedback.expansionAlreadyRunning"))
        return
      }
      setExpandTarget({ id: graphNodeId, label })
    },
    [t]
  )

  const confirmExpand = useCallback(() => {
    if (!expandTarget) {
      return
    }
    const instructions = expandGuidance.trim()
    expandNode({ graphNodeId: expandTarget.id, instructions: instructions || undefined })
    setExpandTarget(null)
    setExpandGuidance("")
  }, [expandTarget, expandGuidance, expandNode])

  // ---------------------------------------------------------------------
  // Promote a chapter node into a real manuscript chapter
  const promoteNodeMutation = useMutation({
    mutationFn: async (graphNodeId: string) => await api.graph.promoteNode(projectId, graphNodeId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["chapters", projectId] })
      queryClient.invalidateQueries({ queryKey: ["graph-nodes", projectId] })
      if (result.alreadyPromoted) {
        toast.info(t("canvas.manuscript.alreadyPromoted"), {
          action: {
            label: t("canvas.actions.openWrite"),
            onClick: () => navigate({ to: "/projects/$projectId/write", params: { projectId } }),
          },
        })
        return
      }
      toast.success(t("canvas.manuscript.promoteSuccess"), {
        action: {
          label: t("canvas.actions.openWrite"),
          onClick: () => navigate({ to: "/projects/$projectId/write", params: { projectId } }),
        },
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("canvas.manuscript.promoteFailed"))
    },
  })

  // ---------------------------------------------------------------------
  // First-run premise capture: one sentence in, a story map out
  const [premiseText, setPremiseText] = useState("")
  const [isCreatingPremise, setIsCreatingPremise] = useState(false)

  const handleCreatePremise = useCallback(async () => {
    const text = premiseText.trim()
    if (!text) {
      return
    }
    setIsCreatingPremise(true)
    try {
      const title = text.length > 60 ? `${text.slice(0, 57)}…` : text
      await api.graph.createNode(projectId, {
        nodeType: "story_element",
        subType: "premise",
        title,
        description: text,
        positionX: 0,
        positionY: 0,
        visualProperties: api.graph.stringifyVisualProperties({
          color: "bg-indigo-500",
          size: "medium",
          icon: "✨",
          shape: "rectangle",
        }),
      })
      await queryClient.invalidateQueries({ queryKey: ["graph-nodes", projectId] })
      setPremiseText("")
      toast.success(t("canvas.emptyState.premiseCreated"))
    } catch {
      toast.error(t("canvas.emptyState.premiseCreateFailed"))
    } finally {
      setIsCreatingPremise(false)
    }
  }, [premiseText, projectId, queryClient, t])

  // Create StoryNode wrapper with edit + expand functionality
  const StoryNodeWithEdit = useCallback(
    (props: NodeProps<StoryNode>) => (
      <StoryNode {...props} onEdit={handleNodeEdit} onExpand={handleNodeExpand} />
    ),
    [handleNodeEdit, handleNodeExpand]
  )

  // Node types configuration
  const nodeTypes = useMemo(
    () => ({
      storyNode: StoryNodeWithEdit,
    }),
    [StoryNodeWithEdit]
  )

  // Handle edge connections - persist to database
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        // Extract graph node IDs from React Flow node IDs
        const sourceNode = nodes.find((n) => n.id === params.source)
        const targetNode = nodes.find((n) => n.id === params.target)

        if (sourceNode?.data.graphNodeId && targetNode?.data.graphNodeId) {
          createConnectionMutation.mutate({
            sourceNodeId: sourceNode.data.graphNodeId,
            targetNodeId: targetNode.data.graphNodeId,
            connectionType: inferConnectionType(sourceNode.data.nodeType, targetNode.data.nodeType),
          })
        }
      }
    },
    [createConnectionMutation, nodes]
  )

  // Handle edge deletion - remove from database
  const onEdgesDelete = useCallback(
    (edgesToDelete: { id: string }[]) => {
      for (const edge of edgesToDelete) {
        // Find the corresponding graph connection by React Flow edge ID
        const connection = graphConnections.find((conn) => conn.id === edge.id)
        if (connection) {
          deleteConnectionMutation.mutate(connection.id)
        }
      }
    },
    [deleteConnectionMutation, graphConnections]
  )

  // Handle node deletion via ReactFlow (keyboard delete, etc.)
  const onNodesDelete = useCallback(
    (nodesToDelete: StoryNode[]) => {
      for (const node of nodesToDelete) {
        // Get the graph node ID from the node data
        const graphNodeId = node.data?.graphNodeId
        if (graphNodeId) {
          deleteNodeMutation.mutate(graphNodeId)
        }
      }
      setSelectedNode(null)
      setIsDetailPaneOpen(false)
    },
    [deleteNodeMutation]
  )

  // Handle node drag stop - update position in database
  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: StoryNode) => {
      // Extract the actual graph node ID from the React Flow node
      const graphNodeId = node.data.graphNodeId
      if (graphNodeId) {
        updateNodePositionMutation.mutate({
          nodeId: graphNodeId,
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
        })
      }
    },
    [updateNodePositionMutation]
  )

  // Track node creation state
  const [isCreatingNode, setIsCreatingNode] = React.useState(false)

  // Utility functions for graph node creation
  const getNodeConfig = useCallback(
    (type: GraphNodeType, subType?: string) => {
      // Use existing nodeConfigs for story elements
      if (type === "story_element" && subType && nodeConfigs[subType as keyof typeof nodeConfigs]) {
        return {
          color: nodeConfigs[subType as keyof typeof nodeConfigs].color,
          icon:
            typeof nodeConfigs[subType as keyof typeof nodeConfigs].icon === "string"
              ? nodeConfigs[subType as keyof typeof nodeConfigs].icon
              : "📄", // fallback for JSX icons
          label: nodeConfigs[subType as keyof typeof nodeConfigs].label,
          shape: "rectangle",
        }
      }

      // Default configs for other node types
      const defaultConfigs: Record<
        string,
        { color: string; icon: string; label: string; shape: string }
      > = {
        character: {
          color: "bg-blue-500",
          icon: "👤",
          label: t("canvas.node.type.character"),
          shape: "circle",
        },
        location: {
          color: "bg-green-500",
          icon: "🏰",
          label: t("canvas.node.type.location"),
          shape: "rectangle",
        },
        lore: {
          color: "bg-purple-500",
          icon: "📜",
          label: t("canvas.node.type.lore"),
          shape: "circle",
        },
        plot_thread: {
          color: "bg-red-500",
          icon: "🎯",
          label: t("canvas.node.type.plotThread"),
          shape: "diamond",
        },
      }

      return (
        defaultConfigs[type] || {
          color: "bg-gray-500",
          icon: "⭐",
          label: t("canvas.node.type.node"),
          shape: "rectangle",
        }
      )
    },
    [nodeConfigs, t]
  )

  const getNodeTitle = useCallback(
    (nodeType: GraphNodeType, config: ReturnType<typeof getNodeConfig>) => {
      if (nodeType === "character") {
        return t("canvas.node.creation.selectCharacter")
      }
      return t("canvas.node.creation.newItem", { label: config.label })
    },
    [t]
  )

  const getNodeDescription = useCallback(
    (nodeType: GraphNodeType) => {
      if (nodeType === "character") {
        return t("canvas.node.creation.chooseCharacter")
      }
      return ""
    },
    [t]
  )

  const getNodeMetadata = useCallback((nodeType: GraphNodeType) => {
    if (nodeType === "character") {
      // Character nodes store which existing character they represent
      return api.graph.stringifyMetadata({
        linkedCharacterId: null, // Will be set when user selects a character
        isPlaceholder: true, // Indicates this node needs character selection
      })
    }
  }, [])

  const getNodeVisualProperties = useCallback(
    (config: ReturnType<typeof getNodeConfig>) =>
      api.graph.stringifyVisualProperties({
        color: config.color,
        size: "medium",
        icon: config.icon,
        shape: config.shape,
      }),
    []
  )

  const handleNodeCreationError = useCallback((error: unknown, nodeType: GraphNodeType) => {
    // biome-ignore lint/suspicious/noConsole: User specifically requested console.error for error handling
    console.error(`Failed to create ${nodeType} node:`, error)

    // In a real app, you'd show a toast notification here
    // For now, we'll use console.error as requested
    // biome-ignore lint/suspicious/noConsole: User specifically requested console.error for error handling
    console.error(`Could not create ${nodeType} node. Please try again.`)
  }, [])

  const waitForQueryInvalidation = useCallback(
    (client: ReturnType<typeof useQueryClient>, queryKey: string[]): Promise<void> =>
      client.invalidateQueries({ queryKey }),
    []
  )

  // Create new graph node (supports all types!)
  const createGraphNode = useCallback(
    async (nodeType: GraphNodeType, subType?: string) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      const config = getNodeConfig(nodeType, subType)

      try {
        setIsCreatingNode(true)

        // Create via API
        const result = await api.graph.createNode(projectId, {
          nodeType,
          subType,
          title: getNodeTitle(nodeType, config),
          description: getNodeDescription(nodeType),
          positionX: position.x,
          positionY: position.y,
          visualProperties: getNodeVisualProperties(config),
          metadata: getNodeMetadata(nodeType),
        })

        if (result && "id" in result) {
          await waitForQueryInvalidation(queryClient, ["graph-nodes", projectId])
          // The new node selects itself once the refetched data reaches local state.
          pendingSelectIdRef.current = result.id
        }
      } catch (error) {
        handleNodeCreationError(error, nodeType)
      } finally {
        setIsCreatingNode(false)
      }
    },
    [
      screenToFlowPosition,
      projectId,
      queryClient,
      getNodeConfig,
      getNodeTitle,
      getNodeDescription,
      getNodeMetadata,
      getNodeVisualProperties,
      handleNodeCreationError,
      waitForQueryInvalidation,
    ]
  )

  // Track loading state for all graph operations
  const isGraphOperationPending = React.useMemo(
    () =>
      updateNodePositionMutation.isPending ||
      createConnectionMutation.isPending ||
      deleteConnectionMutation.isPending ||
      deleteNodeMutation.isPending ||
      isCreatingNode,
    [
      updateNodePositionMutation.isPending,
      createConnectionMutation.isPending,
      deleteConnectionMutation.isPending,
      deleteNodeMutation.isPending,
      isCreatingNode,
    ]
  )

  // Update selected node (local React Flow state only)
  const updateSelectedNode = useCallback(
    (updates: Partial<StoryNodeData>) => {
      if (!selectedNode) {
        return
      }

      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id ? { ...node, data: { ...node.data, ...updates } } : node
        )
      )
      setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...updates } } : null))
    },
    [selectedNode, setNodes]
  )

  // Persist node detail edits to the API
  const updateNodeMutation = useMutation({
    mutationFn: async ({ nodeId, data }: { nodeId: string; data: StoryNodeData }) =>
      await api.graph.updateNode(projectId, nodeId, {
        title: data.label,
        description: data.description,
        visualProperties: api.graph.stringifyVisualProperties({
          color: data.color,
          size: data.size,
          icon: data.icon,
          shape: data.shape,
        }),
        metadata: api.graph.stringifyMetadata({
          goals: data.goals,
          conflict: data.conflict,
          notes: data.notes,
          linkedCharacterId: data.linkedCharacterId,
          isPlaceholder: data.nodeType === "character" && !data.linkedCharacterId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph-nodes", projectId] })
    },
    onError: () => {
      toast.error(t("canvas.feedback.saveChangesFailed"))
    },
  })

  // Save the selected node's current detail fields (call on blur / select change)
  const persistNodeData = useCallback(
    (data: StoryNodeData) => {
      if (data.graphNodeId) {
        updateNodeMutation.mutate({ nodeId: data.graphNodeId, data })
      }
    },
    [updateNodeMutation]
  )

  const persistSelectedNode = useCallback(() => {
    if (selectedNode) {
      persistNodeData(selectedNode.data)
    }
  }, [selectedNode, persistNodeData])

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) {
      return
    }

    // Get the graph node ID from the selected node data
    const graphNodeId = selectedNode.data.graphNodeId
    if (graphNodeId) {
      deleteNodeMutation.mutate(graphNodeId)
    }

    setSelectedNode(null)
    setIsDetailPaneOpen(false)
  }, [selectedNode, deleteNodeMutation])

  return (
    <div className="h-screen w-full">
      {/* Menubar */}
      <Menubar className="rounded-none border-b">
        <MenubarMenu>
          <MenubarTrigger data-tour="canvas-elements">{t("canvas.menu.elements")}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => createGraphNode("story_element", "act")}>
              <Layers className="mr-2 h-4 w-4" />
              {t("canvas.menu.newAct")} <MenubarShortcut>⌘1</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("story_element", "chapter")}>
              <Square className="mr-2 h-4 w-4" />
              {t("canvas.menu.newChapter")} <MenubarShortcut>⌘2</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("story_element", "scene")}>
              <Circle className="mr-2 h-4 w-4" />
              {t("canvas.menu.newScene")} <MenubarShortcut>⌘3</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("story_element", "beat")}>
              <Triangle className="mr-2 h-4 w-4" />
              {t("canvas.menu.newBeat")} <MenubarShortcut>⌘4</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => createGraphNode("story_element", "plot-point")}>
              <Target className="mr-2 h-4 w-4" />
              {t("canvas.menu.newPlotPoint")} <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => createGraphNode("character")}>
              <Circle className="mr-2 h-4 w-4" />
              {t("canvas.menu.newCharacter")} <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("location")}>
              <Square className="mr-2 h-4 w-4" />
              {t("canvas.menu.newLocation")} <MenubarShortcut>⌘L</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("lore")}>
              <FileText className="mr-2 h-4 w-4" />
              {t("canvas.menu.newLore")} <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("plot_thread")}>
              <Target className="mr-2 h-4 w-4" />
              {t("canvas.menu.newPlotThread")} <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>{t("canvas.menu.view")}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => zoomIn()}>
              <ZoomIn className="mr-2 h-4 w-4" />
              {t("canvas.menu.zoomIn")} <MenubarShortcut>⌘+</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => zoomOut()}>
              <ZoomOut className="mr-2 h-4 w-4" />
              {t("canvas.menu.zoomOut")} <MenubarShortcut>⌘-</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => fitView()}>
              <FileText className="mr-2 h-4 w-4" />
              {t("canvas.menu.fitView")} <MenubarShortcut>⌘0</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={applyAutoLayout}>
              <Network className="mr-2 h-4 w-4" />
              {t("canvas.menu.autoLayout")}
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={tour.start}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("canvas.menu.showGuide")}
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>{t("canvas.menu.edit")}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem disabled>
              <Undo2 className="mr-2 h-4 w-4" />
              {t("canvas.menu.undo")} <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>
              <Redo2 className="mr-2 h-4 w-4" />
              {t("canvas.menu.redo")} <MenubarShortcut>⌘⇧Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled={!selectedNode} onClick={deleteSelectedNode}>
              {t("canvas.menu.deleteSelected")} <MenubarShortcut>⌫</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Loading indicator */}
        {isGraphOperationPending && (
          <div className="ml-auto flex items-center px-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        )}
      </Menubar>

      {/* React Flow Canvas */}
      <div className="h-[calc(100vh-40px)]">
        <ReactFlow
          ariaLabelConfig={{
            "controls.ariaLabel": t("canvas.controls.label"),
            "controls.fitView.ariaLabel": t("canvas.controls.fitView"),
            "controls.interactive.ariaLabel": t("canvas.controls.toggleInteractivity"),
            "controls.zoomIn.ariaLabel": t("canvas.controls.zoomIn"),
            "controls.zoomOut.ariaLabel": t("canvas.controls.zoomOut"),
          }}
          defaultEdgeOptions={{
            animated: true,
            type: "smoothstep",
          }}
          edges={edges}
          fitView
          nodes={nodes}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onNodesChange={onNodesChange}
          onNodesDelete={onNodesDelete}
          snapGrid={[20, 20]}
          snapToGrid
        >
          <Controls position="bottom-right" />
          <Background gap={20} size={1} variant={BackgroundVariant.Dots} />

          {/* First-run premise capture: seed the story map from one idea */}
          {!nodesLoading && graphNodes.length === 0 && (
            <Panel className="w-[420px] max-w-[90vw]" position="top-center">
              <div
                className="mt-16 space-y-4 rounded-xl border bg-background/95 p-6 shadow-lg backdrop-blur-sm"
                data-tour="premise-card"
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-500 p-2 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="font-semibold text-lg">{t("canvas.emptyState.title")}</h2>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("canvas.emptyState.description")}
                </p>
                <Textarea
                  className="min-h-[80px] resize-none"
                  onChange={(e) => setPremiseText(e.target.value)}
                  placeholder={t("canvas.emptyState.placeholder")}
                  rows={3}
                  value={premiseText}
                />
                <Button
                  className="w-full"
                  disabled={isCreatingPremise || !premiseText.trim()}
                  onClick={handleCreatePremise}
                  type="button"
                >
                  {isCreatingPremise ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {t("canvas.emptyState.createPremise")}
                </Button>
              </div>
            </Panel>
          )}

          {/* Info Panel */}
          <Panel
            className="rounded-lg bg-background/80 p-3 text-sm backdrop-blur-sm"
            position="top-right"
          >
            <div className="space-y-1 text-muted-foreground">
              <div>{t("canvas.info.elements", { count: nodes.length })}</div>
              <div>{t("canvas.info.connections", { count: edges.length })}</div>
              <div>
                {t("canvas.info.selected", { name: selectedNode?.data.label || t("common.none") })}
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* First-visit walkthrough; replayable via View → Show guide */}
      <GuidedTour
        onFinish={tour.finish}
        open={tour.open && !nodesLoading}
        steps={canvasTourSteps}
      />

      {/* Expansion guidance dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setExpandTarget(null)
          }
        }}
        open={Boolean(expandTarget)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t("canvas.dialog.expand.title", { name: expandTarget?.label ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("canvas.dialog.expand.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="expand-guidance">
              {t("canvas.dialog.expand.guidance")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("common.optional").toLowerCase()})
              </span>
            </Label>
            <Textarea
              className="min-h-[72px] resize-none"
              id="expand-guidance"
              onChange={(e) => setExpandGuidance(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  confirmExpand()
                }
              }}
              placeholder={t("canvas.dialog.expand.placeholder")}
              rows={3}
              value={expandGuidance}
            />
            <p className="text-muted-foreground text-xs">{t("canvas.dialog.expand.hint")}</p>
          </div>
          <DialogFooter>
            <Button onClick={confirmExpand} type="button">
              <Sparkles className="mr-2 h-4 w-4" />
              {t("canvas.dialog.expand.button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Pane */}
      <Sheet onOpenChange={setIsDetailPaneOpen} open={isDetailPaneOpen}>
        <SheetContent className="w-[450px] sm:w-[600px]">
          {selectedNode && (
            <>
              <SheetHeader className="px-2 pb-4">
                <SheetTitle className="flex items-center gap-3 text-xl">
                  <div className={`rounded-lg p-2 text-white ${selectedNode.data.color}`}>
                    {getDisplayNodeConfig(t, selectedNode.data).icon}
                  </div>
                  {t("canvas.detail.editTitle", {
                    label: getDisplayNodeConfig(t, selectedNode.data).label,
                  })}
                </SheetTitle>
                <SheetDescription className="text-base">
                  {t("canvas.detail.description")}
                </SheetDescription>
              </SheetHeader>

              <div className="px-2">
                <Tabs className="w-full" defaultValue="overview">
                  <TabsList
                    className={`grid h-12 w-full ${
                      selectedNode.data.nodeType === "story_element" ? "grid-cols-4" : "grid-cols-3"
                    }`}
                  >
                    <TabsTrigger className="text-sm" value="overview">
                      {t("canvas.tabs.overview")}
                    </TabsTrigger>
                    <TabsTrigger className="text-sm" value="story">
                      {t("canvas.tabs.story")}
                    </TabsTrigger>
                    {selectedNode.data.nodeType === "story_element" && (
                      <TabsTrigger className="text-sm" value="writing">
                        {t("canvas.tabs.writing")}
                      </TabsTrigger>
                    )}
                    <TabsTrigger className="text-sm" value="connections">
                      {t("canvas.tabs.links")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent className="space-y-5 px-1" value="overview">
                    {selectedNode.data.nodeType === "character" && (
                      <div className="space-y-2">
                        <Label className="font-medium text-sm">
                          {t("canvas.detail.linkedCharacter")}
                        </Label>
                        <Select
                          onValueChange={(characterId) => {
                            const character = characters.find((c) => c.id === characterId)
                            if (!character) {
                              return
                            }
                            updateSelectedNode({
                              label: character.name,
                              linkedCharacterId: character.id,
                            })
                            persistNodeData({
                              ...selectedNode.data,
                              label: character.name,
                              linkedCharacterId: character.id,
                            })
                          }}
                          value={selectedNode.data.linkedCharacterId ?? ""}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={t("canvas.detail.chooseCharacter")} />
                          </SelectTrigger>
                          <SelectContent>
                            {characters.map((character) => (
                              <SelectItem key={character.id} value={character.id}>
                                {character.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {characters.length === 0 && (
                          <p className="text-muted-foreground text-xs">
                            {t("canvas.detail.noCharacters")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="title">
                        {t("canvas.detail.title")}
                      </Label>
                      <Input
                        className="h-11"
                        id="title"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ label: e.target.value })}
                        value={selectedNode.data.label}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="description">
                        {t("common.description")}
                      </Label>
                      <Textarea
                        className="min-h-[90px] resize-none"
                        id="description"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ description: e.target.value })}
                        placeholder={t("canvas.detail.descriptionPlaceholder")}
                        rows={3}
                        value={selectedNode.data.description}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="color">
                        {t("canvas.detail.colorTheme")}
                      </Label>
                      <Select
                        onValueChange={(color) => {
                          updateSelectedNode({ color })
                          persistNodeData({ ...selectedNode.data, color })
                        }}
                        value={selectedNode.data.color}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent className="space-y-5 px-1" value="story">
                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="goals">
                        {t("canvas.story.goals")}
                      </Label>
                      <Textarea
                        className="min-h-[80px] resize-none"
                        id="goals"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ goals: e.target.value })}
                        placeholder={t("canvas.story.goalsPlaceholder")}
                        rows={3}
                        value={selectedNode.data.goals}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="conflict">
                        {t("canvas.story.conflict")}
                      </Label>
                      <Textarea
                        className="min-h-[80px] resize-none"
                        id="conflict"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ conflict: e.target.value })}
                        placeholder={t("canvas.story.conflictPlaceholder")}
                        rows={3}
                        value={selectedNode.data.conflict}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="notes">
                        {t("canvas.story.notesIdeas")}
                      </Label>
                      <Textarea
                        className="min-h-[100px] resize-none"
                        id="notes"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ notes: e.target.value })}
                        placeholder={t("canvas.story.notesPlaceholder")}
                        rows={4}
                        value={selectedNode.data.notes}
                      />
                    </div>
                  </TabsContent>

                  {selectedNode.data.nodeType === "story_element" && (
                    <TabsContent className="px-1" value="writing">
                      <NodeWritingPanel
                        nodeId={selectedNode.data.graphNodeId}
                        projectId={projectId}
                      />
                    </TabsContent>
                  )}

                  <TabsContent className="space-y-5 px-1" value="connections">
                    <div className="space-y-2">
                      <Label className="font-medium text-sm">
                        {t("canvas.connections.connectedElements")}
                      </Label>
                      {graphConnections.filter(
                        (conn) =>
                          conn.sourceNodeId === selectedNode.data.graphNodeId ||
                          conn.targetNodeId === selectedNode.data.graphNodeId
                      ).length === 0 ? (
                        <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground text-sm">
                          {t("canvas.connections.empty")}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {graphConnections
                            .filter(
                              (conn) =>
                                conn.sourceNodeId === selectedNode.data.graphNodeId ||
                                conn.targetNodeId === selectedNode.data.graphNodeId
                            )
                            .map((conn) => {
                              const isOutgoing = conn.sourceNodeId === selectedNode.data.graphNodeId
                              const otherId = isOutgoing ? conn.targetNodeId : conn.sourceNodeId
                              const other = graphNodes.find((n) => n.id === otherId)
                              return (
                                <div
                                  className="flex items-center justify-between rounded-lg border bg-background p-2.5"
                                  key={conn.id}
                                >
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-sm">
                                      {isOutgoing ? "→ " : "← "}
                                      {other?.title ?? t("canvas.connections.unknownNode")}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {other
                                        ? getGraphNodeTypeLabel(t, other.nodeType)
                                        : t("canvas.connection.nodeType.unknown")}
                                    </div>
                                  </div>
                                  <Badge className="ml-2 shrink-0 text-xs" variant="outline">
                                    {getConnectionTypeLabel(t, conn.connectionType)}
                                  </Badge>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm">{t("canvas.storyFlow.title")}</Label>
                      <div className="rounded-lg border bg-background p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                            {
                              edges.filter(
                                (e) => e.source === selectedNode.id || e.target === selectedNode.id
                              ).length
                            }
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {edges.filter(
                                (e) => e.source === selectedNode.id || e.target === selectedNode.id
                              ).length === 1
                                ? t("canvas.storyFlow.connection")
                                : t("canvas.storyFlow.connections")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("canvas.storyFlow.description")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {selectedNode.data.nodeType === "story_element" &&
                selectedNode.data.subType === "chapter" && (
                  <div className="border-t px-2 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{t("canvas.manuscript.title")}</h4>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {t("canvas.manuscript.description")}
                        </p>
                      </div>
                      <Button
                        disabled={promoteNodeMutation.isPending}
                        onClick={() => promoteNodeMutation.mutate(selectedNode.data.graphNodeId)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <BookPlus className="mr-2 h-4 w-4" />
                        {t("canvas.manuscript.button")}
                      </Button>
                    </div>
                  </div>
                )}

              <div className="border-t px-2 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{t("canvas.danger.title")}</h4>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {t("canvas.danger.description")}
                    </p>
                  </div>
                  <ConfirmDialog
                    cancelText={t("common.cancel")}
                    confirmText={t("common.delete")}
                    description={t("canvas.danger.deleteDescription", {
                      name: selectedNode.data.label,
                    })}
                    onConfirm={deleteSelectedNode}
                    title={t("canvas.danger.deleteTitle")}
                    variant="destructive"
                  >
                    <Button size="sm" variant="destructive">
                      {t("canvas.danger.deleteButton")}
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Main component with React Flow Provider
function StoryCanvasPage() {
  return (
    <ReactFlowProvider>
      <StoryCanvas />
    </ReactFlowProvider>
  )
}
