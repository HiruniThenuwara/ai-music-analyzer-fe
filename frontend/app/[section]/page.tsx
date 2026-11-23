import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HealthPanel } from "@/components/health";
import { sections } from "@/lib/sections";

type Props = { params: Promise<{ section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return sections.filter(({ slug }) => slug).map(({ slug }) => ({ section: slug }));
}

async function resolveSection(params: Props["params"]) {
  const { section } = await params;
  return sections.find(({ slug }) => slug === section) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { title } = await resolveSection(params);
  return { title };
}

export default async function SectionPage({ params }: Props) {
  const { title, description, slug } = await resolveSection(params);
  return (
    <>
      <h1>{title}</h1>
      <p className="intro">{description}</p>
      {slug === "settings" ? <HealthPanel /> : (
        <section className="panel" aria-labelledby="unavailable-title">
          <h2 id="unavailable-title">{title} unavailable</h2>
          <p>This screen requires a backend API that is not available in this build.</p>
        </section>
      )}
    </>
  );
}
