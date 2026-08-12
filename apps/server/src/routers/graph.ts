import { OpenAPIHono } from "@hono/zod-openapi"
import { and, asc, eq, inArray, or } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db"
import { chapter, graphConnection, graphNode, project, textBlock } from "../db/schema"
import {
  buildExpansionPrompt,
  EXPANSION_CHILD_SUBTYPE,
  EXPANSION_SYSTEM_PROMPT,
  isExpandableSubType,
  parseExpansionResponse,
} from "../lib/story-expansion"
import { countWordsInHtml } from "../lib/word-count"
import { requireAuth, verifyProjectAccess } from "../middleware/auth"
import { isCompletionFailure, runCompletionForUser } from "./ai"
import { getOrCreatePrimaryWork, listProjectChapters, syncProjectWordCount } from "./content"

interface Env {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
  ENCRYPTION_KEY: string
}

interface Variables {
  activeOrganization: {
    id: string
    name: string
    slug: string
  } | null
  session: {
    id: string
    userId: string
  }
  user: {
    id: string
    email: string
    name: string
  }
}

const app = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>()

// Move regex to top level to avoid performance issues
const WORD_SPLIT_REGEX = /\s+/

function countWords(content: string | null | undefined): number {
  const trimmed = content?.trim()
  if (!trimmed) {
    return 0
  }
  return trimmed.split(WORD_SPLIT_REGEX).length
}

// Keep graphNode.wordCount in sync with the sum of its text blocks
async function syncNodeWordCount(nodeId: string): Promise<void> {
  const blocks = await db
    .select({ wordCount: textBlock.wordCount })
    .from(textBlock)
    .where(eq(textBlock.storyNodeId, nodeId))

  const total = blocks.reduce((sum, block) => sum + (block.wordCount ?? 0), 0)

  await db
    .update(graphNode)
    .set({ wordCount: total, updatedAt: new Date() })
    .where(eq(graphNode.id, nodeId))
}

// Zod schemas for validation
const CreateGraphNodeSchema = z.object({
  nodeType: z.enum(["story_element", "character", "location", "lore", "plot_thread"]),
  subType: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  visualProperties: z.string().optional(), // JSON string
  metadata: z.string().optional(), // JSON string
})

const CreateTextBlockSchema = z.object({
  storyNodeId: z.string(),
  content: z.string().optional(),
  orderIndex: z.number().default(0),
})

const CreateConnectionSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  connectionType: z.enum([
    "story_flow",
    "character_arc",
    "setting",
    "plot_thread",
    "thematic",
    "reference",
  ]),
  connectionStrength: z.number().min(1).max(5).default(1),
  visualProperties: z.string().optional(), // JSON string
  metadata: z.string().optional(),
})

// Apply auth middleware only to the graph namespace
app.use("/projects/*", requireAuth)
// Verify project access for all project-specific routes
app.use("/projects/:projectId/*", verifyProjectAccess)

// Get all graph nodes for a project
app.openapi(
  {
    method: "get",
    path: "/projects/{projectId}/graph/nodes",
    request: {
      params: z.object({
        projectId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              nodes: z.array(z.unknown()),
            }),
          },
        },
        description: "Graph nodes retrieved successfully",
      },
    },
  },
  async (c) => {
    const { projectId } = c.req.valid("param")

    const nodes = await db.select().from(graphNode).where(eq(graphNode.projectId, projectId))

    return c.json({ nodes })
  }
)

// Update graph node position
app.openapi(
  {
    method: "put",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/position",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              positionX: z.number(),
              positionY: z.number(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Node position updated successfully",
      },
    },
  },
  async (c) => {
    const { nodeId } = c.req.valid("param")
    const { positionX, positionY } = c.req.valid("json")

    const now = new Date()

    await db
      .update(graphNode)
      .set({
        positionX,
        positionY,
        updatedAt: now,
      })
      .where(eq(graphNode.id, nodeId))

    return c.json({ success: true })
  }
)

