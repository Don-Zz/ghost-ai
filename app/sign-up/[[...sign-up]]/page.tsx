import { SignUp } from "@clerk/nextjs"
import { Bot, FileText, Users } from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
  },
]

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex bg-base">
      <div className="hidden lg:flex flex-col w-1/2 bg-surface border-r border-surface-border px-12 py-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-[var(--bg-base)]" />
          </div>
          <span className="text-sm font-semibold text-copy-primary">Ghost AI</span>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm">
          <h1 className="text-4xl font-bold text-copy-primary leading-tight mb-4">
            Design systems at the speed of thought.
          </h1>
          <p className="text-sm text-copy-muted leading-relaxed mb-10">
            Describe your architecture in plain English. Ghost AI maps it to a shared canvas your whole team can refine in real time.
          </p>
          <ul className="space-y-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3">
                <div className="mt-0.5 h-7 w-7 rounded-md bg-elevated border border-surface-border flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-copy-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-copy-primary">{title}</p>
                  <p className="text-xs text-copy-muted mt-0.5 leading-relaxed">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">© 2026 Ghost AI. All rights reserved.</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <SignUp />
      </div>
    </div>
  )
}
