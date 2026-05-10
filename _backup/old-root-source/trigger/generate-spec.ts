import { schemaTask, metadata, logger } from "@trigger.dev/sdk"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { z } from "zod"

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
})

const PayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(ChatMessageSchema),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
})

const SYSTEM_PROMPT = `You are Ghost AI, a senior software architect. Generate a concise, well-structured Markdown technical specification from the canvas diagram and chat context provided.

The spec must include:
1. **Overview** — what the system does and its main purpose
2. **Architecture** — the components visible in the canvas, their roles, and how they relate
3. **Data Flow** — how data moves between components (derived from edges)
4. **Key Design Decisions** — notable patterns, tradeoffs, and rationale
5. **Implementation Notes** — actionable guidance for engineers building this system

Rules:
- Use clear Markdown headings (##, ###)
- Keep prose concise — prefer bullet points over paragraphs for component descriptions
- Reference canvas nodes by their labels
- Incorporate relevant context from the chat history
- Output only the Markdown document — no preamble, no code fences around the whole doc`

export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: PayloadSchema,
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },

  run: async (payload) => {
    const { projectId, roomId, chatHistory, nodes, edges } = payload

    logger.info("generate-spec started", { projectId, roomId, nodeCount: nodes.length, edgeCount: edges.length })
    metadata.set("status", "starting").set("projectId", projectId)

    // Build the prompt
    const chatContext =
      chatHistory.length > 0
        ? chatHistory
            .map((m) => `**${m.role === "user" ? "User" : "AI"}:** ${m.content}`)
            .join("\n\n")
        : "_No chat history provided._"

    const nodesContext =
      nodes.length > 0
        ? JSON.stringify(
            nodes.map((n) => {
              const data = (n as Record<string, unknown>).data as Record<string, unknown> | undefined
              return {
                id: (n as Record<string, unknown>).id,
                label: data?.label,
                shape: data?.shape,
              }
            }),
            null,
            2,
          )
        : "_No nodes on canvas._"

    const edgesContext =
      edges.length > 0
        ? JSON.stringify(
            edges.map((e) => {
              const data = (e as Record<string, unknown>).data as Record<string, unknown> | undefined
              return {
                id: (e as Record<string, unknown>).id,
                source: (e as Record<string, unknown>).source,
                target: (e as Record<string, unknown>).target,
                label: data?.label,
              }
            }),
            null,
            2,
          )
        : "_No edges on canvas._"

    const userPrompt = [
      "## Canvas Nodes",
      nodesContext,
      "",
      "## Canvas Edges",
      edgesContext,
      "",
      "## Chat History",
      chatContext,
      "",
      "Generate a technical specification for this system architecture.",
    ].join("\n")

    metadata.set("status", "generating")
    logger.info("calling OpenRouter for spec generation")

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })

    const { text } = await generateText({
      model: openrouter("openai/gpt-oss-20b:free"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    })

    metadata.set("status", "complete").set("specLength", text.length)
    logger.info("generate-spec complete", { specLength: text.length })

    return { spec: text }
  },
})