// Update a graph node's content fields
app.openapi(
  {
    method: "put",
    path: "/projects/{projectId}/graph/nodes/{nodeId}",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: z.string().min(1).optional(),
              description: z.string().optional(),
              subType: z.string().optional(),
              visualProperties: z.string().optional(), // JSON string
              metadata: z.string().optional(), // JSON string
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Graph node updated successfully",
      },
    },
  },
  async (c) => {
    const { projectId, nodeId } = c.req.valid("param")
    const updates = c.req.valid("json")

    await db
      .update(graphNode)
      .set({
        ...(updates.title === undefined ? {} : { title: updates.title }),
        ...(updates.description === undefined ? {} : { description: updates.description }),
        ...(updates.subType === undefined ? {} : { subType: updates.subType }),
        ...(updates.visualProperties === undefined
          ? {}
          : { visualProperties: updates.visualProperties }),
        ...(updates.metadata === undefined ? {} : { metadata: updates.metadata }),
        updatedAt: new Date(),
      })
      .where(and(eq(graphNode.id, nodeId), eq(graphNode.projectId, projectId)))

    return c.json({ success: true })
  }
)

// Create a new graph node
app.openapi(
  {
    method: "post",
    path: "/projects/{projectId}/graph/nodes",
    request: {
      params: z.object({
        projectId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateGraphNodeSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              id: z.string(),
            }),
          },
        },
        description: "Graph node created successfully",
      },
    },
  },
  async (c) => {
    const { projectId } = c.req.valid("param")
    const nodeData = c.req.valid("json")

    const nodeId = crypto.randomUUID()
    const now = new Date()

    // Map camelCase API fields to snake_case database fields
    await db.insert(graphNode).values({
      id: nodeId,
      projectId,
      nodeType: nodeData.nodeType,
      subType: nodeData.subType,
      title: nodeData.title,
      description: nodeData.description,
      positionX: nodeData.positionX || 0,
      positionY: nodeData.positionY || 0,
      visualProperties: nodeData.visualProperties,
      metadata: nodeData.metadata,
      wordCount: 0, // Default for new nodes
      createdAt: now,
      updatedAt: now,
    })

    return c.json({ success: true, id: nodeId }, 201)
  }
)

// Get all text blocks for a story node
app.openapi(
  {
    method: "get",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/text-blocks",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              textBlocks: z.array(z.unknown()),
            }),
          },
        },
        description: "Text blocks retrieved successfully",
      },
    },
  },
  async (c) => {
    const { nodeId } = c.req.valid("param")

    const blocks = await db
      .select()
      .from(textBlock)
      .where(eq(textBlock.storyNodeId, nodeId))
      .orderBy(asc(textBlock.orderIndex), asc(textBlock.createdAt))

    return c.json({ textBlocks: blocks })
  }
)

// Create a text block for a story node
app.openapi(
  {
    method: "post",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/text-blocks",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateTextBlockSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              id: z.string(),
            }),
          },
        },
        description: "Text block created successfully",
      },
    },
  },
  async (c) => {
    const blockData = c.req.valid("json")

    const blockId = crypto.randomUUID()
    const now = new Date()

    // Map camelCase API fields to proper database fields
    await db.insert(textBlock).values({
      id: blockId,
      storyNodeId: blockData.storyNodeId,
      content: blockData.content,
      orderIndex: blockData.orderIndex || 0,
      wordCount: countWords(blockData.content),
      createdAt: now,
      updatedAt: now,
    })

    await syncNodeWordCount(blockData.storyNodeId)

    return c.json({ success: true, id: blockId }, 201)
  }
)

// Update a text block
app.openapi(
  {
    method: "put",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/text-blocks/{blockId}",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
        blockId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              content: z.string().optional(),
              orderIndex: z.number().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              wordCount: z.number(),
            }),
          },
        },
        description: "Text block updated successfully",
      },
    },
  },
  async (c) => {
    const { nodeId, blockId } = c.req.valid("param")
    const updates = c.req.valid("json")
    const wordCount = countWords(updates.content)

    await db
      .update(textBlock)
      .set({
        ...(updates.content === undefined ? {} : { content: updates.content, wordCount }),
        ...(updates.orderIndex === undefined ? {} : { orderIndex: updates.orderIndex }),
        updatedAt: new Date(),
      })
      .where(and(eq(textBlock.id, blockId), eq(textBlock.storyNodeId, nodeId)))

    await syncNodeWordCount(nodeId)

    return c.json({ success: true, wordCount })
  }
)

