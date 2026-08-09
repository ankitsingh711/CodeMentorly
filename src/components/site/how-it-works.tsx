import { CalendarCheck, MessageSquareText, Video } from "lucide-react";

const steps = [
  {
    icon: MessageSquareText,
    title: "Choose a session",
    description: "Pick the offering that matches what you need help with.",
  },
  {
    icon: CalendarCheck,
    title: "Pick a convenient time",
    description: "See real availability and book instantly in your timezone.",
  },
  {
    icon: Video,
    title: "Meet and solve the problem",
    description: "Join the call and leave with concrete answers and next steps.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-indigo-400">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Booked in under 3 minutes</h2>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative rounded-xl border border-border bg-card p-6">
              <span className="text-xs font-mono text-muted-foreground">0{i + 1}</span>
              <step.icon className="mt-4 h-6 w-6 text-indigo-400" />
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
