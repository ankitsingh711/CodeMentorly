import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Hero } from "@/components/site/hero";
import { Profile } from "@/components/site/profile";
import { ServicesGrid } from "@/components/site/services-grid";
import { HowItWorks } from "@/components/site/how-it-works";
import { WhoItsFor } from "@/components/site/who-its-for";
import { ExampleProblems } from "@/components/site/example-problems";
import { JsonLd } from "@/components/site/json-ld";
import { site } from "@/lib/site";

export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: site.name,
          description: site.description,
          url: site.url,
          founder: { "@type": "Person", name: site.ownerName, jobTitle: site.ownerRole },
          areaServed: "Worldwide",
        }}
      />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ServicesGrid />
        <HowItWorks />
        <WhoItsFor />
        <ExampleProblems />
        <Profile />
      </main>
      <SiteFooter />
    </>
  );
}
