import { Code2, Globe2, Layers, Sparkles } from "lucide-react";
import { site } from "@/lib/site";

const metrics = [
  { label: "4+ Years Engineering Experience", icon: Layers },
  { label: "Full Stack + AI", icon: Sparkles },
  { label: "Remote Collaboration", icon: Globe2 },
  { label: "Production Systems", icon: Code2 },
];

const coreTech = [
  "React",
  "Next.js",
  "Node.js",
  "TypeScript",
  "PostgreSQL",
  "System Design",
  "LLM / RAG",
  "AI Agents",
];

export function Profile() {
  return (
    <section id="about" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-medium text-indigo-400">About your mentor</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{site.ownerName}</h2>
            <p className="mt-1 text-muted-foreground">{site.ownerRole}</p>
            <p className="mt-6 text-muted-foreground">
              I help developers, founders, and engineering teams solve real technical problems — from
              debugging a gnarly production issue to designing a system from scratch, reviewing an
              architecture, or getting unstuck on an AI feature. Sessions are practical, direct, and
              focused entirely on your problem.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {coreTech.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-indigo-500/40"
              >
                <metric.icon className="h-5 w-5 text-indigo-400" />
                <p className="mt-4 text-sm font-medium leading-snug">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