// Delete a text block
app.openapi(
  {
    method: "delete",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/text-blocks/{blockId}",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
        blockId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Text block deleted successfully",
      },
    },
  },
  async (c) => {
    const { nodeId, blockId } = c.req.valid("param")

    await db
      .delete(textBlock)
      .where(and(eq(textBlock.id, blockId), eq(textBlock.storyNodeId, nodeId)))

    await syncNodeWordCount(nodeId)

    return c.json({ success: true })
  }
)

// Get all connections for a project
app.openapi(
  {
    method: "get",
    path: "/projects/{projectId}/graph/connections",
    request: {
      params: z.object({
        projectId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              connections: z.array(z.unknown()),
            }),
          },
        },
        description: "Graph connections retrieved successfully",
      },
    },
  },
  async (c) => {
    const { projectId } = c.req.valid("param")

    const connections = await db
      .select()
      .from(graphConnection)
      .where(eq(graphConnection.projectId, projectId))

    return c.json({ connections })
  }
)

// Create a connection between nodes
app.openapi(
  {
    method: "post",
    path: "/projects/{projectId}/graph/connections",
    request: {
      params: z.object({
        projectId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateConnectionSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              id: z.string(),
            }),
          },
        },
        description: "Graph connection created successfully",
      },
    },
  },
  async (c) => {
    const { projectId } = c.req.valid("param")
    const connectionData = c.req.valid("json")

    const connectionId = crypto.randomUUID()
    const now = new Date()

    // Map camelCase API fields to proper database fields
    await db.insert(graphConnection).values({
      id: connectionId,
      projectId,
      sourceNodeId: connectionData.sourceNodeId,
      targetNodeId: connectionData.targetNodeId,
      connectionType: connectionData.connectionType,
      connectionStrength: connectionData.connectionStrength || 1,
      visualProperties: connectionData.visualProperties,
      metadata: connectionData.metadata,
      createdAt: now,
      updatedAt: now,
    })

    return c.json({ success: true, id: connectionId }, 201)
  }
)

// Delete a graph node
app.openapi(
  {
    method: "delete",
    path: "/projects/{projectId}/graph/nodes/{nodeId}",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Graph node deleted successfully",
      },
    },
  },
  async (c) => {
    const { nodeId } = c.req.valid("param")

    // Delete associated text blocks first (cascade delete)
    await db.delete(textBlock).where(eq(textBlock.storyNodeId, nodeId))

    // Delete associated connections where this node is source or target
    await db.delete(graphConnection).where(eq(graphConnection.sourceNodeId, nodeId))
    await db.delete(graphConnection).where(eq(graphConnection.targetNodeId, nodeId))

    // Finally delete the node itself
    await db.delete(graphNode).where(eq(graphNode.id, nodeId))

    return c.json({ success: true })
  }
)

// ---------------------------------------------------------------------------
// AI generation for a story element node, using its graph connections as context

const GENERATION_SYSTEM_PROMPT = `You are a fiction ghostwriter for OpenWrite.
Write polished narrative prose for the requested story element, staying consistent with the provided characters, settings, lore, and preceding events.
Match the tone of any existing text. Output ONLY the prose passage — no preamble, no headings, no commentary.`

const TRUNCATE_DESCRIPTION = 300
const TRUNCATE_PREDECESSOR_TEXT = 1200
const TRUNCATE_EXISTING_TEXT = 2000
const MAX_PREDECESSORS = 3

type LoadedNode = typeof graphNode.$inferSelect

function describeNodes(label: string, nodes: LoadedNode[]): string[] {
  if (nodes.length === 0) {
    return []
  }
  const lines = [`${label}:`]
  for (const item of nodes) {
    const description = item.description
      ? ` — ${item.description.slice(0, TRUNCATE_DESCRIPTION)}`
      : ""
    lines.push(`- ${item.title}${description}`)
  }
  return lines
}

function parseNodeMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) {
    return {}
  }
  try {
    return JSON.parse(metadata) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function loadNodeText(nodeId: string, maxChars: number): Promise<string> {
  const blocks = await db
    .select({ content: textBlock.content })
    .from(textBlock)
    .where(eq(textBlock.storyNodeId, nodeId))
    .orderBy(asc(textBlock.orderIndex), asc(textBlock.createdAt))

  const combined = blocks
    .map((block) => block.content ?? "")
    .filter(Boolean)
    .join("\n\n")

  return combined.length > maxChars ? combined.slice(-maxChars) : combined
}

interface GenerationContext {
  characters: LoadedNode[]
  locations: LoadedNode[]
  lore: LoadedNode[]
  plotThreads: LoadedNode[]
  predecessors: { node: LoadedNode; text: string }[]
}

async function loadGenerationContext(
  projectId: string,
  nodeId: string
): Promise<GenerationContext> {
  const connections = await db
    .select()
    .from(graphConnection)
    .where(
      and(
        eq(graphConnection.projectId, projectId),
        or(eq(graphConnection.sourceNodeId, nodeId), eq(graphConnection.targetNodeId, nodeId))
      )
    )

  const connectedIds = [
    ...new Set(
      connections.flatMap((conn) =>
        [conn.sourceNodeId, conn.targetNodeId].filter((id) => id !== nodeId)
      )
    ),
  ]

  const connectedNodes =
    connectedIds.length > 0
      ? await db.select().from(graphNode).where(inArray(graphNode.id, connectedIds))
      : []
  const byId = new Map(connectedNodes.map((node) => [node.id, node]))

  const context: GenerationContext = {
    characters: [],
    locations: [],
    lore: [],
    plotThreads: [],
    predecessors: [],
  }

  const predecessorNodes: LoadedNode[] = []
  const bucketByNodeType: Record<string, LoadedNode[] | undefined> = {
    character: context.characters,
    location: context.locations,
    lore: context.lore,
    plot_thread: context.plotThreads,
  }

  for (const conn of connections) {
    const otherId = conn.sourceNodeId === nodeId ? conn.targetNodeId : conn.sourceNodeId
    const other = byId.get(otherId)
    if (!other) {
      continue
    }
    if (conn.connectionType === "story_flow") {
      // story_flow points source -> target; predecessors are sources into this node
      if (conn.targetNodeId === nodeId && predecessorNodes.length < MAX_PREDECESSORS) {
        predecessorNodes.push(other)
      }
      continue
    }
    bucketByNodeType[other.nodeType]?.push(other)
  }

  for (const predecessor of predecessorNodes) {
    context.predecessors.push({
      node: predecessor,
      text: await loadNodeText(predecessor.id, TRUNCATE_PREDECESSOR_TEXT),
    })
  }

  return context
}

function buildGenerationPrompt(options: {
  projectTitle: string
  projectGenre: string | null
  node: LoadedNode
  context: GenerationContext
  existingText: string
  instructions?: string
}): string {
  const { node, context } = options
  const metadata = parseNodeMetadata(node.metadata)
  const lines: string[] = []

  lines.push(
    `PROJECT: ${options.projectTitle}${options.projectGenre ? ` (${options.projectGenre})` : ""}`
  )
  lines.push("")
  lines.push(`STORY ELEMENT TO WRITE: ${node.title}${node.subType ? ` (${node.subType})` : ""}`)
  if (node.description) {
    lines.push(`Summary: ${node.description.slice(0, 600)}`)
  }
  for (const key of ["goals", "conflict", "notes"]) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) {
      lines.push(`${key.toUpperCase()}: ${value.slice(0, TRUNCATE_DESCRIPTION)}`)
    }
  }

  lines.push(...describeNodes("CHARACTERS IN THIS ELEMENT", context.characters))
  lines.push(...describeNodes("SETTINGS", context.locations))
  lines.push(...describeNodes("LORE / WORLD RULES", context.lore))
  lines.push(...describeNodes("PLOT THREADS", context.plotThreads))

  for (const predecessor of context.predecessors) {
    lines.push("")
    lines.push(`WHAT HAPPENS BEFORE — ${predecessor.node.title}:`)
    lines.push(predecessor.text || predecessor.node.description || "(no content yet)")
  }

  if (options.existingText) {
    lines.push("")
    lines.push("EXISTING TEXT OF THIS ELEMENT (continue from here, do not repeat it):")
    lines.push(options.existingText)
  }

  lines.push("")
  if (options.instructions) {
    lines.push(`ADDITIONAL INSTRUCTIONS: ${options.instructions.slice(0, 1000)}`)
  }
  lines.push(
    options.existingText
      ? "Write the next passage (roughly 300-600 words) continuing this element."
      : "Write the opening passage (roughly 300-600 words) for this element."
  )

  return lines.join("\n")
}

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
})

