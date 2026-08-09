import { Code, Rocket, Users, Search, Brain, Package, Target } from "lucide-react";

const segments = [
  {
    icon: Code,
    title: "Software developers",
    description: "Get a second opinion on tricky bugs, patterns, or code you're not sure about.",
  },
  {
    icon: Rocket,
    title: "Startup founders",
    description: "Validate your technical architecture before you commit engineering time to it.",
  },
  {
    icon: Users,
    title: "Engineering teams",
    description: "Bring in an outside perspective for architecture or code review sessions.",
  },
  {
    icon: Search,
    title: "Job seekers",
    description: "Practice real interview conditions and get direct, actionable feedback.",
  },
  {
    icon: Brain,
    title: "Developers transitioning into AI",
    description: "Learn how to actually ship LLM features, RAG systems, and agents in production.",
  },
  {
    icon: Package,
    title: "People building SaaS products",
    description: "Get help with backend architecture, APIs, and scaling decisions.",
  },
  {
    icon: Target,
    title: "Interview candidates",
    description: "Sharpen system design and technical interview skills before the real thing.",
  },
];

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-indigo-400">Who this is for</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Built for people who build things</h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <div key={segment.title} className="rounded-xl border border-border bg-card p-6">
              <segment.icon className="h-5 w-5 text-indigo-400" />
              <h3 className="mt-4 font-semibold">{segment.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{segment.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
