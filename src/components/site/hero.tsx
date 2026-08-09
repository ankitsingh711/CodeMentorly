import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-background" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          1:1 sessions · guest booking · no account required
        </div>

        <h1 className="text-balance max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Build Better. Ship Faster.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Get Unstuck.
          </span>
        </h1>

        <p className="text-balance mt-6 max-w-xl text-lg text-muted-foreground">
          Book 1:1 time with an experienced software engineer for technical guidance, code reviews,
          system design, AI engineering, and career mentorship.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="group">
            <Link href="/#services">
              Book a Session
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/#services">Explore Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