const errorContent = {
  content: { "application/json": { schema: errorResponseSchema } },
  description: "Error",
}

// Generate a draft passage for a story element using its connected context
app.openapi(
  {
    method: "post",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/generate",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              instructions: z.string().max(2000).optional(),
              model: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              blockId: z.string(),
              content: z.string(),
              wordCount: z.number(),
              provider: z.string(),
              model: z.string().nullable(),
            }),
          },
        },
        description: "Draft generated and saved as a text block",
      },
      400: errorContent,
      404: errorContent,
      412: errorContent,
      500: errorContent,
      502: errorContent,
    },
  },
  async (c) => {
    const { projectId, nodeId } = c.req.valid("param")
    const { instructions, model } = c.req.valid("json")
    const user = c.get("user")

    const node = await db
      .select()
      .from(graphNode)
      .where(and(eq(graphNode.id, nodeId), eq(graphNode.projectId, projectId)))
      .get()

    if (!node) {
      return c.json({ error: "Node not found" }, 404)
    }
    if (node.nodeType !== "story_element") {
      return c.json({ error: "Drafts can only be generated for story elements" }, 400)
    }

    const projectData = await db
      .select({ title: project.title, genre: project.genre })
      .from(project)
      .where(eq(project.id, projectId))
      .get()

    if (!projectData) {
      return c.json({ error: "Project not found" }, 404)
    }

    const [context, existingText] = await Promise.all([
      loadGenerationContext(projectId, nodeId),
      loadNodeText(nodeId, TRUNCATE_EXISTING_TEXT),
    ])

    const prompt = buildGenerationPrompt({
      projectTitle: projectData.title,
      projectGenre: projectData.genre,
      node,
      context,
      existingText,
      instructions,
    })

    const result = await runCompletionForUser({
      userId: user.id,
      env: c.env,
      system: GENERATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      model,
    })

    if (isCompletionFailure(result)) {
      return c.json({ error: result.error, code: result.code }, result.status)
    }

    // Persist the draft as a new text block at the end of the node
    const existingBlocks = await db
      .select({ id: textBlock.id })
      .from(textBlock)
      .where(eq(textBlock.storyNodeId, nodeId))

    const blockId = crypto.randomUUID()
    const now = new Date()
    const wordCount = countWords(result.message)

    await db.insert(textBlock).values({
      id: blockId,
      storyNodeId: nodeId,
      content: result.message,
      orderIndex: existingBlocks.length,
      wordCount,
      createdAt: now,
      updatedAt: now,
    })

    await syncNodeWordCount(nodeId)

    return c.json(
      {
        success: true,
        blockId,
        content: result.message,
        wordCount,
        provider: result.provider,
        model: result.model,
      },
      200
    )
  }
)

// ---------------------------------------------------------------------------
// Node expansion — decompose a story element into the next structural level
// (premise → acts → chapters → scenes → beats), created as connected nodes.

const CHILD_SUBTYPE_COLORS: Record<string, string> = {
  act: "bg-blue-500",
  chapter: "bg-green-500",
  scene: "bg-yellow-500",
  beat: "bg-purple-500",
}

const MAX_ANCESTOR_DEPTH = 3

// Walk metadata.parentNodeId links upward so expansion prompts know the
// element's place in the whole story (outermost ancestor first).
async function loadAncestorChain(node: LoadedNode): Promise<LoadedNode[]> {
  const ancestors: LoadedNode[] = []
  let current = node
  while (ancestors.length < MAX_ANCESTOR_DEPTH) {
    const parentId = parseNodeMetadata(current.metadata).parentNodeId
    if (typeof parentId !== "string") {
      break
    }
    const parent = await db.select().from(graphNode).where(eq(graphNode.id, parentId)).get()
    if (!parent) {
      break
    }
    ancestors.unshift(parent)
    current = parent
  }
  return ancestors
}

