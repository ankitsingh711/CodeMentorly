import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { Offering } from "@prisma/client";

export function ServiceCard({ offering }: { offering: Offering }) {
  return (
    <Card className="flex h-full flex-col transition-colors hover:border-indigo-500/40">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-lg font-semibold leading-snug">{offering.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{offering.tagline}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-2xl font-semibold tracking-tight">
            {formatPrice(offering.priceCents, offering.currency)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(offering.durationMinutes)}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{offering.description}</p>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Who it&apos;s for</p>
          <p className="mt-1.5 text-sm">{offering.audience}</p>
        </div>

        <ul className="space-y-2">
          {offering.deliverables.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Button asChild className="group mt-auto">
          <Link href={`/book/${offering.slug}`}>
            Book this session
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
