import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const offerings = await prisma.offering.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  return [
    { url: site.url, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...offerings.map((offering) => ({
      url: `${site.url}/book/${offering.slug}`,
      lastModified: offering.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
