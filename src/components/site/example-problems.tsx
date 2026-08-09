"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const problems = [
  "Why is my Next.js application slow?",
  "How should I architect my SaaS backend?",
  "Should I use PostgreSQL or MongoDB?",
  "How should I structure my Node.js services?",
  "How can I add RAG to my application?",
  "How do I prepare for an SDE-2 interview?",
  "Can you review my architecture?",
  "How should I scale my API?",
  "How can I reduce my LLM costs?",
];

export function ExampleProblems() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-indigo-400">Sound familiar?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Problems I help solve every week</h2>
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-3">
          {problems.map((problem, i) => (
            <button
              key={problem}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-all",
                active === i
                  ? "border-indigo-500/60 bg-indigo-500/10 text-foreground scale-[1.03]"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
              type="button"
            >
              &ldquo;{problem}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
