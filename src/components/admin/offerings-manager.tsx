"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfferingForm, type OfferingFormValues } from "@/components/admin/offering-form";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { Offering } from "@prisma/client";

export function OfferingsManager({ initialOfferings }: { initialOfferings: Offering[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Offering | null | "new">(null);

  async function handleSave(values: OfferingFormValues, id?: string) {
    const res = await fetch(id ? `/api/admin/offerings/${id}` : "/api/admin/offerings", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Couldn't save offering.");
      return false;
    }
    toast.success(id ? "Offering updated." : "Offering created.");
    setEditing(null);
    router.refresh();
    return true;
  }

  async function toggleActive(offering: Offering) {
    const res = await fetch(`/api/admin/offerings/${offering.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !offering.isActive }),
    });
    if (!res.ok) {
      toast.error("Couldn't update offering.");
      return;
    }
    toast.success(offering.isActive ? "Offering disabled." : "Offering enabled.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing("new")}>
        <Plus className="h-4 w-4" />
        Add offering
      </Button>

      <div className="grid gap-4 sm:grid-cols-2">
        {initialOfferings.map((offering) => (
          <Card key={offering.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{offering.name}</p>
                  <p className="text-sm text-muted-foreground">{offering.tagline}</p>
                </div>
                <Badge variant={offering.isActive ? "success" : "muted"}>
                  {offering.isActive ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{formatPrice(offering.priceCents, offering.currency)}</span>
                <span>·</span>
                <span>{formatDuration(offering.durationMinutes)}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(offering)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(offering)}>
                  {offering.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {offering.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add offering" : "Edit offering"}</DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <OfferingForm
              offering={editing === "new" ? null : editing}
              onSubmit={(values) => handleSave(values, editing === "new" ? undefined : editing.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
