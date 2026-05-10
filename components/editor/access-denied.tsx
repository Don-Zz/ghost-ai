import Link from "next/link"
import { Lock } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function AccessDenied() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Lock className="h-8 w-8 text-copy-muted" />
      <div className="text-center">
        <h1 className="text-lg font-semibold text-copy-primary">Access Denied</h1>
        <p className="mt-1 text-sm text-copy-muted">
          This project doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
      </div>
      <Link href="/editor" className={buttonVariants({ variant: "outline" })}>
        Back to Editor
      </Link>
    </div>
  )
}
