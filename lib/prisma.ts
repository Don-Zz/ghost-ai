import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// pg v9 emits a SECURITY WARNING about sslmode aliases that surfaces in the
// Next.js dev overlay. Filter it out — our sslmode=require is correct for the provider.
const _origEmitWarning = process.emitWarning.bind(process)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(process as any).emitWarning = function (warning: unknown, ...args: unknown[]) {
  if (typeof warning === "string" && warning.includes("SSL modes") && warning.includes("aliases")) {
    return
  }
  return (_origEmitWarning as (...a: unknown[]) => void)(warning, ...args)
}

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL!
  if (url.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: url })
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof createPrismaClient>
} & typeof global

// In development, re-use the cached client only if it was created with the
// same PrismaClient class. When `prisma generate` runs and Turbopack HMRs
// the generated client module, PrismaClient becomes a new class reference,
// so instanceof returns false and a fresh client is created automatically.
const prisma =
  process.env.NODE_ENV !== "production" &&
  globalThis.prismaGlobal instanceof PrismaClient
    ? globalThis.prismaGlobal
    : createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma
}

export default prisma
