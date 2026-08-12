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

export const Route = createFileRoute("/projects/$projectId/canvas")({
  component: StoryCanvasPage,
})

// Story element types - now using our graph types
type StoryElementType = "premise" | "act" | "chapter" | "scene" | "beat" | "plot-point"

// Subtypes the expand endpoint can decompose one level down
const EXPANDABLE_SUBTYPES = new Set(["premise", "act", "chapter", "scene"])

// Steps whose targets are absent (e.g. no expand buttons on an empty canvas)
// are skipped automatically by GuidedTour
const CANVAS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="premise-card"]',
    title: "Start with a premise",
    body: "One sentence is enough — it becomes the root node of your story map, ready to expand.",
  },
  {
    target: '[title="Expand with AI"]',
    title: "Expand any element",
    body: "The sparkle button breaks an element into the next level — premise into acts, acts into chapters, chapters into scenes. Add optional guidance to steer it.",
  },
  {
    target: '[data-tour="canvas-elements"]',
    title: "Add elements by hand",
    body: "Acts, scenes, beats, characters, locations, and lore — drop them anywhere and connect them by dragging between node handles.",
  },
]

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

// Node type configurations
const nodeConfigs = {
  premise: {
    color: "bg-indigo-500",
    icon: <Sparkles className="h-4 w-4" />,
    label: "Premise",
    description: "The story's core idea",
  },
  act: {
    color: "bg-blue-500",
    icon: <Layers className="h-4 w-4" />,
    label: "Act",
    description: "Major story divisions",
  },
  chapter: {
    color: "bg-green-500",
    icon: <Square className="h-4 w-4" />,
    label: "Chapter",
    description: "Narrative divisions with scenes",
  },
  scene: {
    color: "bg-yellow-500",
    icon: <Circle className="h-4 w-4" />,
    label: "Scene",
    description: "Individual dramatic units",
  },
  beat: {
    color: "bg-purple-500",
    icon: <Triangle className="h-4 w-4" />,
    label: "Beat",
    description: "Smallest story moments",
  },
  "plot-point": {
    color: "bg-red-500",
    icon: <Target className="h-4 w-4" />,
    label: "Plot Point",
    description: "Key story turning points",
  },
}