function toContextItems(nodes: LoadedNode[]): { description: string | null; title: string }[] {
  return nodes.map((item) => ({ title: item.title, description: item.description }))
}

app.openapi(
  {
    method: "post",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/expand",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              instructions: z.string().max(2000).optional(),
              model: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              nodes: z.array(z.unknown()),
              connections: z.array(z.unknown()),
              provider: z.string(),
              model: z.string().nullable(),
            }),
          },
        },
        description: "Node expanded into connected child elements",
      },
      400: errorContent,
      404: errorContent,
      412: errorContent,
      500: errorContent,
      502: errorContent,
    },
  },
  async (c) => {
    const { projectId, nodeId } = c.req.valid("param")
    const { instructions, model } = c.req.valid("json")
    const user = c.get("user")

    const node = await db
      .select()
      .from(graphNode)
      .where(and(eq(graphNode.id, nodeId), eq(graphNode.projectId, projectId)))
      .get()

    if (!node) {
      return c.json({ error: "Node not found" }, 404)
    }
    if (node.nodeType !== "story_element" || !isExpandableSubType(node.subType)) {
      return c.json({ error: "Only premise, act, chapter, and scene nodes can be expanded" }, 400)
    }
    const childSubType = EXPANSION_CHILD_SUBTYPE[node.subType]

    const projectData = await db
      .select({ title: project.title, genre: project.genre })
      .from(project)
      .where(eq(project.id, projectId))
      .get()

    if (!projectData) {
      return c.json({ error: "Project not found" }, 404)
    }

    const [context, ancestors] = await Promise.all([
      loadGenerationContext(projectId, nodeId),
      loadAncestorChain(node),
    ])

    const prompt = buildExpansionPrompt({
      projectTitle: projectData.title,
      projectGenre: projectData.genre,
      node: { title: node.title, description: node.description },
      nodeSubType: node.subType,
      childSubType,
      ancestors: toContextItems(ancestors),
      characters: toContextItems(context.characters),
      locations: toContextItems(context.locations),
      lore: toContextItems(context.lore),
      instructions,
    })

    const result = await runCompletionForUser({
      userId: user.id,
      env: c.env,
      system: EXPANSION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      model,
    })

    if (isCompletionFailure(result)) {
      return c.json({ error: result.error, code: result.code }, result.status)
    }

    const children = parseExpansionResponse(result.message)
    if (!children) {
      return c.json(
        { error: "The AI response could not be parsed into story elements. Try again." },
        502
      )
    }

    const now = new Date()
    const color = CHILD_SUBTYPE_COLORS[childSubType] ?? "bg-gray-500"

    const createdNodes = children.map((child, index) => ({
      id: crypto.randomUUID(),
      projectId,
      nodeType: "story_element" as const,
      subType: childSubType,
      title: child.title,
      description: child.description,
      // Fan the children out beneath the parent; the client auto-layouts after
      positionX: Math.round((node.positionX ?? 0) + (index - (children.length - 1) / 2) * 280),
      positionY: Math.round((node.positionY ?? 0) + 240),
      visualProperties: JSON.stringify({ color, size: "medium", icon: "📄", shape: "rectangle" }),
      metadata: JSON.stringify({ parentNodeId: node.id }),
      wordCount: 0,
      createdAt: now,
      updatedAt: now,
    }))

    // Tree edges (parent → each child) plus story_flow between consecutive
    // siblings — the same edges the per-node generate endpoint reads as
    // "what happens before".
    const createdConnections: (typeof graphConnection.$inferInsert)[] = []
    for (const [index, child] of createdNodes.entries()) {
      createdConnections.push({
        id: crypto.randomUUID(),
        projectId,
        sourceNodeId: node.id,
        targetNodeId: child.id,
        connectionType: "reference",
        connectionStrength: 1,
        metadata: JSON.stringify({ relation: "expansion" }),
        createdAt: now,
        updatedAt: now,
      })
      if (index > 0) {
        createdConnections.push({
          id: crypto.randomUUID(),
          projectId,
          sourceNodeId: createdNodes[index - 1].id,
          targetNodeId: child.id,
          connectionType: "story_flow",
          connectionStrength: 1,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    await db.insert(graphNode).values(createdNodes)
    await db.insert(graphConnection).values(createdConnections)

    return c.json(
      {
        success: true,
        nodes: createdNodes,
        connections: createdConnections,
        provider: result.provider,
        model: result.model,
      },
      200
    )
  }
)

// ---------------------------------------------------------------------------
// Promote a chapter-level node into a real manuscript chapter, so the story
// map terminates in the Write editor instead of dead-ending on the canvas.

const PARAGRAPH_SPLIT = /\n{2,}/
const AMPERSAND = /&/g
const LESS_THAN = /</g
const GREATER_THAN = />/g
const SINGLE_NEWLINE = /\n/g

function escapeHtml(text: string): string {
  return text.replace(AMPERSAND, "&amp;").replace(LESS_THAN, "&lt;").replace(GREATER_THAN, "&gt;")
}

// Text blocks are plain text/markdown; the manuscript editor stores HTML.
function textToChapterHtml(text: string): string {
  const paragraphs = text
    .split(PARAGRAPH_SPLIT)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(SINGLE_NEWLINE, "<br>")}</p>`)
    .join("")
}

const PROMOTE_TEXT_LIMIT = 200_000

app.openapi(
  {
    method: "post",
    path: "/projects/{projectId}/graph/nodes/{nodeId}/promote",
    request: {
      params: z.object({
        projectId: z.string(),
        nodeId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              chapterId: z.string(),
              alreadyPromoted: z.boolean(),
            }),
          },
        },
        description: "Node promoted to a manuscript chapter",
      },
      400: errorContent,
      404: errorContent,
    },
  },
  async (c) => {
    const { projectId, nodeId } = c.req.valid("param")

    const node = await db
      .select()
      .from(graphNode)
      .where(and(eq(graphNode.id, nodeId), eq(graphNode.projectId, projectId)))
      .get()

    if (!node) {
      return c.json({ error: "Node not found" }, 404)
    }
    if (node.nodeType !== "story_element" || node.subType !== "chapter") {
      return c.json({ error: "Only chapter nodes can be promoted to the manuscript" }, 400)
    }

    // Re-promoting returns the existing chapter instead of duplicating it
    const metadata = parseNodeMetadata(node.metadata)
    if (typeof metadata.promotedChapterId === "string") {
      const existing = await db
        .select({ id: chapter.id })
        .from(chapter)
        .where(eq(chapter.id, metadata.promotedChapterId))
        .get()
      if (existing) {
        return c.json({ success: true, chapterId: existing.id, alreadyPromoted: true }, 200)
      }
    }

    const workId = await getOrCreatePrimaryWork(projectId)
    if (!workId) {
      return c.json({ error: "Project not found" }, 404)
    }

    const existingChapters = await listProjectChapters(projectId)
    const nodeText = await loadNodeText(nodeId, PROMOTE_TEXT_LIMIT)
    const content = textToChapterHtml(nodeText)

    const chapterId = crypto.randomUUID()
    const now = new Date()

    await db.insert(chapter).values({
      id: chapterId,
      title: node.title,
      content,
      summary: node.description ?? null,
      wordCount: countWordsInHtml(content),
      order: existingChapters.length + 1,
      status: "draft",
      workId,
      createdAt: now,
      updatedAt: now,
    })

    await syncProjectWordCount(projectId, false)

    await db
      .update(graphNode)
      .set({
        metadata: JSON.stringify({ ...metadata, promotedChapterId: chapterId }),
        updatedAt: now,
      })
      .where(eq(graphNode.id, nodeId))

    return c.json({ success: true, chapterId, alreadyPromoted: false }, 200)
  }
)

// Delete a connection
app.openapi(
  {
    method: "delete",
    path: "/projects/{projectId}/graph/connections/{connectionId}",
    request: {
      params: z.object({
        projectId: z.string(),
        connectionId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Graph connection deleted successfully",
      },
    },
  },
  async (c) => {
    const { connectionId } = c.req.valid("param")

    await db.delete(graphConnection).where(eq(graphConnection.id, connectionId))

    return c.json({ success: true })
  }
)

export default app
