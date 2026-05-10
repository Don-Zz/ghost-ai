import { z } from "zod"

export const AiStatusSchema = z.object({
  text: z.string().optional(),
})
export type AiStatusPayload = z.infer<typeof AiStatusSchema>

export function isAiStatusPayload(value: unknown): value is AiStatusPayload {
  return AiStatusSchema.safeParse(value).success
}

export const ChatMessageSchema = z.object({
  sender: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>
