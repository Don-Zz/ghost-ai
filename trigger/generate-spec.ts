import { schemaTask } from "@trigger.dev/sdk"
import { z } from "zod"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { put } from "@vercel/blob"
import prisma from "@/lib/prisma"

const NodeSchema = z.object({
  id: z.string(),
  data: z.object({ label: z.string().optional(), color: z.string().optional(), shape: z.string().optional() }).passthrough(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
}).passthrough()

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  data: z.object({ label: z.string().optional() }).passthrough().optional(),
}).passthrough()

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
})

export const generateSpecTask = schemaTask({
  id: "generate-spec",
  maxDuration: 300,
  schema: z.object({
    projectId: z.string(),
    roomId: z.string(),
    chatHistory: z.array(ChatMessageSchema).default([]),
    nodes: z.array(NodeSchema).default([]),
    edges: z.array(EdgeSchema).default([]),
  }),
  run: async (payload) => {
    const { projectId, nodes, edges, chatHistory } = payload

    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

    const nodesDesc = nodes
      .map((n) => `- ${n.data?.shape ?? "node"} "${n.data?.label ?? n.id}"`)
      .join("\n")
    const edgesDesc = edges
      .map((e) => {
        const label = e.data?.label ? ` (${e.data.label})` : ""
        return `- ${e.source} → ${e.target}${label}`
      })
      .join("\n")
    const historyContext =
      chatHistory.length > 0
        ? `\n## Conversation Context\n${chatHistory.map((m) => `**${m.role}**: ${m.content}`).join("\n\n")}`
        : ""

    const prompt = [
      "Generate a comprehensive technical specification document in Markdown for this architecture diagram.",
      "",
      `## Components (${nodes.length} nodes)`,
      nodesDesc || "No nodes defined.",
      "",
      `## Connections (${edges.length} edges)`,
      edgesDesc || "No connections defined.",
      historyContext,
      "",
      "The specification must include: system overview, component descriptions, data flows, API contracts, scalability considerations, and deployment notes.",
    ].join("\n")

    const { text: specContent } = await generateText({
      model: openrouter("openai/gpt-oss-20b:free"),
      system:
        "You are Ghost AI, a technical writer and software architect. Write clear, thorough Markdown technical specifications. Use proper Markdown headings, lists, and code blocks.",
      prompt,
      maxOutputTokens: 4000,
    })

    // Create DB record to get the auto-generated ID
    const record = await prisma.projectSpec.create({
      data: { projectId, filePath: "pending" },
      select: { id: true },
    })

    // Upload Markdown to Vercel Blob using the record ID for the path
    const blob = await put(`specs/${projectId}/${record.id}.md`, specContent, {
      access: "private",
      contentType: "text/markdown; charset=utf-8",
      allowOverwrite: true,
    })

    // Persist the Blob URL
    await prisma.projectSpec.update({
      where: { id: record.id },
      data: { filePath: blob.url },
    })

    return { spec: specContent, specId: record.id }
  },
})