// Custom Story Node Component
function StoryNode(
  props: NodeProps<StoryNode> & {
    onEdit?: (node: StoryNode) => void
    onExpand?: (graphNodeId: string, label: string) => void
  }
) {
  const { data, selected, id, onEdit, onExpand } = props
  const config = nodeConfigs[data.elementType]

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
              className="h-6 w-6 p-0 hover:bg-white/20"
              onClick={handleExpand}
              size="sm"
              title="Expand with AI"
              variant="ghost"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
          )}
          <Button
            className="h-6 w-6 p-0 hover:bg-white/20"
            onClick={handleEdit}
            size="sm"
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
                <span className="font-medium">Goal:</span> {data.goals}
              </div>
            )}
            {data.conflict && (
              <div className="text-xs">
                <span className="font-medium">Conflict:</span> {data.conflict}
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
const CONNECTION_EDGE_STYLES: Record<
  ConnectionType,
  { stroke: string; animated: boolean; label?: string }
> = {
  story_flow: { stroke: "#64748b", animated: true },
  character_arc: { stroke: "#3b82f6", animated: false, label: "character" },
  setting: { stroke: "#22c55e", animated: false, label: "setting" },
  thematic: { stroke: "#a855f7", animated: false, label: "lore" },
  plot_thread: { stroke: "#ef4444", animated: false, label: "thread" },
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
          label: style.label,
          style: { stroke: style.stroke, strokeWidth: 2 },
          labelStyle: { fontSize: 10, fill: style.stroke },
        }
      }),
    [graphConnections]
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
      toast.error("Failed to delete node. Please try again.")
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
      expandToastRef.current = toast.loading("Expanding story element…")
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["graph-nodes", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["graph-connections", projectId] }),
      ])
      pendingLayoutRef.current = true
      toast.success(`Added ${result.nodes.length} connected elements`, {
        id: expandToastRef.current,
      })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "no_provider") {
        toast.error("Connect an AI provider to expand story elements.", {
          id: expandToastRef.current,
          action: {
            label: "Set up",
            onClick: () => navigate({ to: "/dashboard/ai" }),
          },
        })
        return
      }
      toast.error(error instanceof Error ? error.message : "Failed to expand this element", {
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

  const handleNodeExpand = useCallback((graphNodeId: string, label: string) => {
    if (expandingRef.current) {
      toast.info("An expansion is already running…")
      return
    }
    setExpandTarget({ id: graphNodeId, label })
  }, [])

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
        toast.info("This chapter is already in your manuscript.", {
          action: {
            label: "Open Write",
            onClick: () => navigate({ to: "/projects/$projectId/write", params: { projectId } }),
          },
        })
        return
      }
      toast.success("Chapter added to your manuscript.", {
        action: {
          label: "Open Write",
          onClick: () => navigate({ to: "/projects/$projectId/write", params: { projectId } }),
        },
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to promote this chapter")
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
      toast.success("Premise created — press its ✨ button to expand it into acts.")
    } catch {
      toast.error("Failed to create the premise. Please try again.")
    } finally {
      setIsCreatingPremise(false)
    }
  }, [premiseText, projectId, queryClient])

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
  const getNodeConfig = useCallback((type: GraphNodeType, subType?: string) => {
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
      character: { color: "bg-blue-500", icon: "👤", label: "Character", shape: "circle" },
      location: { color: "bg-green-500", icon: "🏰", label: "Location", shape: "rectangle" },
      lore: { color: "bg-purple-500", icon: "📜", label: "Lore", shape: "circle" },
      plot_thread: { color: "bg-red-500", icon: "🎯", label: "Plot Thread", shape: "diamond" },
    }

    return (
      defaultConfigs[type] || {
        color: "bg-gray-500",
        icon: "⭐",
        label: "Node",
        shape: "rectangle",
      }
    )
  }, [])

  const getNodeTitle = useCallback(
    (nodeType: GraphNodeType, config: ReturnType<typeof getNodeConfig>) => {
      if (nodeType === "character") {
        return "Select Character"
      }
      return `New ${config.label}`
    },
    []
  )

  const getNodeDescription = useCallback((nodeType: GraphNodeType) => {
    if (nodeType === "character") {
      return "Choose an existing character to place in your story"
    }
    return ""
  }, [])

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
      toast.error("Failed to save changes")
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
          <MenubarTrigger data-tour="canvas-elements">Elements</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => createGraphNode("story_element", "act")}>
              <Layers className="mr-2 h-4 w-4" />
              New Act <MenubarShortcut>⌘1</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("story_element", "chapter")}>
              <Square className="mr-2 h-4 w-4" />
              New Chapter <MenubarShortcut>⌘2</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("story_element", "scene")}>
              <Circle className="mr-2 h-4 w-4" />
              New Scene <MenubarShortcut>⌘3</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("story_element", "beat")}>
              <Triangle className="mr-2 h-4 w-4" />
              New Beat <MenubarShortcut>⌘4</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => createGraphNode("story_element", "plot-point")}>
              <Target className="mr-2 h-4 w-4" />
              New Plot Point <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => createGraphNode("character")}>
              <Circle className="mr-2 h-4 w-4" />
              New Character <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("location")}>
              <Square className="mr-2 h-4 w-4" />
              New Location <MenubarShortcut>⌘L</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("lore")}>
              <FileText className="mr-2 h-4 w-4" />
              New Lore <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => createGraphNode("plot_thread")}>
              <Target className="mr-2 h-4 w-4" />
              New Plot Thread <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => zoomIn()}>
              <ZoomIn className="mr-2 h-4 w-4" />
              Zoom In <MenubarShortcut>⌘+</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => zoomOut()}>
              <ZoomOut className="mr-2 h-4 w-4" />
              Zoom Out <MenubarShortcut>⌘-</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => fitView()}>
              <FileText className="mr-2 h-4 w-4" />
              Fit View <MenubarShortcut>⌘0</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={applyAutoLayout}>
              <Network className="mr-2 h-4 w-4" />
              Auto-layout
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={tour.start}>
              <Sparkles className="mr-2 h-4 w-4" />
              Show guide
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem disabled>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>
              <Redo2 className="mr-2 h-4 w-4" />
              Redo <MenubarShortcut>⌘⇧Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled={!selectedNode} onClick={deleteSelectedNode}>
              Delete Selected <MenubarShortcut>⌫</MenubarShortcut>
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
                  <h2 className="font-semibold text-lg">Start your story map</h2>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Describe your story in a sentence or two. Then expand it — premise into acts, acts
                  into chapters, chapters into scenes — each level graphically connected to the
                  last.
                </p>
                <Textarea
                  className="min-h-[80px] resize-none"
                  onChange={(e) => setPremiseText(e.target.value)}
                  placeholder="A lighthouse keeper discovers the ships she guides ashore arrive from a century in the past…"
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
                  Create premise
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
              <div>Elements: {nodes.length}</div>
              <div>Connections: {edges.length}</div>
              <div>Selected: {selectedNode?.data.label || "None"}</div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* First-visit walkthrough; replayable via View → Show guide */}
      <GuidedTour
        onFinish={tour.finish}
        open={tour.open && !nodesLoading}
        steps={CANVAS_TOUR_STEPS}
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
              Expand “{expandTarget?.label}”
            </DialogTitle>
            <DialogDescription>
              AI breaks this element into the next level of your story, connected on the canvas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="expand-guidance">
              Guidance <span className="font-normal text-muted-foreground">(optional)</span>
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
              placeholder="Steer the expansion — e.g. “darker tone, five chapters, end on a betrayal”"
              rows={3}
              value={expandGuidance}
            />
            <p className="text-muted-foreground text-xs">
              Press Enter to expand, Shift+Enter for a new line.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={confirmExpand} type="button">
              <Sparkles className="mr-2 h-4 w-4" />
              Expand
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
                    {nodeConfigs[selectedNode.data.elementType].icon}
                  </div>
                  Edit {nodeConfigs[selectedNode.data.elementType].label}
                </SheetTitle>
                <SheetDescription className="text-base">
                  Configure the details for this story element
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
                      Overview
                    </TabsTrigger>
                    <TabsTrigger className="text-sm" value="story">
                      Story
                    </TabsTrigger>
                    {selectedNode.data.nodeType === "story_element" && (
                      <TabsTrigger className="text-sm" value="writing">
                        Writing
                      </TabsTrigger>
                    )}
                    <TabsTrigger className="text-sm" value="connections">
                      Links
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent className="space-y-5 px-1" value="overview">
                    {selectedNode.data.nodeType === "character" && (
                      <div className="space-y-2">
                        <Label className="font-medium text-sm">Linked Character</Label>
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
                            <SelectValue placeholder="Choose a character" />
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
                            No characters yet — add some in the Codex first.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="title">
                        Title
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
                        Description
                      </Label>
                      <Textarea
                        className="min-h-[90px] resize-none"
                        id="description"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ description: e.target.value })}
                        placeholder="Describe this story element..."
                        rows={3}
                        value={selectedNode.data.description}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="color">
                        Color Theme
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
                          <SelectItem value="bg-blue-500">💙 Blue</SelectItem>
                          <SelectItem value="bg-green-500">💚 Green</SelectItem>
                          <SelectItem value="bg-yellow-500">💛 Yellow</SelectItem>
                          <SelectItem value="bg-purple-500">💜 Purple</SelectItem>
                          <SelectItem value="bg-red-500">❤️ Red</SelectItem>
                          <SelectItem value="bg-pink-500">💖 Pink</SelectItem>
                          <SelectItem value="bg-indigo-500">💙 Indigo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent className="space-y-5 px-1" value="story">
                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="goals">
                        Goals
                      </Label>
                      <Textarea
                        className="min-h-[80px] resize-none"
                        id="goals"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ goals: e.target.value })}
                        placeholder="What does the character want to achieve in this part?"
                        rows={3}
                        value={selectedNode.data.goals}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="conflict">
                        Conflict
                      </Label>
                      <Textarea
                        className="min-h-[80px] resize-none"
                        id="conflict"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ conflict: e.target.value })}
                        placeholder="What obstacles, challenges, or tensions arise?"
                        rows={3}
                        value={selectedNode.data.conflict}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="notes">
                        Notes & Ideas
                      </Label>
                      <Textarea
                        className="min-h-[100px] resize-none"
                        id="notes"
                        onBlur={persistSelectedNode}
                        onChange={(e) => updateSelectedNode({ notes: e.target.value })}
                        placeholder="Additional notes, inspiration, and creative ideas..."
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
                      <Label className="font-medium text-sm">Connected Elements</Label>
                      {graphConnections.filter(
                        (conn) =>
                          conn.sourceNodeId === selectedNode.data.graphNodeId ||
                          conn.targetNodeId === selectedNode.data.graphNodeId
                      ).length === 0 ? (
                        <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground text-sm">
                          No connections yet. Drag from a node's bottom handle to another node's top
                          handle to link them — connections feed AI draft generation.
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
                                      {other?.title ?? "Unknown node"}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {other?.nodeType.replace("_", " ")}
                                    </div>
                                  </div>
                                  <Badge className="ml-2 shrink-0 text-xs" variant="outline">
                                    {conn.connectionType.replace("_", " ")}
                                  </Badge>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm">Story Flow</Label>
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
                                ? "Connection"
                                : "Connections"}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Links to other story elements
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
                        <h4 className="font-medium text-sm">Manuscript</h4>
                        <p className="mt-1 text-muted-foreground text-xs">
                          Send this chapter to the Write editor
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
                        Promote to manuscript
                      </Button>
                    </div>
                  </div>
                )}

              <div className="border-t px-2 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Danger Zone</h4>
                    <p className="mt-1 text-muted-foreground text-xs">
                      This action cannot be undone
                    </p>
                  </div>
                  <ConfirmDialog
                    confirmText="Delete"
                    description={`Are you sure you want to delete "${selectedNode.data.label}"? This will permanently remove the story element and all its connections. This action cannot be undone.`}
                    onConfirm={deleteSelectedNode}
                    title="Delete Story Element"
                    variant="destructive"
                  >
                    <Button size="sm" variant="destructive">
                      Delete Element
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
