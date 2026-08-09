"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Offering } from "@prisma/client";

const formSchema = z.object({
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  name: z.string().trim().min(2),
  tagline: z.string().trim().min(2),
  description: z.string().trim().min(10),
  audience: z.string().trim().min(2),
  deliverables: z.string().trim().min(2),
  priceCents: z.coerce.number().int().min(0),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  sortOrder: z.coerce.number().int(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;
export type OfferingFormValues = Omit<FormOutput, "deliverables"> & { deliverables: string[]; isActive: boolean };

export function OfferingForm({
  offering,
  onSubmit,
}: {
  offering: Offering | null;
  onSubmit: (values: OfferingFormValues) => Promise<boolean>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: offering
      ? {
          slug: offering.slug,
          name: offering.name,
          tagline: offering.tagline,
          description: offering.description,
          audience: offering.audience,
          deliverables: offering.deliverables.join("\n"),
          priceCents: offering.priceCents,
          durationMinutes: offering.durationMinutes,
          sortOrder: offering.sortOrder,
        }
      : { priceCents: 4900, durationMinutes: 30, sortOrder: 0 },
  });

  async function submit(values: FormOutput) {
    setSubmitting(true);
    const deliverables = values.deliverables
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    await onSubmit({ ...values, deliverables, isActive: offering?.isActive ?? true });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" {...register("slug")} />
          {errors.slug && <p className="text-xs text-red-400">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tagline">Tagline</Label>
        <Input id="tagline" {...register("tagline")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audience">Who it&apos;s for</Label>
        <Textarea id="audience" rows={2} {...register("audience")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="deliverables">What the client gets (one per line)</Label>
        <Textarea id="deliverables" rows={3} {...register("deliverables")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="priceCents">Price (cents)</Label>
          <Input id="priceCents" type="number" {...register("priceCents")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (min)</Label>
          <Input id="durationMinutes" type="number" {...register("durationMinutes")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" type="number" {...register("sortOrder")} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Saving…" : offering ? "Save changes" : "Create offering"}
      </Button>
    </form>
  );
}
